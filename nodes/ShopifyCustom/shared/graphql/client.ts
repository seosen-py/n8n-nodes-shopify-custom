import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export const SHOPIFY_CUSTOM_CREDENTIAL_NAME = 'shopifyCustomAdminApi';

type ShopifyFunctionContext = IExecuteFunctions | ILoadOptionsFunctions;

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

interface IShopifyCredentialData extends IDataObject {
	shopSubdomain: string;
	apiVersion?: string;
}

export function normalizeShopSubdomain(input: string): string {
	return input.trim().replace(/^https?:\/\//, '').replace(/\.myshopify\.com\/?$/, '');
}

export function buildGraphqlUrl(credentials: IShopifyCredentialData): string {
	const subdomain = normalizeShopSubdomain(credentials.shopSubdomain);
	const apiVersion =
		typeof credentials.apiVersion === 'string' && credentials.apiVersion.trim().length > 0
			? credentials.apiVersion.trim()
			: '2025-10';
	return `https://${subdomain}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
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

	const requestOptions: IHttpRequestOptions = {
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
	};

	let lastError: unknown;
	const maxAttempts = 3;

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {

		try {
			const response = (await context.helpers.httpRequestWithAuthentication.call(
				context,
				SHOPIFY_CUSTOM_CREDENTIAL_NAME,
				requestOptions,
			)) as IShopifyGraphQLResponse<TData>;
			return response;
		} catch (error) {
			lastError = error;
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
