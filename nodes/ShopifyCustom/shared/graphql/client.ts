import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IOAuth2Options,
	ITriggerFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const SHOPIFY_CUSTOM_ADMIN_CREDENTIAL_NAME = 'shopifyCustomAdminApi';
export const SHOPIFY_CUSTOM_OAUTH2_CREDENTIAL_NAME = 'shopifyCustomOAuth2Api';

type ShopifyFunctionContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| ITriggerFunctions
	| IWebhookFunctions;

export type ShopifyNodeAuthentication = 'adminApi' | 'oAuth2';
type ShopifyAuthenticationMethod = 'accessToken' | 'clientCredentials';

interface IShopifyGraphQLError {
	message: string;
	locations?: Array<{ line: number; column: number }>;
	path?: string[];
	extensions?: IDataObject;
}

interface IShopifyGraphQLResponse<TData = IDataObject> {
	data?: TData;
	errors?: IShopifyGraphQLError[];
	extensions?: IDataObject;
}

interface IShopifyAccessTokenResponse extends IDataObject {
	access_token?: string;
	scope?: string;
	expires_in?: number;
}

export interface IShopifyCredentialData extends IDataObject {
	shopSubdomain: string;
	apiVersion?: string;
	authenticationMethod?: string;
	accessToken?: string;
	clientId?: string;
	clientSecret?: string;
	webhookSecret?: string;
}

export interface IShopifyOAuth2CredentialData extends IDataObject {
	shopSubdomain: string;
	apiVersion?: string;
	clientId?: string;
	clientSecret?: string;
	webhookSecret?: string;
	oauthTokenData?: IDataObject;
}

export type ShopifyAnyCredentialData = IShopifyCredentialData | IShopifyOAuth2CredentialData;

const ACCESS_TOKEN_TTL_SAFETY_MS = 60 * 1000;
const CLIENT_CREDENTIALS_TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();
const SHOPIFY_OAUTH2_HEADER_OPTIONS: IOAuth2Options = {
	tokenType: 'Bearer',
	keyToIncludeInAccessTokenHeader: 'X-Shopify-Access-Token',
};

export function normalizeShopSubdomain(input: string): string {
	return input.trim().replace(/^https?:\/\//, '').replace(/\.myshopify\.com\/?$/, '');
}

function toOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
}

export function resolveAuthenticationMethod(
	credentials: IShopifyCredentialData,
): ShopifyAuthenticationMethod {
	if (credentials.authenticationMethod === 'clientCredentials') {
		return 'clientCredentials';
	}

	if (credentials.authenticationMethod === 'accessToken') {
		return 'accessToken';
	}

	if (toOptionalString(credentials.accessToken)) {
		return 'accessToken';
	}

	return 'clientCredentials';
}

export function resolveNodeAuthentication(context: ShopifyFunctionContext): ShopifyNodeAuthentication {
	const authentication =
		'getInputData' in context
			? (context as IExecuteFunctions).getNodeParameter('authentication', 0, 'adminApi')
			: (context as ILoadOptionsFunctions | IHookFunctions | ITriggerFunctions | IWebhookFunctions)
					.getNodeParameter('authentication', 'adminApi');

	return authentication === 'oAuth2' ? 'oAuth2' : 'adminApi';
}

export async function getSelectedShopifyCredentials(
	context: ShopifyFunctionContext,
): Promise<{
	authentication: ShopifyNodeAuthentication;
	credentialName: string;
	credentials: ShopifyAnyCredentialData;
}> {
	const authentication = resolveNodeAuthentication(context);
	const credentialName =
		authentication === 'oAuth2'
			? SHOPIFY_CUSTOM_OAUTH2_CREDENTIAL_NAME
			: SHOPIFY_CUSTOM_ADMIN_CREDENTIAL_NAME;

	const credentials = (await context.getCredentials(credentialName)) as ShopifyAnyCredentialData;
	return {
		authentication,
		credentialName,
		credentials,
	};
}

export function hasUsableShopifyCredentials(
	credentials: IDataObject,
	authentication: ShopifyNodeAuthentication = 'adminApi',
): boolean {
	const shopSubdomain = toOptionalString(credentials.shopSubdomain);
	if (!shopSubdomain) {
		return false;
	}

	if (authentication === 'oAuth2') {
		return (
			Boolean(toOptionalString(credentials.clientId)) &&
			Boolean(toOptionalString(credentials.clientSecret))
		);
	}

	const typedCredentials = credentials as IShopifyCredentialData;
	const authenticationMethod = resolveAuthenticationMethod(typedCredentials);
	if (authenticationMethod === 'accessToken') {
		return Boolean(toOptionalString(typedCredentials.accessToken));
	}

	return (
		Boolean(toOptionalString(typedCredentials.clientId)) &&
		Boolean(toOptionalString(typedCredentials.clientSecret))
	);
}

export function buildGraphqlUrl(credentials: ShopifyAnyCredentialData): string {
	const subdomain = normalizeShopSubdomain(credentials.shopSubdomain);
	const apiVersion =
		typeof credentials.apiVersion === 'string' && credentials.apiVersion.trim().length > 0
			? credentials.apiVersion.trim()
			: '2025-10';
	return `https://${subdomain}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
}

function buildAccessTokenUrl(credentials: IShopifyCredentialData): string {
	const subdomain = normalizeShopSubdomain(credentials.shopSubdomain);
	return `https://${subdomain}.myshopify.com/admin/oauth/access_token`;
}

function getClientCredentialsCacheKey(credentials: IShopifyCredentialData): string {
	return JSON.stringify({
		shop: normalizeShopSubdomain(credentials.shopSubdomain),
		clientId: toOptionalString(credentials.clientId),
		clientSecret: toOptionalString(credentials.clientSecret),
	});
}

function clearCachedClientCredentialsAccessToken(credentials: IShopifyCredentialData): void {
	CLIENT_CREDENTIALS_TOKEN_CACHE.delete(getClientCredentialsCacheKey(credentials));
}

function shouldRetry(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const typedError = error as IDataObject;
	const statusCode = typedError.statusCode ?? typedError.httpCode ?? typedError.responseCode;
	if (typeof statusCode === 'number') {
		return statusCode === 429 || statusCode >= 500;
	}

	return false;
}

function isAuthenticationError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const typedError = error as IDataObject;
	const statusCode = typedError.statusCode ?? typedError.httpCode ?? typedError.responseCode;
	return statusCode === 401 || statusCode === 403;
}

async function requestClientCredentialsAccessToken(
	context: ShopifyFunctionContext,
	credentials: IShopifyCredentialData,
	itemIndex: number,
	forceRefresh = false,
): Promise<string> {
	const clientId = toOptionalString(credentials.clientId);
	const clientSecret = toOptionalString(credentials.clientSecret);
	if (!clientId || !clientSecret) {
		throw new NodeOperationError(
			context.getNode(),
			'Client ID and Client Secret are required for Dev Dashboard client credentials authentication.',
			{ itemIndex },
		);
	}

	const cacheKey = getClientCredentialsCacheKey(credentials);
	const cachedEntry = CLIENT_CREDENTIALS_TOKEN_CACHE.get(cacheKey);
	if (
		!forceRefresh &&
		cachedEntry &&
		Date.now() < cachedEntry.expiresAt - ACCESS_TOKEN_TTL_SAFETY_MS
	) {
		return cachedEntry.token;
	}

	const response = (await context.helpers.httpRequest({
		url: buildAccessTokenUrl(credentials),
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret,
		}),
		json: true,
	})) as IShopifyAccessTokenResponse;

	const accessToken = toOptionalString(response.access_token);
	if (!accessToken) {
		throw new NodeOperationError(
			context.getNode(),
			'Shopify did not return an access token for the provided client credentials.',
			{ itemIndex },
		);
	}

	const expiresIn =
		typeof response.expires_in === 'number' && response.expires_in > 0
			? response.expires_in
			: 86399;
	CLIENT_CREDENTIALS_TOKEN_CACHE.set(cacheKey, {
		token: accessToken,
		expiresAt: Date.now() + expiresIn * 1000,
	});

	return accessToken;
}

async function resolveAdminAccessToken(
	context: ShopifyFunctionContext,
	credentials: IShopifyCredentialData,
	itemIndex: number,
	forceRefresh = false,
): Promise<string> {
	const authenticationMethod = resolveAuthenticationMethod(credentials);
	if (authenticationMethod === 'accessToken') {
		const accessToken = toOptionalString(credentials.accessToken);
		if (!accessToken) {
			throw new NodeOperationError(
				context.getNode(),
				'Admin Access Token is required when using legacy token authentication.',
				{ itemIndex },
			);
		}

		return accessToken;
	}

	return requestClientCredentialsAccessToken(context, credentials, itemIndex, forceRefresh);
}

export async function executeShopifyGraphql<TData = IDataObject>(
	context: ShopifyFunctionContext,
	query: string,
	variables: IDataObject = {},
	itemIndex = 0,
): Promise<IShopifyGraphQLResponse<TData>> {
	const { authentication, credentialName, credentials } = await getSelectedShopifyCredentials(
		context,
	);
	const url = buildGraphqlUrl(credentials);

	if (authentication === 'oAuth2') {
		try {
			const response = (await context.helpers.httpRequestWithAuthentication.call(
				context,
				credentialName,
				{
					url,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: {
						query,
						variables,
					},
					json: true,
				},
				{
					oauth2: SHOPIFY_OAUTH2_HEADER_OPTIONS,
				},
			)) as IShopifyGraphQLResponse<TData>;

			return response;
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error as Error, { itemIndex });
		}
	}

	let lastError: unknown;
	let refreshedClientCredentialsToken = false;
	const maxAttempts = 3;
	const typedCredentials = credentials as IShopifyCredentialData;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		try {
			const accessToken = await resolveAdminAccessToken(
				context,
				typedCredentials,
				itemIndex,
				refreshedClientCredentialsToken,
			);

			const requestOptions: IHttpRequestOptions = {
				url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'X-Shopify-Access-Token': accessToken,
				},
				body: {
					query,
					variables,
				},
				json: true,
			};

			const response = (await context.helpers.httpRequest(
				requestOptions,
			)) as IShopifyGraphQLResponse<TData>;
			return response;
		} catch (error) {
			lastError = error;

			if (
				resolveAuthenticationMethod(typedCredentials) === 'clientCredentials' &&
				isAuthenticationError(error) &&
				!refreshedClientCredentialsToken
			) {
				clearCachedClientCredentialsAccessToken(typedCredentials);
				refreshedClientCredentialsToken = true;
				continue;
			}

			if (!shouldRetry(error) || attempt === maxAttempts - 1) {
				break;
			}
		}
	}

	throw new NodeOperationError(context.getNode(), lastError as Error, { itemIndex });
}

export function assertNoGraphQLErrors(
	context: ShopifyFunctionContext,
	response: IShopifyGraphQLResponse<unknown>,
	itemIndex = 0,
): void {
	if (!response.errors || response.errors.length === 0) {
		return;
	}

	const messages = response.errors.map((error) => error.message).join('; ');
	throw new NodeOperationError(context.getNode(), `Shopify GraphQL error: ${messages}`, {
		itemIndex,
	});
}
