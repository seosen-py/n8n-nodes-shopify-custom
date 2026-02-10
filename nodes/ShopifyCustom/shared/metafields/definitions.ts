import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { assertNoGraphQLErrors, executeShopifyGraphql } from '../graphql/client';
import { METAFIELD_DEFINITION_LIST_QUERY } from '../graphql/templates/metafields';
import type { ShopifyMetafieldOwnerType } from '../../config/resources';

interface IMetafieldDefinition {
	id: string;
	name: string;
	namespace: string;
	key: string;
	type: {
		name: string;
	};
	description?: string | null;
	ownerType: ShopifyMetafieldOwnerType;
}

interface IMetafieldDefinitionsResponse {
	metafieldDefinitions: {
		nodes: IMetafieldDefinition[];
		pageInfo: {
			hasNextPage: boolean;
			endCursor?: string | null;
		};
	};
}

const DEFINITIONS_CACHE = new Map<string, { expiresAt: number; data: IMetafieldDefinition[] }>();
const TTL_MS = 2 * 60 * 1000;

function makeCacheKey(ownerType: ShopifyMetafieldOwnerType, query?: string): string {
	return `${ownerType}::${query ?? ''}`;
}

export function encodeDefinitionOptionValue(definition: IMetafieldDefinition): string {
	return JSON.stringify({
		id: definition.id,
		namespace: definition.namespace,
		key: definition.key,
		type: definition.type?.name ?? '',
		ownerType: definition.ownerType,
	});
}

export function decodeDefinitionOptionValue(value: string): {
	id: string;
	namespace: string;
	key: string;
	type: string;
	ownerType: ShopifyMetafieldOwnerType;
} {
	try {
		return JSON.parse(value) as {
			id: string;
			namespace: string;
			key: string;
			type: string;
			ownerType: ShopifyMetafieldOwnerType;
		};
	} catch (error) {
		throw new Error(`Unable to parse metafield definition option value: ${String(error)}`);
	}
}

export async function listMetafieldDefinitions(
	context: ILoadOptionsFunctions,
	ownerType: ShopifyMetafieldOwnerType,
	query = '',
): Promise<IMetafieldDefinition[]> {
	const cacheKey = makeCacheKey(ownerType, query);
	const cacheEntry = DEFINITIONS_CACHE.get(cacheKey);
	if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
		return cacheEntry.data;
	}

	const response = await executeShopifyGraphql<IMetafieldDefinitionsResponse>(
		context,
		METAFIELD_DEFINITION_LIST_QUERY,
		{
			ownerType,
			first: 100,
			query: query || null,
		},
		0,
	);
	assertNoGraphQLErrors(context, response, 0);

	const definitions = response.data?.metafieldDefinitions?.nodes ?? [];
	DEFINITIONS_CACHE.set(cacheKey, {
		expiresAt: Date.now() + TTL_MS,
		data: definitions,
	});

	return definitions;
}

export async function getMetafieldDefinitionOptions(
	context: ILoadOptionsFunctions,
	ownerType: ShopifyMetafieldOwnerType,
	query = '',
): Promise<INodePropertyOptions[]> {
	const definitions = await listMetafieldDefinitions(context, ownerType, query);
	return definitions
		.map((definition) => ({
			name: `${definition.namespace}.${definition.key} (${definition.type?.name ?? 'unknown'})`,
			value: encodeDefinitionOptionValue(definition),
			description: definition.name,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
