import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	ITriggerFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const SHOPIFY_CUSTOM_CREDENTIAL_NAME = 'shopifyCustomAdminApi';

type ShopifyFunctionContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| ITriggerFunctions
	| IWebhookFunctions;

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

const ACCESS_TOKEN_TTL_SAFETY_MS = 60 * 1000;
const CLIENT_CREDENTIALS_TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();

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

export function hasUsableShopifyCredentials(credentials: IDataObject): boolean {
	const typedCredentials = credentials as IShopifyCredentialData;
	const shopSubdomain = toOptionalString(typedCredentials.shopSubdomain);
	if (!shopSubdomain) {
		return false;
	}

	const authenticationMethod = resolveAuthenticationMethod(typedCredentials);
	if (authenticationMethod === 'accessToken') {
		return Boolean(toOptionalString(typedCredentials.accessToken));
	}

	return (
		Boolean(toOptionalString(typedCredentials.clientId)) &&
		Boolean(toOptionalString(typedCredentials.clientSecret))
	);
}

export function buildGraphqlUrl(credentials: IShopifyCredentialData): string {
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
	const credentials = (await context.getCredentials(
		SHOPIFY_CUSTOM_CREDENTIAL_NAME,
	)) as IShopifyCredentialData;
	const url = buildGraphqlUrl(credentials);

	let lastError: unknown;
	let refreshedClientCredentialsToken = false;
	const maxAttempts = 3;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		try {
			const accessToken = await resolveAdminAccessToken(
				context,
				credentials,
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
				resolveAuthenticationMethod(credentials) === 'clientCredentials' &&
				isAuthenticationError(error) &&
				!refreshedClientCredentialsToken
			) {
				clearCachedClientCredentialsAccessToken(credentials);
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
