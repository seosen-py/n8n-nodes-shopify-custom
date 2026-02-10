import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { assertNoGraphQLErrors, executeShopifyGraphql } from '../graphql/client';

export type CollectionRuleValueType = 'text' | 'number' | 'boolean' | 'metaobject_reference';

interface IMetafieldDefinitionRuleObject {
	__typename: 'CollectionRuleMetafieldCondition';
	metafieldDefinition?: {
		id?: string;
		name?: string;
		namespace?: string;
		key?: string;
		type?: {
			name?: string;
		};
	};
}

interface ICollectionRuleCondition {
	ruleType: string;
	defaultRelation: string;
	allowedRelations: string[];
	ruleObject?: IMetafieldDefinitionRuleObject | null;
}

interface ICollectionRuleConditionsResponse {
	collectionRulesConditions: ICollectionRuleCondition[];
}

interface INativeRuleDescriptor {
	ruleType: string;
	defaultRelation: string;
	allowedRelations: string[];
}

interface IMetafieldRuleDescriptor {
	ruleType: string;
	defaultRelation: string;
	allowedRelations: string[];
	definitionId: string;
	name: string;
	namespace: string;
	key: string;
	typeName: string;
	valueType: CollectionRuleValueType;
}

interface IRuleConditionsData {
	nativeRules: INativeRuleDescriptor[];
	metafieldRules: IMetafieldRuleDescriptor[];
}

export interface IEncodedMetafieldRuleOption {
	ruleType: string;
	defaultRelation: string;
	allowedRelations: string[];
	definitionId: string;
	namespace: string;
	key: string;
	name: string;
	typeName: string;
	valueType: CollectionRuleValueType;
}

const COLLECTION_RULE_CONDITIONS_QUERY = `
query CollectionRuleConditions {
	collectionRulesConditions {
		ruleType
		defaultRelation
		allowedRelations
		ruleObject {
			__typename
			... on CollectionRuleMetafieldCondition {
				metafieldDefinition {
					id
					name
					namespace
					key
					type {
						name
					}
				}
			}
		}
	}
}
`;

const CACHE_TTL_MS = 2 * 60 * 1000;
let ruleConditionsCache: { expiresAt: number; data: IRuleConditionsData } | undefined;

function asString(value: unknown): string {
	return String(value ?? '').trim();
}

function isObject(value: unknown): value is IDataObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toLabel(value: string): string {
	return value
		.toLowerCase()
		.split('_')
		.filter((chunk) => chunk.length > 0)
		.map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
		.join(' ');
}

function inferMetafieldValueType(typeName: string): CollectionRuleValueType {
	const normalizedType = typeName.toLowerCase();
	if (normalizedType === 'boolean') {
		return 'boolean';
	}
	if (
		normalizedType === 'number_integer' ||
		normalizedType === 'number_decimal' ||
		normalizedType === 'rating'
	) {
		return 'number';
	}
	if (normalizedType === 'metaobject_reference') {
		return 'metaobject_reference';
	}
	return 'text';
}

function normalizeRuleConditions(value: unknown): IRuleConditionsData {
	if (!Array.isArray(value)) {
		return { nativeRules: [], metafieldRules: [] };
	}

	const nativeRulesMap = new Map<string, INativeRuleDescriptor>();
	const metafieldRules: IMetafieldRuleDescriptor[] = [];

	for (const item of value) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		const typedItem = item as Record<string, unknown>;
		const ruleType = asString(typedItem.ruleType);
		if (!ruleType) {
			continue;
		}
		const defaultRelation = asString(typedItem.defaultRelation);
		const allowedRelations = Array.isArray(typedItem.allowedRelations)
			? typedItem.allowedRelations
					.map((relation) => asString(relation))
					.filter((relation) => relation.length > 0)
			: [];

		const ruleObject =
			typedItem.ruleObject && typeof typedItem.ruleObject === 'object'
				? (typedItem.ruleObject as Record<string, unknown>)
				: undefined;

		const typename = asString(ruleObject?.__typename);
		if (typename === 'CollectionRuleMetafieldCondition') {
			const definitionRaw =
				ruleObject?.metafieldDefinition && typeof ruleObject.metafieldDefinition === 'object'
					? (ruleObject.metafieldDefinition as Record<string, unknown>)
					: undefined;
			const definitionId = asString(definitionRaw?.id);
			const namespace = asString(definitionRaw?.namespace);
			const key = asString(definitionRaw?.key);
			const name = asString(definitionRaw?.name);
			const typeObject =
				definitionRaw?.type && typeof definitionRaw.type === 'object'
					? (definitionRaw.type as Record<string, unknown>)
					: undefined;
			const typeName = asString(typeObject?.name);

			if (!definitionId || !namespace || !key || !typeName) {
				continue;
			}

			metafieldRules.push({
				ruleType,
				defaultRelation,
				allowedRelations,
				definitionId,
				name: name || `${namespace}.${key}`,
				namespace,
				key,
				typeName,
				valueType: inferMetafieldValueType(typeName),
			});
			continue;
		}

		if (!nativeRulesMap.has(ruleType)) {
			nativeRulesMap.set(ruleType, {
				ruleType,
				defaultRelation,
				allowedRelations,
			});
		}
	}

	return {
		nativeRules: Array.from(nativeRulesMap.values()),
		metafieldRules,
	};
}

async function listCollectionRuleConditions(
	context: ILoadOptionsFunctions,
): Promise<IRuleConditionsData> {
	if (ruleConditionsCache && ruleConditionsCache.expiresAt > Date.now()) {
		return ruleConditionsCache.data;
	}

	const response = await executeShopifyGraphql<ICollectionRuleConditionsResponse>(
		context,
		COLLECTION_RULE_CONDITIONS_QUERY,
		{},
		0,
	);
	assertNoGraphQLErrors(context, response, 0);

	const data = normalizeRuleConditions(response.data?.collectionRulesConditions);
	ruleConditionsCache = {
		expiresAt: Date.now() + CACHE_TTL_MS,
		data,
	};

	return data;
}

function getCurrentStringParameter(
	context: ILoadOptionsFunctions,
	parameterName: string,
): string | undefined {
	try {
		const value = asString(context.getCurrentNodeParameter(parameterName));
		return value.length > 0 ? value : undefined;
	} catch {
		return undefined;
	}
}

function getCurrentRuleValues(context: ILoadOptionsFunctions): {
	ruleSource?: string;
	nativeRuleType?: string;
	metafieldRule?: string;
} {
	const values: {
		ruleSource?: string;
		nativeRuleType?: string;
		metafieldRule?: string;
	} = {
		ruleSource: getCurrentStringParameter(context, 'ruleSource'),
		nativeRuleType: getCurrentStringParameter(context, 'nativeRuleType'),
		metafieldRule: getCurrentStringParameter(context, 'metafieldRule'),
	};

	if (values.ruleSource && (values.nativeRuleType || values.metafieldRule)) {
		return values;
	}

	const currentParameters = context.getCurrentNodeParameters();
	if (!isObject(currentParameters)) {
		return values;
	}

	const collectionRules = currentParameters.collectionRules;
	if (!isObject(collectionRules)) {
		return values;
	}

	const ruleItemsRaw = (collectionRules as IDataObject).items;
	if (!Array.isArray(ruleItemsRaw) || ruleItemsRaw.length === 0) {
		return values;
	}

	const currentRule = ruleItemsRaw[ruleItemsRaw.length - 1];
	if (!isObject(currentRule)) {
		return values;
	}

	if (!values.ruleSource) {
		const source = asString(currentRule.ruleSource);
		if (source) {
			values.ruleSource = source;
		}
	}
	if (!values.nativeRuleType) {
		const nativeRuleType = asString(currentRule.nativeRuleType);
		if (nativeRuleType) {
			values.nativeRuleType = nativeRuleType;
		}
	}
	if (!values.metafieldRule) {
		const metafieldRule = asString(currentRule.metafieldRule);
		if (metafieldRule) {
			values.metafieldRule = metafieldRule;
		}
	}

	return values;
}

function encodeMetafieldRuleOptionValue(rule: IMetafieldRuleDescriptor): string {
	const encoded: IEncodedMetafieldRuleOption = {
		ruleType: rule.ruleType,
		defaultRelation: rule.defaultRelation,
		allowedRelations: rule.allowedRelations,
		definitionId: rule.definitionId,
		namespace: rule.namespace,
		key: rule.key,
		name: rule.name,
		typeName: rule.typeName,
		valueType: rule.valueType,
	};
	return JSON.stringify(encoded);
}

export function decodeMetafieldRuleOptionValue(value: string): IEncodedMetafieldRuleOption | undefined {
	try {
		const parsed = JSON.parse(value) as IEncodedMetafieldRuleOption;
		if (
			!parsed ||
			typeof parsed !== 'object' ||
			!parsed.ruleType ||
			!parsed.definitionId ||
			!parsed.namespace ||
			!parsed.key ||
			!parsed.typeName ||
			!parsed.valueType
		) {
			return undefined;
		}
		return parsed;
	} catch {
		return undefined;
	}
}

export async function getCollectionNativeRuleTypeOptions(
	context: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const conditions = await listCollectionRuleConditions(context);
	return conditions.nativeRules
		.map((rule) => ({
			name: toLabel(rule.ruleType),
			value: rule.ruleType,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCollectionMetafieldRuleOptions(
	context: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const conditions = await listCollectionRuleConditions(context);
	return conditions.metafieldRules
		.map((rule) => ({
			name: `${rule.namespace}.${rule.key} (${rule.typeName})`,
			value: encodeMetafieldRuleOptionValue(rule),
			description: rule.name,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCollectionRuleRelationOptions(
	context: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const conditions = await listCollectionRuleConditions(context);
	const currentRuleValues = getCurrentRuleValues(context);
	const ruleSource = currentRuleValues.ruleSource ?? 'native';

	let allowedRelations: string[] = [];
	if (ruleSource === 'metafield') {
		const encoded = currentRuleValues.metafieldRule;
		if (encoded) {
			const decoded = decodeMetafieldRuleOptionValue(encoded);
			allowedRelations = decoded?.allowedRelations ?? [];
		}
	} else {
		const selectedRuleType = currentRuleValues.nativeRuleType;
		if (selectedRuleType) {
			allowedRelations =
				conditions.nativeRules.find((rule) => rule.ruleType === selectedRuleType)?.allowedRelations ??
				[];
		} else {
			allowedRelations = conditions.nativeRules.flatMap((rule) => rule.allowedRelations);
		}
	}

	if (allowedRelations.length === 0) {
		return [];
	}

	return Array.from(new Set(allowedRelations))
		.map((relation) => ({
			name: toLabel(relation),
			value: relation,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
