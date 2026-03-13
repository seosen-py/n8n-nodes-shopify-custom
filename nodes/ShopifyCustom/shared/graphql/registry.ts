import type { IDataObject } from 'n8n-workflow';
import {
	ARTICLE_CREATE_MUTATION,
	ARTICLE_DELETE_MUTATION,
	ARTICLE_GET_MANY_QUERY,
	ARTICLE_GET_QUERY,
	ARTICLE_UPDATE_MUTATION,
} from './templates/article';
import {
	BLOG_CREATE_MUTATION,
	BLOG_DELETE_MUTATION,
	BLOG_GET_MANY_QUERY,
	BLOG_GET_QUERY,
	BLOG_UPDATE_MUTATION,
} from './templates/blog';
import {
	COLLECTION_CREATE_MUTATION,
	COLLECTION_DELETE_MUTATION,
	COLLECTION_GET_MANY_QUERY,
	COLLECTION_GET_QUERY,
	COLLECTION_UPDATE_MUTATION,
} from './templates/collection';
import {
	CUSTOMER_CREATE_MUTATION,
	CUSTOMER_DELETE_MUTATION,
	CUSTOMER_GET_MANY_QUERY,
	CUSTOMER_GET_QUERY,
	CUSTOMER_UPDATE_MUTATION,
} from './templates/customer';
import {
	DRAFT_ORDER_CREATE_MUTATION,
	DRAFT_ORDER_DELETE_MUTATION,
	DRAFT_ORDER_GET_MANY_QUERY,
	DRAFT_ORDER_GET_QUERY,
	DRAFT_ORDER_UPDATE_MUTATION,
} from './templates/draftOrder';
import {
	FILE_CREATE_MUTATION,
	FILE_DELETE_MUTATION,
	FILE_GET_MANY_QUERY,
	FILE_UPDATE_MUTATION,
} from './templates/file';
import {
	INVENTORY_ADJUST_QUANTITIES_MUTATION,
	INVENTORY_GET_MANY_QUERY,
	INVENTORY_GET_QUERY,
	INVENTORY_SET_QUANTITIES_MUTATION,
	INVENTORY_UPDATE_MUTATION,
} from './templates/inventory';
import {
	TRANSLATION_GET_MANY_QUERY,
	TRANSLATION_GET_QUERY,
	TRANSLATION_REGISTER_MUTATION,
	TRANSLATION_REMOVE_MUTATION,
} from './templates/translations';
import {
	METAFIELD_DEFINITION_CREATE_MUTATION,
	METAFIELD_DEFINITION_DELETE_MUTATION,
	METAFIELD_DEFINITION_GET_QUERY,
	METAFIELD_DEFINITION_LIST_QUERY,
	METAFIELD_DEFINITION_TYPES_QUERY,
	METAFIELD_DEFINITION_UPDATE_MUTATION,
	METAFIELD_DELETE_MUTATION,
	METAFIELD_GET_MANY_QUERY,
	METAFIELD_GET_QUERY,
	METAFIELD_RESOLVE_METADATA_QUERY,
	METAFIELD_SET_MUTATION,
} from './templates/metafields';
import {
	METAOBJECT_CREATE_MUTATION,
	METAOBJECT_DELETE_MUTATION,
	METAOBJECT_GET_MANY_QUERY,
	METAOBJECT_GET_QUERY,
	METAOBJECT_UPDATE_MUTATION,
} from './templates/metaobject';
import {
	ORDER_CREATE_MUTATION,
	ORDER_DELETE_MUTATION,
	ORDER_GET_MANY_QUERY,
	ORDER_GET_QUERY,
	ORDER_UPDATE_MUTATION,
} from './templates/order';
import {
	PRODUCT_CREATE_MUTATION,
	PRODUCT_DELETE_MUTATION,
	PRODUCT_GET_MANY_QUERY,
	PRODUCT_GET_QUERY,
	PRODUCT_UPDATE_MUTATION,
} from './templates/product';
import {
	PRODUCT_VARIANT_CREATE_MUTATION,
	PRODUCT_VARIANT_DELETE_MUTATION,
	PRODUCT_VARIANT_GET_MANY_QUERY,
	PRODUCT_VARIANT_GET_QUERY,
	PRODUCT_VARIANT_UPDATE_MUTATION,
} from './templates/productVariant';
import type { IShopifyUserError } from '../errors';
import type { ShopifyOperationKey } from '../../config/operations/types';
import { decodeMetafieldRuleOptionValue } from '../collections/ruleConditions';
import { decodeDefinitionOptionValue } from '../metafields/definitions';

interface IRegistryPaginationConfig {
	connectionPath: string[];
	firstVariableName?: string;
	afterVariableName?: string;
}

export interface IRegistryOperation {
	document: string;
	buildVariables(parameters: IDataObject): IDataObject;
	mapSimplified(data: IDataObject): unknown;
	getUserErrors?(data: IDataObject): IShopifyUserError[] | undefined;
	pagination?: IRegistryPaginationConfig;
}

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

function asBoolean(value: unknown): boolean | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}
	return Boolean(value);
}

function asNumber(value: unknown): number | undefined {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isNaN(parsed) ? undefined : parsed;
}

function parseTags(value: unknown): string[] | undefined {
	const raw = asString(value);
	if (!raw) {
		return undefined;
	}

	const tags = raw
		.split(',')
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);

	return tags.length > 0 ? tags : undefined;
}

function parseArticleAuthorInput(parameters: IDataObject): IDataObject | undefined {
	const authorSource = asString(parameters.authorSource) ?? 'name';

	if (authorSource === 'userId') {
		const userId = asString(parameters.authorUserId);
		return userId ? { userId } : undefined;
	}

	const name = asString(parameters.authorName);
	return name ? { name } : undefined;
}

function parseArticleImageInput(parameters: IDataObject): IDataObject | undefined {
	if (!isObject(parameters.articleImage)) {
		return undefined;
	}

	const url = asString(parameters.articleImage.url);
	if (!url) {
		return undefined;
	}

	return {
		url,
		altText: asString(parameters.articleImage.altText),
	};
}

function parseSeoInput(parameters: IDataObject): { title?: string; description?: string } | undefined {
	const title = asString(parameters.seoTitle);
	const description = asString(parameters.seoDescription);

	if (!title && !description) {
		return undefined;
	}

	return {
		title,
		description,
	};
}

function getPaginationOptions(parameters: IDataObject): IDataObject {
	if (isObject(parameters.paginationOptions)) {
		return parameters.paginationOptions;
	}
	if (isObject(parameters.options)) {
		return parameters.options;
	}
	return {};
}

function getConnectionVariables(parameters: IDataObject): IDataObject {
	const options = getPaginationOptions(parameters);
	const sorting = isObject(options.sorting) ? options.sorting : {};
	const limit = asNumber(parameters.limit) ?? 50;
	return {
		first: Math.max(1, Math.trunc(limit)),
		after: asString(options.afterCursor),
		query: asString(options.query ?? parameters.query),
		sortKey: asString(sorting.sortKey ?? options.sortKey ?? parameters.sortKey),
		reverse: asBoolean(sorting.reverse ?? options.reverse ?? parameters.reverse),
	};
}

function parseSelectedMetafieldKeys(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}

	const keys = value
		.map((item) => asString(item))
		.filter((item): item is string => !!item)
		.map((item) => {
			try {
				const definition = decodeDefinitionOptionValue(item);
				const namespace = asString(definition.namespace);
				const key = asString(definition.key);
				if (!namespace || !key) {
					return undefined;
				}
				return `${namespace}.${key}`;
			} catch {
				const fallback = asString(item);
				if (!fallback || !fallback.includes('.')) {
					return undefined;
				}
				return fallback;
			}
		})
		.filter((item): item is string => !!item);

	if (keys.length === 0) {
		return undefined;
	}

	return Array.from(new Set(keys));
}

function getMetafieldReadVariables(parameters: IDataObject): IDataObject {
	const options = getPaginationOptions(parameters);
	const metafields = isObject(options.metafields) ? options.metafields : {};
	const selectedMetafieldKeys = parseSelectedMetafieldKeys(
		metafields.selectedMetafields ??
			options.selectedMetafields ??
			parameters.selectedMetafields,
	);
	return {
		includeMetafields: Boolean(
			metafields.includeMetafields ?? options.includeMetafields ?? parameters.includeMetafields,
		),
		metafieldsFirst: 250,
		metafieldKeys: selectedMetafieldKeys,
		resolveMetafieldReferences: Boolean(
			metafields.resolveMetafieldReferences ??
				options.resolveMetafieldReferences ??
				parameters.resolveMetafieldReferences,
		),
		metafieldReferencesFirst: 50,
	};
}

function getPathValue(source: IDataObject, path: string[]): unknown {
	let current: unknown = source;
	for (const chunk of path) {
		if (Array.isArray(current)) {
			const index = Number(chunk);
			if (Number.isNaN(index)) {
				return undefined;
			}
			current = current[index];
			continue;
		}
		if (!isObject(current)) {
			return undefined;
		}
		current = current[chunk];
	}
	return current;
}

const JSON_METAFIELD_TYPES = new Set([
	'json',
	'rich_text_field',
	'money',
	'rating',
	'dimension',
	'volume',
	'weight',
]);

function shouldParseMetafieldValue(typeName: string | undefined): boolean {
	if (!typeName) {
		return false;
	}
	return typeName.startsWith('list.') || JSON_METAFIELD_TYPES.has(typeName);
}

function parseMetafieldValue(typeName: string | undefined, value: unknown): unknown {
	if (!shouldParseMetafieldValue(typeName) || typeof value !== 'string') {
		return value;
	}
	const trimmed = value.trim();
	if (!trimmed) {
		return value;
	}
	try {
		return JSON.parse(trimmed);
	} catch {
		return value;
	}
}

function normalizeMetafieldNode(metafield: IDataObject): IDataObject {
	const typeName = asString(metafield.type);
	const parsedValue = parseMetafieldValue(typeName, metafield.value);
	let changed = false;
	const normalized: IDataObject = { ...metafield };

	if (parsedValue !== metafield.value) {
		normalized.value = parsedValue as never;
		changed = true;
	}

	if (isObject(metafield.references) && Array.isArray(metafield.references.nodes)) {
		normalized.references = metafield.references.nodes.filter(isObject);
		changed = true;
	}

	if (Array.isArray(metafield.references)) {
		normalized.references = metafield.references.filter(isObject);
		changed = true;
	}

	if (isObject(metafield.reference)) {
		normalized.reference = metafield.reference;
		changed = true;
	}

	return changed ? normalized : metafield;
}

function normalizeMetafieldArray(value: unknown): IDataObject[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter(isObject).map(normalizeMetafieldNode);
}

function normalizeNode(node: IDataObject): IDataObject {
	const normalized: IDataObject = { ...node };
	let changed = false;

	if (isObject(node.metafield)) {
		normalized.metafield = normalizeMetafieldNode(node.metafield as IDataObject);
		changed = true;
	}

	if (isObject(node.metafields) && Array.isArray(node.metafields.nodes)) {
		normalized.metafields = normalizeMetafieldArray(node.metafields.nodes);
		changed = true;
	}

	if (Array.isArray(node.metafields)) {
		normalized.metafields = normalizeMetafieldArray(node.metafields);
		changed = true;
	}

	return changed ? normalized : node;
}

function mapNodesFromConnection(data: IDataObject, connectionPath: string[]): IDataObject[] {
	const connection = getPathValue(data, connectionPath);
	if (!isObject(connection) || !Array.isArray(connection.nodes)) {
		return [];
	}
	return connection.nodes.filter(isObject).map(normalizeNode);
}

function mapSingleNode(data: IDataObject, path: string[]): IDataObject | undefined {
	const node = getPathValue(data, path);
	return isObject(node) ? normalizeNode(node) : undefined;
}

function mapMutationPayload(data: IDataObject, path: string[]): IDataObject | undefined {
	const payload = getPathValue(data, path);
	return isObject(payload) ? payload : undefined;
}

function parseLineItems(value: unknown): Array<{ variantId: string; quantity: number }> {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return [];
	}

	return value.items
		.filter(isObject)
		.map((item) => {
			const variantId = asString(item.variantId);
			const quantity = asNumber(item.quantity);
			if (!variantId || !quantity) {
				return undefined;
			}
			return {
				variantId,
				quantity: Math.max(1, Math.trunc(quantity)),
			};
		})
		.filter((item): item is { variantId: string; quantity: number } => item !== undefined);
}

function parseCollectionProductIds(value: unknown): string[] | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const productIds = value.items
		.filter(isObject)
		.map((item) => asString(item.productId))
		.filter((item): item is string => !!item);

	return productIds.length > 0 ? Array.from(new Set(productIds)) : undefined;
}

function parseCollectionRules(
	value: unknown,
): Array<{
	column: string;
	relation: string;
	condition: string;
	conditionObjectId?: string;
}> | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	function resolveMetafieldConditionValue(item: IDataObject): string | undefined {
		const encodedRule = asString(item.metafieldRule);
		if (!encodedRule) {
			return undefined;
		}

		const decodedRule = decodeMetafieldRuleOptionValue(encodedRule);
		if (!decodedRule) {
			return undefined;
		}

		switch (decodedRule.valueType) {
			case 'boolean': {
				const booleanValue = asBoolean(item.metafieldValueBoolean);
				return booleanValue === undefined ? undefined : booleanValue ? 'true' : 'false';
			}
			case 'number': {
				const numberValue = asNumber(item.metafieldValueNumber);
				return numberValue === undefined ? undefined : String(numberValue);
			}
			case 'metaobject_reference':
				return asString(item.metafieldValueMetaobjectId);
			case 'text':
			default:
				return asString(item.metafieldValueText);
		}
	}

	const rules = value.items
		.filter(isObject)
		.map((item) => {
			const source = asString(item.ruleSource) ?? 'native';
			const nativeRelation = asString(item.nativeRelation);

			if (source === 'metafield') {
				const encodedRule = asString(item.metafieldRule);
				const decodedRule = encodedRule ? decodeMetafieldRuleOptionValue(encodedRule) : undefined;
				const condition = resolveMetafieldConditionValue(item);
				const effectiveRelation = asString(decodedRule?.defaultRelation);

				if (!decodedRule || !effectiveRelation || condition === undefined) {
					return undefined;
				}

				return {
					column: decodedRule.ruleType,
					relation: effectiveRelation,
					condition,
					conditionObjectId: decodedRule.definitionId,
				};
			}

			const column = asString(item.nativeRuleType);
			const condition = asString(item.nativeValue);
			if (!column || !nativeRelation || condition === undefined) {
				return undefined;
			}

			const parsedRule: {
				column: string;
				relation: string;
				condition: string;
				conditionObjectId?: string;
			} = {
				column,
				relation: nativeRelation,
				condition,
			};

			return parsedRule;
		})
		.filter(
			(item): item is { column: string; relation: string; condition: string; conditionObjectId?: string } =>
				item !== undefined,
		);

	return rules.length > 0 ? rules : undefined;
}

function parseValidations(value: unknown): Array<{ name: string; value: string }> | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const validations = value.items
		.filter(isObject)
		.map((item) => {
			const name = asString(item.name);
			const validationValue = asString(item.value);
			if (!name || validationValue === undefined) {
				return undefined;
			}
			return {
				name,
				value: validationValue,
			};
		})
		.filter((validation): validation is { name: string; value: string } => validation !== undefined);

	return validations.length > 0 ? validations : undefined;
}

function parseMetaobjectFieldInputs(value: unknown): Array<{ key: string; value: string }> | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const fields = value.items
		.filter(isObject)
		.map((item) => {
			const key = asString(item.key);
			const fieldValue = asString(item.value);
			if (!key || fieldValue === undefined) {
				return undefined;
			}
			return {
				key,
				value: fieldValue,
			};
		})
		.filter((field): field is { key: string; value: string } => field !== undefined);

	return fields.length > 0 ? fields : undefined;
}

function parseFileCreateInputs(value: unknown): IDataObject[] | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const creates = value.items
		.filter(isObject)
		.map((item) => {
			const originalSource = asString(item.originalSource);
			if (!originalSource) {
				return undefined;
			}

			return {
				originalSource,
				contentType: asString(item.contentType),
				alt: asString(item.alt),
				filename: asString(item.filename),
			} as IDataObject;
		})
		.filter((item): item is IDataObject => item !== undefined);

	return creates.length > 0 ? creates : undefined;
}

function parseFileUpdateInputs(value: unknown): IDataObject[] | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const updates = value.items
		.filter(isObject)
		.map((item) => {
			const id = asString(item.fileId);
			if (!id) {
				return undefined;
			}

			const fileUpdateInput: IDataObject = {
				id,
			};
			const alt = asString(item.alt);
			const filename = asString(item.filename);

			if (alt !== undefined) {
				fileUpdateInput.alt = alt;
			}
			if (filename !== undefined) {
				fileUpdateInput.filename = filename;
			}

			return Object.keys(fileUpdateInput).length > 1 ? fileUpdateInput : undefined;
		})
		.filter((item): item is IDataObject => item !== undefined);

	return updates.length > 0 ? updates : undefined;
}

function parseFileIds(value: unknown): string[] | undefined {
	if (Array.isArray(value)) {
		const idsFromArray = value
			.map((item) => asString(item))
			.filter((item): item is string => !!item);
		return idsFromArray.length > 0 ? Array.from(new Set(idsFromArray)) : undefined;
	}

	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const ids = value.items
		.filter(isObject)
		.map((item) => asString(item.fileId))
		.filter((item): item is string => !!item);

	return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

function parseMetafieldIds(value: unknown): string[] | undefined {
	if (Array.isArray(value)) {
		const idsFromArray = value
			.map((item) => asString(item))
			.filter((item): item is string => !!item);
		return idsFromArray.length > 0 ? Array.from(new Set(idsFromArray)) : undefined;
	}

	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const ids = value.items
		.filter(isObject)
		.map((item) => asString(item.metafieldId))
		.filter((item): item is string => !!item);

	return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

function parseTranslationRegisterItems(value: unknown): IDataObject[] | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const translations = value.items
		.filter(isObject)
		.map((item) => {
			const locale = asString(item.locale);
			const key = asString(item.key);
			const translationValue = asString(item.value);
			const translatableContentDigest = asString(item.translatableContentDigest);
			const marketId = asString(item.marketId);

			if (!locale || !key || translationValue === undefined || !translatableContentDigest) {
				return undefined;
			}

			return {
				locale,
				key,
				value: translationValue,
				translatableContentDigest,
				marketId: marketId || undefined,
			} as IDataObject;
		})
		.filter((item): item is IDataObject => item !== undefined);

	return translations.length > 0 ? translations : undefined;
}

function parseTranslationKeys(value: unknown): string[] | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const keys = value.items
		.filter(isObject)
		.map((item) => asString(item.key))
		.filter((item): item is string => !!item);

	return keys.length > 0 ? Array.from(new Set(keys)) : undefined;
}

function isApiVersionAtLeast(apiVersion: string | undefined, target: string): boolean {
	const versionPattern = /^(\d{4})-(\d{2})$/;
	const sourceMatch = (apiVersion ?? '').match(versionPattern);
	const targetMatch = target.match(versionPattern);
	if (!sourceMatch || !targetMatch) {
		return false;
	}

	const sourceYear = Number(sourceMatch[1]);
	const sourceMonth = Number(sourceMatch[2]);
	const targetYear = Number(targetMatch[1]);
	const targetMonth = Number(targetMatch[2]);

	if (sourceYear !== targetYear) {
		return sourceYear > targetYear;
	}

	return sourceMonth >= targetMonth;
}

function parseInventoryQuantityNames(value: unknown): string[] {
	const quantityNames = parseStringArray(value);
	return quantityNames && quantityNames.length > 0 ? quantityNames : ['available'];
}

function parseInventorySetQuantities(
	value: unknown,
	apiVersion?: string,
): IDataObject[] | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const useChangeFromQuantity = isApiVersionAtLeast(apiVersion, '2026-01');
	const quantities = value.items
		.filter(isObject)
		.map((item) => {
			const inventoryItemId = asString(item.inventoryItemId);
			const locationId = asString(item.locationId);
			const quantity = asNumber(item.quantity);
			const compareOrChangeQuantity = asNumber(item.compareQuantity ?? item.changeFromQuantity);

			if (!inventoryItemId || !locationId || quantity === undefined) {
				return undefined;
			}

			const parsedQuantity: IDataObject = {
				inventoryItemId,
				locationId,
				quantity: Math.trunc(quantity),
			};

			if (compareOrChangeQuantity !== undefined) {
				if (useChangeFromQuantity) {
					parsedQuantity.changeFromQuantity = Math.trunc(compareOrChangeQuantity);
				} else {
					parsedQuantity.compareQuantity = Math.trunc(compareOrChangeQuantity);
				}
			}

			return parsedQuantity;
		})
		.filter((item): item is IDataObject => item !== undefined);

	return quantities.length > 0 ? quantities : undefined;
}

function parseInventoryAdjustChanges(
	value: unknown,
	apiVersion?: string,
): IDataObject[] | undefined {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return undefined;
	}

	const includeChangeFromQuantity = isApiVersionAtLeast(apiVersion, '2026-01');
	const changes = value.items
		.filter(isObject)
		.map((item) => {
			const delta = asNumber(item.delta);
			const inventoryItemId = asString(item.inventoryItemId);
			const locationId = asString(item.locationId);
			const changeFromQuantity = asNumber(item.changeFromQuantity);

			if (delta === undefined || !inventoryItemId || !locationId) {
				return undefined;
			}

			const parsedChange: IDataObject = {
				delta: Math.trunc(delta),
				inventoryItemId,
				locationId,
			};

			if (includeChangeFromQuantity && changeFromQuantity !== undefined) {
				parsedChange.changeFromQuantity = Math.trunc(changeFromQuantity);
			}

			return parsedChange;
		})
		.filter((item): item is IDataObject => item !== undefined);

	return changes.length > 0 ? changes : undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}

	const normalized = value
		.map((item) => asString(item))
		.filter((item): item is string => !!item);

	return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

function getTranslationOptions(parameters: IDataObject): IDataObject {
	if (isObject(parameters.translationOptions)) {
		return parameters.translationOptions;
	}
	return {};
}

function getInventoryReadOptions(parameters: IDataObject): IDataObject {
	if (isObject(parameters.inventoryReadOptions)) {
		return parameters.inventoryReadOptions;
	}
	if (isObject(parameters.inventoryQueryOptions)) {
		return parameters.inventoryQueryOptions;
	}
	return {};
}

function getInventorySetOptions(parameters: IDataObject): IDataObject {
	if (isObject(parameters.inventorySetOptions)) {
		return parameters.inventorySetOptions;
	}
	return {};
}

function getInventoryAdjustOptions(parameters: IDataObject): IDataObject {
	if (isObject(parameters.inventoryAdjustOptions)) {
		return parameters.inventoryAdjustOptions;
	}
	return {};
}

function parseInventoryUpdateInput(parameters: IDataObject): IDataObject {
	const input = isObject(parameters.inventoryUpdateInput) ? parameters.inventoryUpdateInput : {};
	const parsedInput: IDataObject = {};
	const cost = asString(input.cost);
	const countryCodeOfOrigin = asString(input.countryCodeOfOrigin);
	const harmonizedSystemCode = asString(input.harmonizedSystemCode);
	const provinceCodeOfOrigin = asString(input.provinceCodeOfOrigin);
	const requiresShipping = asBoolean(input.requiresShipping);
	const sku = asString(input.sku);
	const tracked = asBoolean(input.tracked);

	if (cost !== undefined) {
		parsedInput.cost = cost;
	}
	if (countryCodeOfOrigin !== undefined) {
		parsedInput.countryCodeOfOrigin = countryCodeOfOrigin;
	}
	if (harmonizedSystemCode !== undefined) {
		parsedInput.harmonizedSystemCode = harmonizedSystemCode;
	}
	if (provinceCodeOfOrigin !== undefined) {
		parsedInput.provinceCodeOfOrigin = provinceCodeOfOrigin;
	}
	if (requiresShipping !== undefined) {
		parsedInput.requiresShipping = requiresShipping;
	}
	if (sku !== undefined) {
		parsedInput.sku = sku;
	}
	if (tracked !== undefined) {
		parsedInput.tracked = tracked;
	}

	return parsedInput;
}

function getArticleOptions(parameters: IDataObject): IDataObject {
	if (isObject(parameters.articleOptions)) {
		return parameters.articleOptions;
	}
	return {};
}

function getBlogOptions(parameters: IDataObject): IDataObject {
	if (isObject(parameters.blogOptions)) {
		return parameters.blogOptions;
	}
	return {};
}

function getTranslationOutdatedFilter(options: IDataObject): boolean | undefined {
	const hasFilter = asBoolean(options.filterByOutdated);
	if (!hasFilter) {
		return undefined;
	}
	return asBoolean(options.outdated);
}

function buildFileSearchQuery(baseQuery: string | undefined, options: IDataObject): string | undefined {
	const terms: string[] = [];

	const normalizedBase = asString(baseQuery);
	if (normalizedBase) {
		terms.push(normalizedBase);
	}

	const query = asString(options.query);
	if (query) {
		terms.push(query);
	}

	const usedIn = asString(options.usedIn);
	if (usedIn) {
		terms.push(`used_in:${usedIn}`);
	}

	const mediaType = asString(options.mediaType);
	if (mediaType) {
		terms.push(`media_type:${mediaType}`);
	}

	const additionalQuery = asString(options.additionalQuery);
	if (additionalQuery) {
		terms.push(additionalQuery);
	}

	return terms.length > 0 ? terms.join(' ') : undefined;
}

function getFileConnectionVariables(parameters: IDataObject, baseQuery?: string): IDataObject {
	const options = isObject(parameters.fileQueryOptions)
		? parameters.fileQueryOptions
		: isObject(parameters.cleanupOptions)
			? parameters.cleanupOptions
			: {};
	const limit = asNumber(parameters.limit) ?? 50;

	return {
		first: Math.max(1, Math.trunc(limit)),
		after: asString(options.afterCursor),
		query: buildFileSearchQuery(baseQuery, options),
		sortKey: asString(options.sortKey),
		reverse: asBoolean(options.reverse),
	};
}

function parseUserErrors(data: IDataObject, path: string[]): IShopifyUserError[] {
	const payload = getPathValue(data, path);
	if (!isObject(payload) || !Array.isArray(payload.userErrors)) {
		return [];
	}
	return payload.userErrors
		.filter(isObject)
		.map((item) => ({
			field: Array.isArray(item.field)
				? item.field.filter(
						(fieldPart: unknown): fieldPart is string => typeof fieldPart === 'string',
					)
				: null,
			message: String(item.message ?? 'Unknown Shopify user error'),
			code: asString(item.code) ?? null,
		}));
}

function withId<T extends IDataObject>(idFieldName: string, input: T, parameters: IDataObject): T {
	const id = asString(parameters[idFieldName]);
	if (!id) {
		return input;
	}
	return {
		...input,
		id,
	};
}

const operationRegistry: Record<ShopifyOperationKey, IRegistryOperation> = {
	'product.create': {
		document: PRODUCT_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			product: {
				title: asString(parameters.title),
				handle: asString(parameters.handle),
				descriptionHtml: asString(parameters.descriptionHtml),
				seo: parseSeoInput(parameters),
				templateSuffix: asString(parameters.templateSuffix),
				vendor: asString(parameters.vendor),
				productType: asString(parameters.productType),
				status: asString(parameters.status),
				tags: parseTags(parameters.tags),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['productCreate', 'product']),
		getUserErrors: (data) => parseUserErrors(data, ['productCreate']),
	},
	'product.get': {
		document: PRODUCT_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.productId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['product']),
	},
	'product.getMany': {
		document: PRODUCT_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['products']),
		pagination: {
			connectionPath: ['products'],
		},
	},
	'product.update': {
		document: PRODUCT_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			product: withId(
				'productId',
				{
					title: asString(parameters.title),
					handle: asString(parameters.handle),
					descriptionHtml: asString(parameters.descriptionHtml),
					seo: parseSeoInput(parameters),
					templateSuffix: asString(parameters.templateSuffix),
					vendor: asString(parameters.vendor),
					productType: asString(parameters.productType),
					status: asString(parameters.status),
					tags: parseTags(parameters.tags),
				},
				parameters,
			),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['productUpdate', 'product']),
		getUserErrors: (data) => parseUserErrors(data, ['productUpdate']),
	},
	'product.delete': {
		document: PRODUCT_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			input: {
				id: asString(parameters.productId),
			},
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['productDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['productDelete']),
	},
	'article.create': {
		document: ARTICLE_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			article: {
				blogId: asString(parameters.blogId),
				title: asString(parameters.title),
				author: parseArticleAuthorInput(parameters),
				handle: asString(parameters.handle),
				body: asString(parameters.body),
				summary: asString(parameters.summary),
				image: parseArticleImageInput(parameters),
				isPublished: asBoolean(parameters.isPublished),
				publishDate: asString(parameters.publishDate),
				tags: parseTags(parameters.tags),
				templateSuffix: asString(parameters.templateSuffix),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['articleCreate', 'article']),
		getUserErrors: (data) => parseUserErrors(data, ['articleCreate']),
	},
	'article.get': {
		document: ARTICLE_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.articleId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['article']),
	},
	'article.getMany': {
		document: ARTICLE_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['articles']),
		pagination: {
			connectionPath: ['articles'],
		},
	},
	'article.update': {
		document: ARTICLE_UPDATE_MUTATION,
		buildVariables: (parameters) => {
			const options = getArticleOptions(parameters);
			return {
				id: asString(parameters.articleId),
				article: {
					blogId: asString(parameters.blogId),
					title: asString(parameters.title),
					author: parseArticleAuthorInput(parameters),
					handle: asString(parameters.handle),
					body: asString(parameters.body),
					summary: asString(parameters.summary),
					image: parseArticleImageInput(parameters),
					isPublished: asBoolean(options.isPublished),
					publishDate: asString(parameters.publishDate),
					tags: parseTags(parameters.tags),
					templateSuffix: asString(parameters.templateSuffix),
					redirectNewHandle: asBoolean(options.redirectNewHandle),
				},
			};
		},
		mapSimplified: (data) => mapSingleNode(data, ['articleUpdate', 'article']),
		getUserErrors: (data) => parseUserErrors(data, ['articleUpdate']),
	},
	'article.delete': {
		document: ARTICLE_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			id: asString(parameters.articleId),
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['articleDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['articleDelete']),
	},
	'blog.create': {
		document: BLOG_CREATE_MUTATION,
		buildVariables: (parameters) => {
			const options = getBlogOptions(parameters);
			return {
				blog: {
					title: asString(parameters.title),
					handle: asString(parameters.handle),
					templateSuffix: asString(parameters.templateSuffix),
					commentPolicy: asString(options.commentPolicy),
				},
			};
		},
		mapSimplified: (data) => mapSingleNode(data, ['blogCreate', 'blog']),
		getUserErrors: (data) => parseUserErrors(data, ['blogCreate']),
	},
	'blog.get': {
		document: BLOG_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.blogId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['blog']),
	},
	'blog.getMany': {
		document: BLOG_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['blogs']),
		pagination: {
			connectionPath: ['blogs'],
		},
	},
	'blog.update': {
		document: BLOG_UPDATE_MUTATION,
		buildVariables: (parameters) => {
			const options = getBlogOptions(parameters);
			return {
				id: asString(parameters.blogId),
				blog: {
					title: asString(parameters.title),
					handle: asString(parameters.handle),
					templateSuffix: asString(parameters.templateSuffix),
					commentPolicy: asString(options.commentPolicy),
					redirectArticles: asBoolean(options.redirectArticles),
					redirectNewHandle: asBoolean(options.redirectNewHandle),
				},
			};
		},
		mapSimplified: (data) => mapSingleNode(data, ['blogUpdate', 'blog']),
		getUserErrors: (data) => parseUserErrors(data, ['blogUpdate']),
	},
	'blog.delete': {
		document: BLOG_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			id: asString(parameters.blogId),
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['blogDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['blogDelete']),
	},
	'productVariant.create': {
		document: PRODUCT_VARIANT_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			productId: asString(parameters.productId),
			variants: [
				{
					title: asString(parameters.title),
					sku: asString(parameters.sku),
					barcode: asString(parameters.barcode),
					price: asNumber(parameters.price)?.toString(),
					compareAtPrice: asNumber(parameters.compareAtPrice)?.toString(),
					taxable: asBoolean(parameters.taxable),
				},
			],
		}),
		mapSimplified: (data) => getPathValue(data, ['productVariantsBulkCreate', 'productVariants']) ?? [],
		getUserErrors: (data) => parseUserErrors(data, ['productVariantsBulkCreate']),
	},
	'productVariant.get': {
		document: PRODUCT_VARIANT_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.variantId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['productVariant']),
	},
	'productVariant.getMany': {
		document: PRODUCT_VARIANT_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['productVariants']),
		pagination: {
			connectionPath: ['productVariants'],
		},
	},
	'productVariant.update': {
		document: PRODUCT_VARIANT_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			productId: asString(parameters.productId),
			variants: [
				{
					id: asString(parameters.variantId),
					title: asString(parameters.title),
					sku: asString(parameters.sku),
					barcode: asString(parameters.barcode),
					price: asNumber(parameters.price)?.toString(),
					compareAtPrice: asNumber(parameters.compareAtPrice)?.toString(),
					taxable: asBoolean(parameters.taxable),
				},
			],
		}),
		mapSimplified: (data) => getPathValue(data, ['productVariantsBulkUpdate', 'productVariants']) ?? [],
		getUserErrors: (data) => parseUserErrors(data, ['productVariantsBulkUpdate']),
	},
	'productVariant.delete': {
		document: PRODUCT_VARIANT_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			productId: asString(parameters.productId),
			variantsIds: [asString(parameters.variantId)].filter(
				(item): item is string => typeof item === 'string',
			),
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['productVariantsBulkDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['productVariantsBulkDelete']),
	},
	'collection.create': {
		document: COLLECTION_CREATE_MUTATION,
		buildVariables: (parameters) => {
			const collectionType = asString(parameters.collectionType) ?? 'manual';
			const products = parseCollectionProductIds(parameters.manualProducts);
			const rules = parseCollectionRules(parameters.collectionRules);
			const ruleSet =
				collectionType === 'smart' && rules
					? {
							appliedDisjunctively: (asString(parameters.smartRuleMatchMode) ?? 'all') === 'any',
							rules,
						}
					: undefined;

			return {
				input: {
					title: asString(parameters.title),
					handle: asString(parameters.handle),
					descriptionHtml: asString(parameters.descriptionHtml),
					seo: parseSeoInput(parameters),
					templateSuffix: asString(parameters.templateSuffix),
					products: collectionType === 'manual' ? products : undefined,
					ruleSet,
				},
			};
		},
		mapSimplified: (data) => mapSingleNode(data, ['collectionCreate', 'collection']),
		getUserErrors: (data) => parseUserErrors(data, ['collectionCreate']),
	},
	'collection.get': {
		document: COLLECTION_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.collectionId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['collection']),
	},
	'collection.getMany': {
		document: COLLECTION_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['collections']),
		pagination: {
			connectionPath: ['collections'],
		},
	},
	'collection.update': {
		document: COLLECTION_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			input: withId(
				'collectionId',
				{
					title: asString(parameters.title),
					handle: asString(parameters.handle),
					descriptionHtml: asString(parameters.descriptionHtml),
					seo: parseSeoInput(parameters),
					templateSuffix: asString(parameters.templateSuffix),
				},
				parameters,
			),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['collectionUpdate', 'collection']),
		getUserErrors: (data) => parseUserErrors(data, ['collectionUpdate']),
	},
	'collection.delete': {
		document: COLLECTION_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			input: {
				id: asString(parameters.collectionId),
			},
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['collectionDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['collectionDelete']),
	},
	'customer.create': {
		document: CUSTOMER_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			input: {
				email: asString(parameters.email),
				phone: asString(parameters.phone),
				firstName: asString(parameters.firstName),
				lastName: asString(parameters.lastName),
				note: asString(parameters.note),
				taxExempt: asBoolean(parameters.taxExempt),
				tags: parseTags(parameters.tags),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['customerCreate', 'customer']),
		getUserErrors: (data) => parseUserErrors(data, ['customerCreate']),
	},
	'customer.get': {
		document: CUSTOMER_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.customerId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['customer']),
	},
	'customer.getMany': {
		document: CUSTOMER_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['customers']),
		pagination: {
			connectionPath: ['customers'],
		},
	},
	'customer.update': {
		document: CUSTOMER_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			input: withId(
				'customerId',
				{
					email: asString(parameters.email),
					phone: asString(parameters.phone),
					firstName: asString(parameters.firstName),
					lastName: asString(parameters.lastName),
					note: asString(parameters.note),
					taxExempt: asBoolean(parameters.taxExempt),
					tags: parseTags(parameters.tags),
				},
				parameters,
			),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['customerUpdate', 'customer']),
		getUserErrors: (data) => parseUserErrors(data, ['customerUpdate']),
	},
	'customer.delete': {
		document: CUSTOMER_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			input: {
				id: asString(parameters.customerId),
			},
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['customerDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['customerDelete']),
	},
	'order.create': {
		document: ORDER_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			order: {
				email: asString(parameters.email),
				note: asString(parameters.note),
				tags: parseTags(parameters.tags),
				lineItems: parseLineItems(parameters.lineItems),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['orderCreate', 'order']),
		getUserErrors: (data) => parseUserErrors(data, ['orderCreate']),
	},
	'order.get': {
		document: ORDER_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.orderId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['order']),
	},
	'order.getMany': {
		document: ORDER_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['orders']),
		pagination: {
			connectionPath: ['orders'],
		},
	},
	'order.update': {
		document: ORDER_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			input: {
				id: asString(parameters.orderId),
				email: asString(parameters.email),
				note: asString(parameters.note),
				tags: parseTags(parameters.tags),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['orderUpdate', 'order']),
		getUserErrors: (data) => parseUserErrors(data, ['orderUpdate']),
	},
	'order.delete': {
		document: ORDER_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			orderId: asString(parameters.orderId),
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['orderDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['orderDelete']),
	},
	'draftOrder.create': {
		document: DRAFT_ORDER_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			input: {
				email: asString(parameters.email),
				note: asString(parameters.note),
				tags: parseTags(parameters.tags),
				lineItems: parseLineItems(parameters.lineItems),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['draftOrderCreate', 'draftOrder']),
		getUserErrors: (data) => parseUserErrors(data, ['draftOrderCreate']),
	},
	'draftOrder.get': {
		document: DRAFT_ORDER_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.draftOrderId),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['draftOrder']),
	},
	'draftOrder.getMany': {
		document: DRAFT_ORDER_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getConnectionVariables(parameters),
			...getMetafieldReadVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['draftOrders']),
		pagination: {
			connectionPath: ['draftOrders'],
		},
	},
	'draftOrder.update': {
		document: DRAFT_ORDER_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			id: asString(parameters.draftOrderId),
			input: {
				email: asString(parameters.email),
				note: asString(parameters.note),
				tags: parseTags(parameters.tags),
				lineItems: parseLineItems(parameters.lineItems),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['draftOrderUpdate', 'draftOrder']),
		getUserErrors: (data) => parseUserErrors(data, ['draftOrderUpdate']),
	},
	'draftOrder.delete': {
		document: DRAFT_ORDER_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			input: {
				id: asString(parameters.draftOrderId),
			},
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['draftOrderDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['draftOrderDelete']),
	},
	'inventory.get': {
		document: INVENTORY_GET_QUERY,
		buildVariables: (parameters) => {
			const options = getInventoryReadOptions(parameters);
			return {
				id: asString(parameters.inventoryItemId),
				includeInventoryLevels: Boolean(options.includeInventoryLevels),
				inventoryLevelsFirst: Math.max(1, Math.trunc(asNumber(options.inventoryLevelsFirst) ?? 25)),
				inventoryQuantityNames: parseInventoryQuantityNames(options.inventoryQuantityNames),
			};
		},
		mapSimplified: (data) => mapSingleNode(data, ['inventoryItem']),
	},
	'inventory.getMany': {
		document: INVENTORY_GET_MANY_QUERY,
		buildVariables: (parameters) => {
			const options = getInventoryReadOptions(parameters);
			const limit = asNumber(parameters.limit) ?? 50;

			return {
				first: Math.max(1, Math.trunc(limit)),
				after: asString(options.afterCursor),
				query: asString(options.query ?? parameters.query),
				reverse: asBoolean(options.reverse),
				includeInventoryLevels: Boolean(options.includeInventoryLevels),
				inventoryLevelsFirst: Math.max(1, Math.trunc(asNumber(options.inventoryLevelsFirst) ?? 25)),
				inventoryQuantityNames: parseInventoryQuantityNames(options.inventoryQuantityNames),
			};
		},
		mapSimplified: (data) => mapNodesFromConnection(data, ['inventoryItems']),
		pagination: {
			connectionPath: ['inventoryItems'],
		},
	},
	'inventory.update': {
		document: INVENTORY_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			id: asString(parameters.inventoryItemId),
			input: parseInventoryUpdateInput(parameters),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['inventoryItemUpdate', 'inventoryItem']),
		getUserErrors: (data) => parseUserErrors(data, ['inventoryItemUpdate']),
	},
	'inventory.set': {
		document: INVENTORY_SET_QUANTITIES_MUTATION,
		buildVariables: (parameters) => {
			const options = getInventorySetOptions(parameters);
			const apiVersion = asString(parameters.__apiVersion);
			return {
				input: {
					ignoreCompareQuantity: asBoolean(options.ignoreCompareQuantity),
					name: asString(options.name) ?? 'available',
					reason: asString(options.reason) ?? 'correction',
					referenceDocumentUri: asString(options.referenceDocumentUri),
					quantities: parseInventorySetQuantities(parameters.inventoryQuantities, apiVersion) ?? [],
				},
			};
		},
		mapSimplified: (data) =>
			mapSingleNode(data, ['inventorySetQuantities', 'inventoryAdjustmentGroup']),
		getUserErrors: (data) => parseUserErrors(data, ['inventorySetQuantities']),
	},
	'inventory.adjust': {
		document: INVENTORY_ADJUST_QUANTITIES_MUTATION,
		buildVariables: (parameters) => {
			const options = getInventoryAdjustOptions(parameters);
			const apiVersion = asString(parameters.__apiVersion);
			return {
				input: {
					name: asString(options.name) ?? 'available',
					reason: asString(options.reason) ?? 'correction',
					referenceDocumentUri: asString(options.referenceDocumentUri),
					changes: parseInventoryAdjustChanges(parameters.inventoryAdjustChanges, apiVersion) ?? [],
				},
			};
		},
		mapSimplified: (data) =>
			mapSingleNode(data, ['inventoryAdjustQuantities', 'inventoryAdjustmentGroup']),
		getUserErrors: (data) => parseUserErrors(data, ['inventoryAdjustQuantities']),
	},
	'file.getMany': {
		document: FILE_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getFileConnectionVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['files']),
		pagination: {
			connectionPath: ['files'],
		},
	},
	'file.create': {
		document: FILE_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			files: parseFileCreateInputs(parameters.fileCreateItems) ?? [],
		}),
		mapSimplified: (data) => {
			const createdFiles = getPathValue(data, ['fileCreate', 'files']);
			if (!Array.isArray(createdFiles)) {
				return [];
			}
			return createdFiles.filter(isObject).map(normalizeNode);
		},
		getUserErrors: (data) => parseUserErrors(data, ['fileCreate']),
	},
	'file.update': {
		document: FILE_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			files: parseFileUpdateInputs(parameters.fileUpdates) ?? [],
		}),
		mapSimplified: (data) => {
			const updatedFiles = getPathValue(data, ['fileUpdate', 'files']);
			if (!Array.isArray(updatedFiles)) {
				return [];
			}
			return updatedFiles.filter(isObject).map(normalizeNode);
		},
		getUserErrors: (data) => parseUserErrors(data, ['fileUpdate']),
	},
	'file.delete': {
		document: FILE_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			fileIds: parseFileIds(parameters.fileDeleteItems ?? parameters.fileIds) ?? [],
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['fileDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['fileDelete']),
	},
	'file.deleteUnusedImages': {
		document: FILE_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			...getFileConnectionVariables(parameters, 'used_in:none media_type:IMAGE'),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['files']),
		pagination: {
			connectionPath: ['files'],
		},
	},
	'translation.get': {
		document: TRANSLATION_GET_QUERY,
		buildVariables: (parameters) => {
			const options = getTranslationOptions(parameters);
			return {
				resourceId: asString(parameters.resourceId),
				locale: asString(parameters.locale),
				marketId: asString(options.marketId),
				outdated: getTranslationOutdatedFilter(options),
				includeNestedResources: Boolean(options.includeNestedResources),
				nestedResourceType: asString(options.nestedResourceType),
				nestedFirst: Math.max(1, Math.trunc(asNumber(options.nestedLimit) ?? 50)),
			};
		},
		mapSimplified: (data) => mapSingleNode(data, ['translatableResource']),
	},
	'translation.getMany': {
		document: TRANSLATION_GET_MANY_QUERY,
		buildVariables: (parameters) => {
			const options = getTranslationOptions(parameters);
			const limit = asNumber(parameters.limit) ?? 50;
			return {
				resourceType: asString(parameters.resourceType),
				first: Math.max(1, Math.trunc(limit)),
				after: asString(options.afterCursor),
				reverse: asBoolean(options.reverse),
				locale: asString(parameters.locale),
				marketId: asString(options.marketId),
				outdated: getTranslationOutdatedFilter(options),
				includeNestedResources: Boolean(options.includeNestedResources),
				nestedResourceType: asString(options.nestedResourceType),
				nestedFirst: Math.max(1, Math.trunc(asNumber(options.nestedLimit) ?? 50)),
			};
		},
		mapSimplified: (data) => mapNodesFromConnection(data, ['translatableResources']),
		pagination: {
			connectionPath: ['translatableResources'],
		},
	},
	'translation.register': {
		document: TRANSLATION_REGISTER_MUTATION,
		buildVariables: (parameters) => ({
			resourceId: asString(parameters.resourceId),
			translations: parseTranslationRegisterItems(parameters.translationsInput) ?? [],
		}),
		mapSimplified: (data) =>
			Array.isArray(getPathValue(data, ['translationsRegister', 'translations']))
				? (getPathValue(data, ['translationsRegister', 'translations']) as unknown[])
						.filter(isObject)
						.map((item) => ({ ...item }))
				: [],
		getUserErrors: (data) => parseUserErrors(data, ['translationsRegister']),
	},
	'translation.remove': {
		document: TRANSLATION_REMOVE_MUTATION,
		buildVariables: (parameters) => ({
			resourceId: asString(parameters.resourceId),
			translationKeys: parseTranslationKeys(parameters.translationKeysInput) ?? [],
			locales: parseStringArray(parameters.locales) ?? [],
			marketIds: parseStringArray(parameters.marketIds),
		}),
		mapSimplified: (data) =>
			Array.isArray(getPathValue(data, ['translationsRemove', 'translations']))
				? (getPathValue(data, ['translationsRemove', 'translations']) as unknown[])
						.filter(isObject)
						.map((item) => ({ ...item }))
				: [],
		getUserErrors: (data) => parseUserErrors(data, ['translationsRemove']),
	},
	'metaobject.create': {
		document: METAOBJECT_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			metaobject: {
				type: asString(parameters.metaobjectType),
				handle: asString(parameters.handle),
				fields: parseMetaobjectFieldInputs(parameters.metaobjectFields),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['metaobjectCreate', 'metaobject']),
		getUserErrors: (data) => parseUserErrors(data, ['metaobjectCreate']),
	},
	'metaobject.get': {
		document: METAOBJECT_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.metaobjectId),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['metaobject']),
	},
	'metaobject.getMany': {
		document: METAOBJECT_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			type: asString(parameters.metaobjectType),
			...getConnectionVariables(parameters),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['metaobjects']),
		pagination: {
			connectionPath: ['metaobjects'],
		},
	},
	'metaobject.update': {
		document: METAOBJECT_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			id: asString(parameters.metaobjectId),
			metaobject: {
				handle: asString(parameters.handle),
				fields: parseMetaobjectFieldInputs(parameters.metaobjectFields),
				redirectNewHandle: isObject(parameters.metaobjectOptions)
					? asBoolean(parameters.metaobjectOptions.redirectNewHandle)
					: undefined,
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['metaobjectUpdate', 'metaobject']),
		getUserErrors: (data) => parseUserErrors(data, ['metaobjectUpdate']),
	},
	'metaobject.delete': {
		document: METAOBJECT_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			id: asString(parameters.metaobjectId),
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['metaobjectDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['metaobjectDelete']),
	},
	'metafieldValue.set': {
		document: METAFIELD_SET_MUTATION,
		buildVariables: (parameters) => ({
			metafields: Array.isArray(parameters.metafieldsPayload)
				? parameters.metafieldsPayload
				: [],
		}),
		mapSimplified: (data) => normalizeMetafieldArray(getPathValue(data, ['metafieldsSet', 'metafields'])),
		getUserErrors: (data) => parseUserErrors(data, ['metafieldsSet']),
	},
	'metafieldValue.get': {
		document: METAFIELD_GET_QUERY,
		buildVariables: (parameters) => ({
			ownerId: asString(parameters.ownerId),
			namespace: asString(parameters.namespace),
			key: asString(parameters.key),
		}),
		mapSimplified: (data) => {
			const nodes = getPathValue(data, ['nodes']);
			if (!Array.isArray(nodes) || nodes.length === 0 || !isObject(nodes[0])) {
				return undefined;
			}
			const node = nodes[0];
			const metafield = (node.metafield as IDataObject | undefined) ?? undefined;
			return metafield ? normalizeMetafieldNode(metafield) : undefined;
		},
	},
	'metafieldValue.getMany': {
		document: METAFIELD_GET_MANY_QUERY,
		buildVariables: (parameters) => ({
			ownerId: asString(parameters.ownerId),
			namespace: asString(parameters.namespace),
			first: Math.max(1, Math.trunc(asNumber(parameters.limit) ?? 50)),
			after: asString(parameters.afterCursor),
		}),
		mapSimplified: (data) => {
			const nodes = getPathValue(data, ['nodes']);
			if (!Array.isArray(nodes) || nodes.length === 0 || !isObject(nodes[0])) {
				return [];
			}
			const ownerNode = nodes[0] as IDataObject;
			const metafieldsConnection = ownerNode.metafields;
			if (!isObject(metafieldsConnection) || !Array.isArray(metafieldsConnection.nodes)) {
				return [];
			}
			return normalizeMetafieldArray(metafieldsConnection.nodes);
		},
		pagination: {
			connectionPath: ['nodes', '0', 'metafields'],
		},
	},
	'metafieldValue.resolveMetadata': {
		document: METAFIELD_RESOLVE_METADATA_QUERY,
		buildVariables: (parameters) => ({
			ids: parseMetafieldIds(parameters.metafieldResolveItems ?? parameters.metafieldIds) ?? [],
		}),
		mapSimplified: (data) => {
			const nodes = getPathValue(data, ['nodes']);
			if (!Array.isArray(nodes)) {
				return [];
			}

			return nodes
				.filter(isObject)
				.map((node) => {
					const id = asString(node.id);
					if (!id) {
						return undefined;
					}

					const definition = isObject(node.definition)
						? {
								id: asString((node.definition as IDataObject).id),
								name: asString((node.definition as IDataObject).name),
							}
						: undefined;
					const owner = isObject(node.owner)
						? {
								id: asString((node.owner as IDataObject).id),
								type: asString((node.owner as IDataObject).__typename),
							}
						: undefined;

					return {
						id,
						namespace: asString(node.namespace),
						key: asString(node.key),
						type: asString(node.type),
						updatedAt: asString(node.updatedAt),
						definition,
						owner,
					};
				})
				.filter((item): item is Exclude<typeof item, undefined> => item !== undefined);
		},
	},
	'metafieldValue.delete': {
		document: METAFIELD_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			metafields: Array.isArray(parameters.metafieldsPayload)
				? parameters.metafieldsPayload
				: [],
		}),
		mapSimplified: (data) => getPathValue(data, ['metafieldsDelete', 'deletedMetafields']) ?? [],
		getUserErrors: (data) => parseUserErrors(data, ['metafieldsDelete']),
	},
	'metafieldDefinition.list': {
		document: METAFIELD_DEFINITION_LIST_QUERY,
		buildVariables: (parameters) => ({
			ownerType: asString(parameters.ownerType),
			query: asString(parameters.query),
			first: Math.max(1, Math.trunc(asNumber(parameters.limit) ?? 50)),
			after: asString(parameters.afterCursor),
		}),
		mapSimplified: (data) => mapNodesFromConnection(data, ['metafieldDefinitions']),
		pagination: {
			connectionPath: ['metafieldDefinitions'],
		},
	},
	'metafieldDefinition.get': {
		document: METAFIELD_DEFINITION_GET_QUERY,
		buildVariables: (parameters) => ({
			id: asString(parameters.definitionId),
		}),
		mapSimplified: (data) => mapSingleNode(data, ['node']),
	},
	'metafieldDefinition.create': {
		document: METAFIELD_DEFINITION_CREATE_MUTATION,
		buildVariables: (parameters) => ({
			definition: {
				ownerType: asString(parameters.ownerType),
				name: asString(parameters.name),
				namespace: asString(parameters.namespace),
				key: asString(parameters.key),
				type: asString(parameters.definitionType),
				description: asString(parameters.description),
				validations: parseValidations(parameters.validations),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['metafieldDefinitionCreate', 'createdDefinition']),
		getUserErrors: (data) => parseUserErrors(data, ['metafieldDefinitionCreate']),
	},
	'metafieldDefinition.update': {
		document: METAFIELD_DEFINITION_UPDATE_MUTATION,
		buildVariables: (parameters) => ({
			definition: {
				id: asString(parameters.definitionId),
				name: asString(parameters.name),
				description: asString(parameters.description),
				validations: parseValidations(parameters.validations),
			},
		}),
		mapSimplified: (data) => mapSingleNode(data, ['metafieldDefinitionUpdate', 'updatedDefinition']),
		getUserErrors: (data) => parseUserErrors(data, ['metafieldDefinitionUpdate']),
	},
	'metafieldDefinition.delete': {
		document: METAFIELD_DEFINITION_DELETE_MUTATION,
		buildVariables: (parameters) => ({
			id: asString(parameters.definitionId),
			deleteAllAssociatedMetafields: asBoolean(parameters.deleteAllAssociatedMetafields),
		}),
		mapSimplified: (data) => mapMutationPayload(data, ['metafieldDefinitionDelete']),
		getUserErrors: (data) => parseUserErrors(data, ['metafieldDefinitionDelete']),
	},
	'service.listDefinitionTypes': {
		document: METAFIELD_DEFINITION_TYPES_QUERY,
		buildVariables: () => ({}),
		mapSimplified: (data) => getPathValue(data, ['metafieldDefinitionTypes']) ?? [],
	},
};

export function getRegistryOperation(operationKey: ShopifyOperationKey): IRegistryOperation {
	return operationRegistry[operationKey];
}
