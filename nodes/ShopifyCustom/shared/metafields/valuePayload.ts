import type { IDataObject } from 'n8n-workflow';
import type { ShopifyMetafieldOwnerType } from '../../config/resources';
import { decodeDefinitionOptionValue } from './definitions';
import { serializeMetafieldValue } from './valueAdapters';

function isObject(value: unknown): value is IDataObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	const normalized = String(value).trim();
	return normalized.length > 0 ? normalized : undefined;
}

function parseItems(source: unknown): IDataObject[] {
	if (!isObject(source) || !Array.isArray(source.items)) {
		return [];
	}
	return source.items.filter(isObject);
}

function resolveDefinition(item: IDataObject): {
	id: string;
	namespace: string;
	key: string;
	type: string;
	ownerType: ShopifyMetafieldOwnerType;
} | null {
	const definitionEncoded = asString(item.definition);
	if (!definitionEncoded) {
		return null;
	}
	return decodeDefinitionOptionValue(definitionEncoded);
}

function resolveType(item: IDataObject, definition: ReturnType<typeof resolveDefinition>): string {
	if (definition) {
		return definition.type;
	}

	const typeFromInput = asString(item.metafieldType);
	if (!typeFromInput) {
		throw new Error('Metafield type is required');
	}
	return typeFromInput;
}

export function buildMetafieldsSetPayload(
	nodeName: string,
	ownerId: string,
	collectionValue: unknown,
): IDataObject[] {
	const items = parseItems(collectionValue);
	const payload: IDataObject[] = [];

	for (const item of items) {
		const definition = resolveDefinition(item);
		if (!definition) {
			throw new Error(`[${nodeName}] Metafield definition is required`);
		}

		const namespace = definition.namespace;
		const key = definition.key;

		if (!namespace || !key) {
			throw new Error(`[${nodeName}] Metafield namespace and key are required`);
		}

		const type = resolveType(item, definition);
		const value = serializeMetafieldValue(type, item);
		if (value === undefined) {
			continue;
		}

		payload.push({
			ownerId,
			namespace,
			key,
			type,
			value,
		});
	}

	return payload;
}

export function buildMetafieldsDeletePayload(
	nodeName: string,
	ownerId: string,
	collectionValue: unknown,
): IDataObject[] {
	const items = parseItems(collectionValue);
	const payload: IDataObject[] = [];

	for (const item of items) {
		const definition = resolveDefinition(item);
		if (!definition) {
			throw new Error(`[${nodeName}] Metafield definition is required`);
		}

		const namespace = definition.namespace;
		const key = definition.key;

		if (!namespace || !key) {
			continue;
		}

		payload.push({
			ownerId,
			namespace,
			key,
		});
	}

	return payload;
}
