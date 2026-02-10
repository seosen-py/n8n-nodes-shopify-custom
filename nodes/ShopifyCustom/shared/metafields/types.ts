import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { assertNoGraphQLErrors, executeShopifyGraphql } from '../graphql/client';
import { METAFIELD_DEFINITION_TYPES_QUERY } from '../graphql/templates/metafields';

type ShopifyFunctionContext = IExecuteFunctions | ILoadOptionsFunctions;

interface IMetafieldDefinitionTypeValidation {
	name: string;
	type: string;
	valueType: string;
}

export interface IMetafieldDefinitionType {
	name: string;
	category?: string | null;
	description?: string | null;
	supportedValidations?: IMetafieldDefinitionTypeValidation[] | null;
}

interface IMetafieldDefinitionTypesResponse {
	metafieldDefinitionTypes: IMetafieldDefinitionType[];
}

const TYPE_CACHE = new Map<string, { expiresAt: number; data: IMetafieldDefinitionType[] }>();
const TTL_MS = 5 * 60 * 1000;

function getCacheKey(credentials: IDataObject): string {
	return `${String(credentials.shopSubdomain)}::${String(credentials.apiVersion ?? '2025-10')}`;
}

export async function getMetafieldDefinitionTypes(
	context: ShopifyFunctionContext,
): Promise<IMetafieldDefinitionType[]> {
	const credentials = (await context.getCredentials('shopifyCustomAdminApi')) as IDataObject;
	const cacheKey = getCacheKey(credentials);
	const now = Date.now();
	const cacheEntry = TYPE_CACHE.get(cacheKey);
	if (cacheEntry && cacheEntry.expiresAt > now) {
		return cacheEntry.data;
	}

	const response = await executeShopifyGraphql<IMetafieldDefinitionTypesResponse>(
		context,
		METAFIELD_DEFINITION_TYPES_QUERY,
		{},
		0,
	);
	assertNoGraphQLErrors(context, response, 0);

	const definitionTypes = response.data?.metafieldDefinitionTypes ?? [];
	TYPE_CACHE.set(cacheKey, {
		expiresAt: now + TTL_MS,
		data: definitionTypes,
	});
	return definitionTypes;
}

export async function getMetafieldDefinitionTypeOptions(
	context: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const definitionTypes = await getMetafieldDefinitionTypes(context);
	return definitionTypes
		.map((definitionType) => ({
			name: definitionType.name,
			value: definitionType.name,
			description: definitionType.description ?? undefined,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDefinitionTypeByName(
	context: ShopifyFunctionContext,
	typeName: string,
): Promise<IMetafieldDefinitionType | undefined> {
	if (!typeName) {
		return undefined;
	}

	const types = await getMetafieldDefinitionTypes(context);
	const match = types.find((definitionType) => definitionType.name === typeName);
	if (!match) {
		throw new NodeOperationError(context.getNode(), `Unknown metafield type "${typeName}"`);
	}
	return match;
}
