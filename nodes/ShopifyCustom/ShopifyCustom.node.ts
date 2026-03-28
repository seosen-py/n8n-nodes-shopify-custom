import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	OPERATION_BY_RESOURCE,
	getOperationConfig,
} from './config/operations';
import type { ShopifyOperationKey } from './config/operations/types';
import {
	SHOPIFY_RESOURCE_DEFINITIONS,
	type ShopifyMetafieldOwnerType,
	type ShopifyResourceValue,
} from './config/resources';
import {
	getCollectionMetafieldRuleOptions,
	getCollectionNativeRuleTypeOptions,
	getCollectionRuleRelationOptions,
} from './shared/collections/ruleConditions';
import { throwIfUserErrors, getErrorData } from './shared/errors';
import { assertNoGraphQLErrors, executeShopifyGraphql } from './shared/graphql/client';
import { getRegistryOperation } from './shared/graphql/registry';
import { STAGED_UPLOADS_CREATE_MUTATION } from './shared/graphql/templates/file';
import { getMetafieldDefinitionOptions } from './shared/metafields/definitions';
import { getOwnerTypeFromResource } from './shared/metafields/ownerTypeMap';
import { getReferenceOptions } from './shared/metafields/referenceLoaders';
import { getMetafieldDefinitionTypeOptions } from './shared/metafields/types';
import { buildStandaloneMetafieldValueFields } from './shared/metafields/uiFactory';
import { buildMetafieldsDeletePayload, buildMetafieldsSetPayload } from './shared/metafields/valuePayload';
import { mapOutputItems, type ShopifyOutputMode } from './shared/output/outputMapper';
import {
	getMarketOptions,
	getShopLocaleOptions,
	getShopLocales,
	getTranslationTargetLocaleOptions,
} from './shared/translations/options';

function isObject(value: unknown): value is IDataObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getByPath(source: IDataObject, path: string[]): unknown {
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

function toArrayOfObjects(value: unknown): IDataObject[] {
	if (Array.isArray(value)) {
		return value.filter(isObject);
	}
	if (isObject(value)) {
		return [value];
	}
	return [];
}

function toOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
}

function chunkArray<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

function encodeUtf8(value: string): Uint8Array {
	const encoded = unescape(encodeURIComponent(value));
	const bytes = new Uint8Array(encoded.length);
	for (let index = 0; index < encoded.length; index += 1) {
		bytes[index] = encoded.charCodeAt(index);
	}
	return bytes;
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
	let totalLength = 0;
	for (const chunk of chunks) {
		totalLength += chunk.length;
	}

	const combined = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}
	return combined;
}

function buildMultipartFormDataBody(
	fields: Array<{ name: string; value: string }>,
	file: { fieldName: string; filename: string; mimeType: string; content: Uint8Array },
): { body: Uint8Array; contentType: string } {
	const boundary = `----n8nShopifyUpload${Date.now().toString(16)}${Math.random()
		.toString(16)
		.slice(2)}`;
	const chunks: Uint8Array[] = [];

	const appendText = (text: string) => {
		chunks.push(encodeUtf8(text));
	};

	for (const field of fields) {
		appendText(`--${boundary}\r\n`);
		appendText(`Content-Disposition: form-data; name="${field.name}"\r\n\r\n`);
		appendText(`${field.value}\r\n`);
	}

	appendText(`--${boundary}\r\n`);
	appendText(
		`Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\n`,
	);
	appendText(`Content-Type: ${file.mimeType}\r\n\r\n`);
	chunks.push(file.content);
	appendText('\r\n');
	appendText(`--${boundary}--\r\n`);

	return {
		body: concatUint8Arrays(chunks),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}

function mergeDisplayOptions(
	baseDisplayOptions: INodeProperties['displayOptions'],
	fieldDisplayOptions: INodeProperties['displayOptions'],
): INodeProperties['displayOptions'] {
	if (!fieldDisplayOptions) {
		return baseDisplayOptions;
	}

	return {
		show: {
			...(baseDisplayOptions?.show ?? {}),
			...(fieldDisplayOptions.show ?? {}),
		},
		hide: {
			...(baseDisplayOptions?.hide ?? {}),
			...(fieldDisplayOptions.hide ?? {}),
		},
	};
}

function buildProperties(): INodeProperties[] {
	const properties: INodeProperties[] = [];

	const resourceOptions: INodePropertyOptions[] = SHOPIFY_RESOURCE_DEFINITIONS.map((resourceDefinition) => ({
		name: resourceDefinition.name,
		value: resourceDefinition.value,
		description: resourceDefinition.description,
	}));

	const resourceProperty: INodeProperties = {
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		default: 'product',
		options: [{ name: 'Product', value: 'product' }],
	};
	properties.push(resourceProperty);
	(resourceProperty.options as INodePropertyOptions[]).splice(0, 1, ...resourceOptions);
	resourceProperty.default = (resourceOptions[0]?.value as string) ?? 'product';

	for (const resourceDefinition of SHOPIFY_RESOURCE_DEFINITIONS) {
		const operationConfigs = OPERATION_BY_RESOURCE[resourceDefinition.value] ?? [];
		if (operationConfigs.length === 0) {
			continue;
		}

		const operationProperty: INodeProperties = {
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: {
				show: {
					resource: [resourceDefinition.value],
				},
			},
			default: 'create',
			options: [
				{
					name: 'Create',
					value: 'create',
				},
			],
		};
		properties.push(operationProperty);
		(operationProperty.options as INodePropertyOptions[]).splice(
			0,
			1,
			...operationConfigs.map((operationConfig) => ({
				name: operationConfig.name,
				value: operationConfig.value,
				description: operationConfig.description,
				action: `${operationConfig.name} ${resourceDefinition.name.toLowerCase()}`,
			})),
		);
		operationProperty.default = operationConfigs[0].value;

		for (const operationConfig of operationConfigs) {
			const baseDisplayOptions: INodeProperties['displayOptions'] = {
				show: {
					resource: [operationConfig.resource],
					operation: [operationConfig.value],
				},
			};

			for (const field of operationConfig.fields) {
				properties.push({
					...field,
					displayOptions: mergeDisplayOptions(baseDisplayOptions, field.displayOptions),
				});
			}
		}
	}

	properties.push(...buildStandaloneMetafieldValueFields());

	properties.push({
		displayName: 'Output Mode',
		name: 'outputMode',
		type: 'options',
		noDataExpression: true,
		default: 'simplified',
		options: [
			{ name: 'Simplified', value: 'simplified' },
			{ name: 'Raw', value: 'raw' },
			{ name: 'Selected Fields', value: 'selectedFields' },
		],
	});

	properties.push({
		displayName: 'Selected Fields',
		name: 'selectedFields',
		type: 'string',
		default: '',
		placeholder: 'ID,title,status',
		displayOptions: {
			show: {
				outputMode: ['selectedFields'],
			},
		},
	});

	return properties;
}

function asMetafieldOwnerType(value: unknown): ShopifyMetafieldOwnerType | undefined {
	if (
		value === 'PRODUCT' ||
		value === 'PRODUCTVARIANT' ||
		value === 'COLLECTION' ||
		value === 'ARTICLE' ||
		value === 'BLOG' ||
		value === 'CUSTOMER' ||
		value === 'ORDER' ||
		value === 'DRAFTORDER'
	) {
		return value;
	}
	return undefined;
}

function getOperationParameters(
	executeFunctions: IExecuteFunctions,
	resource: ShopifyResourceValue,
	operation: string,
	itemIndex: number,
): IDataObject {
	const operationConfig = getOperationConfig(resource, operation);
	if (!operationConfig) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Unsupported operation "${operation}" for resource "${resource}"`,
			{ itemIndex },
		);
	}

	const parameters: IDataObject = {};
	const getFallbackValue = (field: INodeProperties): unknown => {
		if (field.default !== undefined) {
			return field.default;
		}

		switch (field.type) {
			case 'boolean':
				return false;
			case 'number':
				return 0;
			case 'multiOptions':
				return [];
			case 'collection':
			case 'fixedCollection':
				return {};
			default:
				return '';
		}
	};

	for (const field of operationConfig.fields) {
		const fallbackValue = getFallbackValue(field);
		try {
			parameters[field.name] = executeFunctions.getNodeParameter(
				field.name,
				itemIndex,
				fallbackValue as never,
			) as never;
		} catch {
			parameters[field.name] = fallbackValue as never;
		}
	}

	return parameters;
}

async function runRegistryOperation(
	executeFunctions: IExecuteFunctions,
	operationKey: ShopifyOperationKey,
	parameters: IDataObject,
	itemIndex: number,
): Promise<{ simplified: unknown; raw: IDataObject }> {
	const registryOperation = getRegistryOperation(operationKey);
	const getAll = Boolean(parameters.getAll);
	const canPaginate = registryOperation.pagination !== undefined;

	if (getAll && canPaginate) {
		const aggregatedItems: IDataObject[] = [];
		const rawPages: IDataObject[] = [];
		const variables = registryOperation.buildVariables(parameters);
		const firstVariableName = registryOperation.pagination?.firstVariableName ?? 'first';
		const afterVariableName = registryOperation.pagination?.afterVariableName ?? 'after';
		variables[firstVariableName] = 100;
		delete variables[afterVariableName];

		for (let page = 0; page < 250; page += 1) {
			const response = await executeShopifyGraphql<IDataObject>(
				executeFunctions,
				registryOperation.document,
				variables,
				itemIndex,
			);
			assertNoGraphQLErrors(executeFunctions, response, itemIndex);
			const data = (response.data ?? {}) as IDataObject;
			rawPages.push(data);

			if (registryOperation.getUserErrors) {
				throwIfUserErrors(
					executeFunctions,
					registryOperation.getUserErrors(data),
					itemIndex,
				);
			}

			const mapped = registryOperation.mapSimplified(data);
			aggregatedItems.push(...toArrayOfObjects(mapped));

			const pageInfo = getByPath(data, [...registryOperation.pagination!.connectionPath, 'pageInfo']);
			if (!isObject(pageInfo) || !pageInfo.hasNextPage || !pageInfo.endCursor) {
				break;
			}
			variables[afterVariableName] = String(pageInfo.endCursor);
		}

		return {
			simplified: aggregatedItems,
			raw: {
				pages: rawPages,
			},
		};
	}

	const variables = registryOperation.buildVariables(parameters);
	const response = await executeShopifyGraphql<IDataObject>(
		executeFunctions,
		registryOperation.document,
		variables,
		itemIndex,
	);
	assertNoGraphQLErrors(executeFunctions, response, itemIndex);
	const data = (response.data ?? {}) as IDataObject;

	if (registryOperation.getUserErrors) {
		throwIfUserErrors(executeFunctions, registryOperation.getUserErrors(data), itemIndex);
	}

	return {
		simplified: registryOperation.mapSimplified(data),
		raw: {
			data,
			extensions: (response.extensions ?? {}) as IDataObject,
		},
	};
}

async function runDeleteUnusedImagesOperation(
	executeFunctions: IExecuteFunctions,
	parameters: IDataObject,
	itemIndex: number,
): Promise<{ simplified: unknown; raw: IDataObject }> {
	const dryRun = Boolean(parameters.dryRun ?? true);
	const listResult = await runRegistryOperation(
		executeFunctions,
		'file.deleteUnusedImages',
		parameters,
		itemIndex,
	);
	const matchedFiles = toArrayOfObjects(listResult.simplified);

	if (dryRun || matchedFiles.length === 0) {
		return {
			simplified: {
				dryRun,
				matchedCount: matchedFiles.length,
				deletedCount: 0,
				deletedFileIds: [],
				files: matchedFiles,
			},
			raw: {
				list: listResult.raw,
			},
		};
	}

	const fileIds = matchedFiles
		.map((item) => String(item.id ?? ''))
		.filter((id) => id.length > 0);
	const deleteResponses: IDataObject[] = [];
	const deletedFileIds: string[] = [];

	for (const fileIdChunk of chunkArray(fileIds, 100)) {
		const deleteResult = await runRegistryOperation(
			executeFunctions,
			'file.delete',
			{ fileIds: fileIdChunk },
			itemIndex,
		);
		const deletePayload = toArrayOfObjects(deleteResult.simplified)[0];
		if (!deletePayload) {
			continue;
		}

		deleteResponses.push(deletePayload);
		const chunkDeletedIds = Array.isArray(deletePayload.deletedFileIds)
			? deletePayload.deletedFileIds.map((id) => String(id))
			: [];
		deletedFileIds.push(...chunkDeletedIds);
	}

	return {
		simplified: {
			dryRun: false,
			matchedCount: matchedFiles.length,
			deletedCount: deletedFileIds.length,
			deletedFileIds,
			files: matchedFiles,
		},
		raw: {
			list: listResult.raw,
			deletes: deleteResponses,
		},
	};
}

async function runCreateUploadFileOperation(
	executeFunctions: IExecuteFunctions,
	parameters: IDataObject,
	itemIndex: number,
): Promise<{ simplified: unknown; raw: IDataObject }> {
	const binaryPropertyName = String(parameters.binaryPropertyName ?? 'data').trim();
	if (!binaryPropertyName) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Binary Property Name is required', {
			itemIndex,
		});
	}

	const binaryData = executeFunctions.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const binaryBuffer = await executeFunctions.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	const uploadOptions = isObject(parameters.fileUploadOptions) ? parameters.fileUploadOptions : {};

	const filename =
		(typeof uploadOptions.filename === 'string' && uploadOptions.filename.trim()) ||
		(typeof binaryData.fileName === 'string' && binaryData.fileName.trim()) ||
		`upload-${Date.now()}.bin`;
	const mimeType =
		(typeof uploadOptions.mimeType === 'string' && uploadOptions.mimeType.trim()) ||
		(typeof binaryData.mimeType === 'string' && binaryData.mimeType.trim()) ||
		'application/octet-stream';
	const contentType =
		(typeof parameters.contentType === 'string' && parameters.contentType.trim()) || 'IMAGE';

	const stagedResponse = await executeShopifyGraphql<IDataObject>(
		executeFunctions,
		STAGED_UPLOADS_CREATE_MUTATION,
		{
			input: [
				{
					filename,
					mimeType,
					httpMethod: 'POST',
					resource: contentType,
					fileSize: String(binaryBuffer.length),
				},
			],
		},
		itemIndex,
	);
	assertNoGraphQLErrors(executeFunctions, stagedResponse, itemIndex);
	const stagedData = (stagedResponse.data ?? {}) as IDataObject;

	const stagedPayload = isObject(stagedData.stagedUploadsCreate)
		? (stagedData.stagedUploadsCreate as IDataObject)
		: undefined;
	const stagedUserErrors = Array.isArray(stagedPayload?.userErrors)
		? stagedPayload!.userErrors
				.filter(isObject)
				.map((userError) => ({
					field: Array.isArray(userError.field)
						? userError.field.filter(
								(fieldPart: unknown): fieldPart is string => typeof fieldPart === 'string',
							)
						: null,
					message: String(userError.message ?? 'Unknown Shopify user error'),
					code: typeof userError.code === 'string' ? userError.code : null,
				}))
		: [];
	throwIfUserErrors(executeFunctions, stagedUserErrors, itemIndex);

	const stagedTargets = Array.isArray(stagedPayload?.stagedTargets)
		? stagedPayload!.stagedTargets.filter(isObject)
		: [];
	const stagedTarget = stagedTargets[0];
	if (!stagedTarget) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Shopify did not return a staged upload target',
			{ itemIndex },
		);
	}

	const targetUrl = String(stagedTarget.url ?? '').trim();
	const resourceUrl = String(stagedTarget.resourceUrl ?? '').trim();
	if (!targetUrl || !resourceUrl) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Invalid staged upload target returned by Shopify',
			{ itemIndex },
		);
	}

	const targetParameters = Array.isArray(stagedTarget.parameters)
		? stagedTarget.parameters.filter(isObject)
		: [];
	const uploadFields = targetParameters
		.map((parameter: IDataObject) => ({
			name: String(parameter.name ?? '').trim(),
			value: String(parameter.value ?? ''),
		}))
		.filter((field: { name: string; value: string }) => field.name.length > 0);
	const multipartPayload = buildMultipartFormDataBody(uploadFields, {
		fieldName: 'file',
		filename,
		mimeType,
		content: binaryBuffer,
	});

	await executeFunctions.helpers.httpRequest({
		url: targetUrl,
		method: 'POST',
		headers: {
			'Content-Type': multipartPayload.contentType,
		},
		body: multipartPayload.body,
	});

	const createResult = await runRegistryOperation(
		executeFunctions,
		'file.create',
		{
			fileCreateItems: {
				items: [
					{
						originalSource: resourceUrl,
						contentType,
						alt: typeof uploadOptions.alt === 'string' ? uploadOptions.alt : undefined,
						filename: typeof uploadOptions.filename === 'string' ? uploadOptions.filename : filename,
					},
				],
			},
		},
		itemIndex,
	);

	return {
		simplified: createResult.simplified,
		raw: {
			stagedUpload: {
				targetUrl,
				resourceUrl,
				filename,
				mimeType,
				size: binaryBuffer.length,
			},
			create: createResult.raw,
		},
	};
}

function safeGetNodeParameter<T>(
	context: IExecuteFunctions,
	name: string,
	itemIndex: number,
	defaultValue: T,
): T {
	try {
		return context.getNodeParameter(name, itemIndex, defaultValue) as T;
	} catch {
		return defaultValue;
	}
}

function collectMetafieldResourceIds(payload: unknown): string[] {
	const ids = new Set<string>();
	const queue: unknown[] = [payload];

	while (queue.length > 0) {
		const current = queue.pop();
		if (Array.isArray(current)) {
			queue.push(...current);
			continue;
		}
		if (!isObject(current)) {
			continue;
		}

		const resourceId = current.resourceId;
		if (
			typeof resourceId === 'string' &&
			resourceId.startsWith('gid://shopify/Metafield/')
		) {
			ids.add(resourceId);
		}

		for (const value of Object.values(current)) {
			if (value && typeof value === 'object') {
				queue.push(value);
			}
		}
	}

	return Array.from(ids);
}

function buildMetafieldMetadataMap(payload: unknown): Map<string, IDataObject> {
	const metadataMap = new Map<string, IDataObject>();
	if (!Array.isArray(payload)) {
		return metadataMap;
	}

	for (const item of payload) {
		if (!isObject(item)) {
			continue;
		}
		const id = item.id;
		if (typeof id !== 'string' || !id) {
			continue;
		}
		metadataMap.set(id, item);
	}

	return metadataMap;
}

function enrichTranslationsWithMetafieldMetadata(
	payload: unknown,
	metadataById: Map<string, IDataObject>,
): unknown {
	if (Array.isArray(payload)) {
		return payload.map((item) => enrichTranslationsWithMetafieldMetadata(item, metadataById));
	}

	if (!isObject(payload)) {
		return payload;
	}

	const enriched: IDataObject = {};
	for (const [key, value] of Object.entries(payload)) {
		if (Array.isArray(value) || isObject(value)) {
			enriched[key] = enrichTranslationsWithMetafieldMetadata(value, metadataById) as never;
			continue;
		}
		enriched[key] = value as never;
	}

	const resourceId = payload.resourceId;
	if (typeof resourceId === 'string') {
		const metadata = metadataById.get(resourceId);
		if (metadata) {
			enriched.metafieldMetadata = metadata;
		}
	}

	return enriched;
}

function mapMetafieldMetadataById(metadataById: Map<string, IDataObject>): IDataObject {
	const result: IDataObject = {};
	for (const [id, metadata] of metadataById) {
		result[id] = metadata;
	}
	return result;
}

async function maybeEnrichTranslationMetafieldMetadata(
	executeFunctions: IExecuteFunctions,
	resource: ShopifyResourceValue,
	operation: string,
	operationParameters: IDataObject,
	mainResult: { simplified: unknown; raw: IDataObject },
	itemIndex: number,
): Promise<{ simplified: unknown; raw: IDataObject }> {
	if (
		resource !== 'translation' ||
		(operation !== 'coverage' && operation !== 'get' && operation !== 'getMany')
	) {
		return mainResult;
	}

	const translationOptions = isObject(operationParameters.translationOptions)
		? operationParameters.translationOptions
		: undefined;
	if (!translationOptions || !translationOptions.includeMetafieldMetadata) {
		return mainResult;
	}

	const metafieldIds = collectMetafieldResourceIds(mainResult.simplified);
	if (metafieldIds.length === 0) {
		return mainResult;
	}

	const metadataResult = await runRegistryOperation(
		executeFunctions,
		'metafieldValue.resolveMetadata',
		{ metafieldIds },
		itemIndex,
	);
	const metadataById = buildMetafieldMetadataMap(metadataResult.simplified);
	if (metadataById.size === 0) {
		return mainResult;
	}

	return {
		simplified: enrichTranslationsWithMetafieldMetadata(mainResult.simplified, metadataById),
		raw: {
			...mainResult.raw,
			metafieldMetadataById: mapMetafieldMetadataById(metadataById),
			metafieldMetadataLookup: metadataResult.raw,
		},
	};
}

type TranslationOutputShape = 'resources' | 'flattenedAll' | 'flattenedMissing';

function getTranslationOptionsFromParameters(operationParameters: IDataObject): IDataObject | undefined {
	return isObject(operationParameters.translationOptions)
		? operationParameters.translationOptions
		: undefined;
}

function getTranslationOutputShape(operationParameters: IDataObject): TranslationOutputShape {
	const translationOptions = getTranslationOptionsFromParameters(operationParameters);
	if (!translationOptions) {
		return 'resources';
	}

	const outputShape = String(translationOptions.outputShape ?? '').trim();
	if (outputShape === 'flattenedAll' || outputShape === 'flattenedMissing') {
		return outputShape;
	}

	return 'resources';
}

function getRequestedTranslationMarketId(operationParameters: IDataObject): string | undefined {
	return toOptionalString(operationParameters.marketId);
}

function getTranslationScope(operationParameters: IDataObject): 'global' | 'marketSpecific' {
	return toOptionalString(operationParameters.translationScope) === 'marketSpecific'
		? 'marketSpecific'
		: 'global';
}

async function validateTranslationParameters(
	executeFunctions: IExecuteFunctions,
	resource: ShopifyResourceValue,
	operation: string,
	operationParameters: IDataObject,
	itemIndex: number,
): Promise<IDataObject> {
	if (
		resource !== 'translation' ||
		(operation !== 'coverage' &&
			operation !== 'get' &&
			operation !== 'getMany' &&
			operation !== 'register' &&
			operation !== 'remove')
	) {
		return operationParameters;
	}

	const locales = await getShopLocales(executeFunctions);
	const primaryLocale = locales.find((locale) => locale.primary);
	const targetLocale = toOptionalString(operationParameters.locale);

	if (operation !== 'coverage') {
		if (!targetLocale) {
			throw new NodeOperationError(executeFunctions.getNode(), 'Target Locale is required', {
				itemIndex,
			});
		}

		if (locales.length > 0 && !locales.some((locale) => locale.locale === targetLocale)) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Locale "${targetLocale}" is not enabled in shopLocales`,
				{ itemIndex },
			);
		}

		if (primaryLocale?.locale && targetLocale === primaryLocale.locale) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Primary shop locale "${primaryLocale.locale}" isn't supported in the Translations resource. Source content is returned automatically; use a non-primary locale as the translation target.`,
				{ itemIndex },
			);
		}
	}

	const translationScope = getTranslationScope(operationParameters);
	const marketId = getRequestedTranslationMarketId(operationParameters);
	if ((operation === 'register' || operation === 'remove') && translationScope === 'marketSpecific' && !marketId) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Market is required when Translation Scope is set to Market-specific',
			{ itemIndex },
		);
	}

	return {
		...operationParameters,
		translationScope,
	};
}

function getTranslationsByKey(
	translations: IDataObject[],
): Map<string, IDataObject[]> {
	const translationsByKey = new Map<string, IDataObject[]>();
	for (const translation of translations) {
		if (!isObject(translation)) {
			continue;
		}

		const key = translation.key;
		if (typeof key !== 'string' || !key) {
			continue;
		}

		const existing = translationsByKey.get(key) ?? [];
		existing.push({ ...translation });
		translationsByKey.set(key, existing);
	}

	return translationsByKey;
}

function getTranslatableContentByKey(contentItems: IDataObject[]): Map<string, IDataObject> {
	const contentByKey = new Map<string, IDataObject>();
	for (const contentItem of contentItems) {
		if (!isObject(contentItem)) {
			continue;
		}

		const key = contentItem.key;
		if (typeof key !== 'string' || !key || contentByKey.has(key)) {
			continue;
		}

		contentByKey.set(key, { ...contentItem });
	}

	return contentByKey;
}

function pickRepresentativeTranslation(translations: IDataObject[]): IDataObject | undefined {
	if (translations.length === 0) {
		return undefined;
	}

	const marketSpecificTranslation = translations.find(
		(translation) => isObject(translation.market),
	);
	return marketSpecificTranslation ?? translations[0];
}

function getNestedMetafieldResources(resourceNode: IDataObject): IDataObject[] {
	if (Array.isArray(resourceNode.metafields)) {
		return resourceNode.metafields.filter(isObject);
	}

	const metafieldsConnection = isObject(resourceNode.metafields)
		? resourceNode.metafields
		: isObject(resourceNode.nestedTranslatableResources)
			? resourceNode.nestedTranslatableResources
			: undefined;
	return Array.isArray(metafieldsConnection?.nodes)
		? metafieldsConnection.nodes.filter(isObject)
		: [];
}

function getResourceTypeFromGid(resourceId: string | undefined): string | undefined {
	if (!resourceId) {
		return undefined;
	}

	const gidParts = resourceId.split('/');
	return gidParts.length >= 4 ? gidParts[3] : undefined;
}

function appendMetafieldMetadataToRow(row: IDataObject, resourceNode: IDataObject): void {
	if (!isObject(resourceNode.metafieldMetadata)) {
		return;
	}

	const metafieldMetadata = resourceNode.metafieldMetadata;
	row.metafieldMetadata = metafieldMetadata;
	row.metafieldNamespace = metafieldMetadata.namespace;
	row.metafieldKey = metafieldMetadata.key;

	if (isObject(metafieldMetadata.definition)) {
		row.metafieldDefinitionId = metafieldMetadata.definition.id;
		row.metafieldDefinitionName = metafieldMetadata.definition.name;
	}

	if (isObject(metafieldMetadata.owner)) {
		row.metafieldOwnerId = metafieldMetadata.owner.id;
		row.metafieldOwnerType = metafieldMetadata.owner.type;
	}
}

function buildTranslationFieldsForResource(
	resourceNode: IDataObject,
	targetLocale: string,
	targetMarketId: string | undefined,
): IDataObject[] {
	const translatableContentItems = Array.isArray(resourceNode.translatableContent)
		? resourceNode.translatableContent.filter(isObject)
		: [];
	const marketTranslatableContentItems = Array.isArray(resourceNode.marketTranslatableContent)
		? resourceNode.marketTranslatableContent.filter(isObject)
		: [];
	const marketTranslatableContentByKey = getTranslatableContentByKey(marketTranslatableContentItems);
	const globalTranslations = Array.isArray(resourceNode.globalTranslations)
		? resourceNode.globalTranslations.filter(isObject)
		: Array.isArray(resourceNode.translations)
			? resourceNode.translations.filter(isObject)
			: [];
	const marketTranslations = Array.isArray(resourceNode.marketTranslations)
		? resourceNode.marketTranslations.filter(isObject)
		: [];
	const globalTranslationsByKey = getTranslationsByKey(globalTranslations);
	const marketTranslationsByKey = getTranslationsByKey(marketTranslations);
	const fields: IDataObject[] = [];

	for (const contentItem of translatableContentItems) {
		const key = contentItem.key;
		if (typeof key !== 'string' || !key) {
			continue;
		}

		const globalTranslationsForKey = globalTranslationsByKey.get(key) ?? [];
		const marketTranslationsForKey = marketTranslationsByKey.get(key) ?? [];
		const globalRepresentative = pickRepresentativeTranslation(globalTranslationsForKey);
		const marketRepresentative = pickRepresentativeTranslation(marketTranslationsForKey);
		const effectiveRepresentative = marketRepresentative ?? globalRepresentative;
		const sourceLocale =
			typeof contentItem.locale === 'string' ? contentItem.locale : undefined;
		const marketContentItem = marketTranslatableContentByKey.get(key);
		const hasGlobalTranslation = globalTranslationsForKey.length > 0;
		const hasMarketTranslation = marketTranslationsForKey.length > 0;
		const hasAnyTranslation = !!effectiveRepresentative;
		const effectiveSource = hasMarketTranslation
			? 'market'
			: hasGlobalTranslation
				? 'global'
				: 'source';

		const field: IDataObject = {
			key,
			sourceValue: contentItem.value,
			sourceLocale,
			sourceType: contentItem.type,
			translatableContentDigest: contentItem.digest,
			targetLocale,
			targetMarketId: targetMarketId ?? null,
			translationStatus: hasAnyTranslation ? 'translated' : 'missing',
			hasAnyTranslation,
			hasGlobalTranslation,
			hasMarketTranslation,
			effectiveSource,
			effectiveValue: hasAnyTranslation ? effectiveRepresentative.value : contentItem.value,
			effectiveLocale: hasAnyTranslation ? targetLocale : sourceLocale ?? null,
			effectiveOutdated: hasAnyTranslation ? Boolean(effectiveRepresentative.outdated) : false,
			effectiveUpdatedAt: hasAnyTranslation ? effectiveRepresentative.updatedAt : null,
			globalTranslationCount: globalTranslationsForKey.length,
			marketTranslationCount: marketTranslationsForKey.length,
		};
		if (marketContentItem) {
			field.marketSourceValue = marketContentItem.value;
			field.marketSourceLocale =
				typeof marketContentItem.locale === 'string' ? marketContentItem.locale : undefined;
			field.marketTranslatableContentDigest = marketContentItem.digest;
		}

		if (globalRepresentative) {
			field.globalTranslationValue = globalRepresentative.value;
			field.globalTranslationUpdatedAt = globalRepresentative.updatedAt;
			field.globalTranslationOutdated = Boolean(globalRepresentative.outdated);
		}
		if (marketRepresentative) {
			field.marketTranslationValue = marketRepresentative.value;
			field.marketTranslationUpdatedAt = marketRepresentative.updatedAt;
			field.marketTranslationOutdated = Boolean(marketRepresentative.outdated);
			if (isObject(marketRepresentative.market)) {
				field.marketTranslationMarketId = marketRepresentative.market.id;
				field.marketTranslationMarketName = marketRepresentative.market.name;
			}
		}

		fields.push(field);
	}

	return fields;
}

function buildTranslationResourceTree(
	resourceNode: IDataObject,
	targetLocale: string,
	targetMarketId: string | undefined,
	parentResourceId?: string,
): IDataObject {
	const resourceId = toOptionalString(resourceNode.resourceId);
	const fields = buildTranslationFieldsForResource(resourceNode, targetLocale, targetMarketId);
	const metafields = getNestedMetafieldResources(resourceNode).map((metafieldResource) =>
		buildTranslationResourceTree(metafieldResource, targetLocale, targetMarketId, resourceId),
	);

	const resourceTree: IDataObject = {
		resourceId: resourceId ?? null,
		resourceType: getResourceTypeFromGid(resourceId) ?? null,
		parentResourceId: parentResourceId ?? null,
		resourceLevel: parentResourceId ? 'nested' : 'root',
		sourceLocale:
			fields.find((field) => typeof field.sourceLocale === 'string')?.sourceLocale ?? null,
		targetLocale: targetLocale || null,
		targetMarketId: targetMarketId ?? null,
		fieldCount: fields.length,
		translatedFieldCount: fields.filter((field) => Boolean(field.hasAnyTranslation)).length,
		missingFieldCount: fields.filter((field) => field.translationStatus === 'missing').length,
		fields,
	};

	if (isObject(resourceNode.metafieldMetadata)) {
		resourceTree.metafieldMetadata = resourceNode.metafieldMetadata;
	}
	if (metafields.length > 0) {
		resourceTree.metafields = metafields;
	}

	return resourceTree;
}

function flattenTranslationResourceTree(resourceTree: IDataObject, rows: IDataObject[]): void {
	const resourceId = toOptionalString(resourceTree.resourceId);
	const parentResourceId = toOptionalString(resourceTree.parentResourceId);
	const resourceType = toOptionalString(resourceTree.resourceType);
	const sourceLocale = toOptionalString(resourceTree.sourceLocale);
	const targetLocale = toOptionalString(resourceTree.targetLocale);
	const targetMarketId = toOptionalString(resourceTree.targetMarketId);
	const fields = Array.isArray(resourceTree.fields) ? resourceTree.fields.filter(isObject) : [];

	for (const field of fields) {
		const row: IDataObject = {
			resourceId: resourceId ?? null,
			resourceType: resourceType ?? null,
			parentResourceId: parentResourceId ?? null,
			resourceLevel: resourceTree.resourceLevel,
			sourceLocale: sourceLocale ?? null,
			targetLocale: targetLocale ?? null,
			targetMarketId: targetMarketId ?? null,
			...field,
		};
		appendMetafieldMetadataToRow(row, resourceTree);
		rows.push(row);
	}

	const metafields = Array.isArray(resourceTree.metafields)
		? resourceTree.metafields.filter(isObject)
		: [];
	for (const metafieldResource of metafields) {
		flattenTranslationResourceTree(metafieldResource, rows);
	}
}

function getTranslationCoverageRowKey(row: IDataObject): string | undefined {
	const resourceId = toOptionalString(row.resourceId);
	const parentResourceId = toOptionalString(row.parentResourceId) ?? '';
	const key = toOptionalString(row.key);
	if (!resourceId || !key) {
		return undefined;
	}

	return `${resourceId}::${parentResourceId}::${key}`;
}

function sortLocaleSet(locales: Set<string>): string[] {
	return Array.from(locales).sort((a, b) => a.localeCompare(b));
}

function buildTranslationCoverageRows(
	localeRows: IDataObject[],
	targetLocales: string[],
	primaryLocale: string | undefined,
	targetMarketId: string | undefined,
): IDataObject[] {
	const coverageMap = new Map<
		string,
		{
			row: IDataObject;
			globalTranslatedLocales: Set<string>;
			marketTranslatedLocales: Set<string>;
			missingLocales: Set<string>;
			translatedLocales: Set<string>;
		}
	>();

	for (const localeRow of localeRows) {
		const rowKey = getTranslationCoverageRowKey(localeRow);
		if (!rowKey) {
			continue;
		}

		const targetLocale = toOptionalString(localeRow.targetLocale);
		if (!targetLocale) {
			continue;
		}

		let entry = coverageMap.get(rowKey);
		if (!entry) {
			const baseRow: IDataObject = {
				resourceId: toOptionalString(localeRow.resourceId) ?? null,
				resourceType: toOptionalString(localeRow.resourceType) ?? null,
				parentResourceId: toOptionalString(localeRow.parentResourceId) ?? null,
				resourceLevel: localeRow.resourceLevel,
				key: localeRow.key,
				sourceValue: localeRow.sourceValue,
				sourceLocale: toOptionalString(localeRow.sourceLocale) ?? primaryLocale ?? null,
				sourceType: localeRow.sourceType,
				translatableContentDigest: localeRow.translatableContentDigest,
				targetMarketId: targetMarketId ?? null,
			};

			if ('marketSourceValue' in localeRow) {
				baseRow.marketSourceValue = localeRow.marketSourceValue;
			}
			if ('marketSourceLocale' in localeRow) {
				baseRow.marketSourceLocale = localeRow.marketSourceLocale;
			}
			if ('marketTranslatableContentDigest' in localeRow) {
				baseRow.marketTranslatableContentDigest = localeRow.marketTranslatableContentDigest;
			}

			entry = {
				row: baseRow,
				globalTranslatedLocales: new Set<string>(),
				marketTranslatedLocales: new Set<string>(),
				missingLocales: new Set<string>(),
				translatedLocales: new Set<string>(),
			};
			coverageMap.set(rowKey, entry);
		}

		if (localeRow.hasGlobalTranslation) {
			entry.globalTranslatedLocales.add(targetLocale);
		}
		if (localeRow.hasMarketTranslation) {
			entry.marketTranslatedLocales.add(targetLocale);
		}
		if (localeRow.translationStatus === 'translated') {
			entry.translatedLocales.add(targetLocale);
		} else {
			entry.missingLocales.add(targetLocale);
		}
	}

	const coverageRows: IDataObject[] = [];

	for (const entry of coverageMap.values()) {
		for (const locale of targetLocales) {
			if (!entry.translatedLocales.has(locale)) {
				entry.missingLocales.add(locale);
			}
		}

		const translatedLocales = sortLocaleSet(entry.translatedLocales);
		const globalTranslatedLocales = sortLocaleSet(entry.globalTranslatedLocales);
		const marketTranslatedLocales = sortLocaleSet(entry.marketTranslatedLocales);
		const missingLocales = sortLocaleSet(entry.missingLocales);
		const translatedLocaleCount = translatedLocales.length;
		const missingLocaleCount = missingLocales.length;

		coverageRows.push({
			...entry.row,
			targetLocales,
			targetLocaleCount: targetLocales.length,
			translatedLocales,
			translatedLocaleCount,
			globalTranslatedLocales,
			globalTranslatedLocaleCount: globalTranslatedLocales.length,
			marketTranslatedLocales,
			marketTranslatedLocaleCount: marketTranslatedLocales.length,
			missingLocales,
			missingLocaleCount,
			hasAnyTranslation: translatedLocaleCount > 0,
			partiallyTranslated: translatedLocaleCount > 0 && missingLocaleCount > 0,
			fullyTranslated: targetLocales.length > 0 && missingLocaleCount === 0,
		});
	}

	return coverageRows;
}

function buildTranslationCoverageResourceTrees(
	coverageRows: IDataObject[],
	targetLocales: string[],
	primaryLocale: string | undefined,
	targetMarketId: string | undefined,
): IDataObject[] {
	const resourcesById = new Map<string, IDataObject>();
	const roots: IDataObject[] = [];

	for (const row of coverageRows) {
		const resourceId = toOptionalString(row.resourceId);
		if (!resourceId) {
			continue;
		}

		let resourceTree = resourcesById.get(resourceId);
		if (!resourceTree) {
			resourceTree = {
				resourceId,
				resourceType: toOptionalString(row.resourceType) ?? null,
				parentResourceId: toOptionalString(row.parentResourceId) ?? null,
				resourceLevel: row.resourceLevel,
				sourceLocale: toOptionalString(row.sourceLocale) ?? primaryLocale ?? null,
				targetLocales,
				targetLocaleCount: targetLocales.length,
				targetMarketId: targetMarketId ?? null,
				fields: [],
			};
			resourcesById.set(resourceId, resourceTree);
		}

		(resourceTree.fields as IDataObject[]).push({ ...row });
	}

	for (const resourceTree of resourcesById.values()) {
		const fields = Array.isArray(resourceTree.fields) ? resourceTree.fields.filter(isObject) : [];
		resourceTree.fieldCount = fields.length;
		resourceTree.fullyTranslatedFieldCount = fields.filter((field) => Boolean(field.fullyTranslated)).length;
		resourceTree.partiallyTranslatedFieldCount = fields.filter((field) =>
			Boolean(field.partiallyTranslated),
		).length;
		resourceTree.missingFieldCount = fields.filter(
			(field) => Number(field.translatedLocaleCount ?? 0) === 0,
		).length;

		const parentResourceId = toOptionalString(resourceTree.parentResourceId);
		if (parentResourceId && resourcesById.has(parentResourceId)) {
			const parent = resourcesById.get(parentResourceId)!;
			if (!Array.isArray(parent.metafields)) {
				parent.metafields = [];
			}
			(parent.metafields as IDataObject[]).push(resourceTree);
			continue;
		}

		roots.push(resourceTree);
	}

	return roots;
}

async function runTranslationCoverageOperation(
	executeFunctions: IExecuteFunctions,
	operationParameters: IDataObject,
	itemIndex: number,
): Promise<{ simplified: unknown; raw: IDataObject }> {
	const locales = await getShopLocales(executeFunctions);
	const primaryLocale = locales.find((locale) => locale.primary);
	const targetLocales = locales
		.filter((locale) => !locale.primary)
		.map((locale) => locale.locale)
		.sort((a, b) => a.localeCompare(b));

	if (targetLocales.length === 0) {
		throw new NodeOperationError(
			executeFunctions.getNode(),
			'Translations Coverage requires at least one enabled non-primary locale',
			{ itemIndex },
		);
	}

	const targetMarketId = getRequestedTranslationMarketId(operationParameters);
	const rawByLocale: IDataObject = {};
	const localeRows: IDataObject[] = [];

	for (const targetLocale of targetLocales) {
		const localeResult = await runRegistryOperation(
			executeFunctions,
			'translation.coverage',
			{
				...operationParameters,
				locale: targetLocale,
			},
			itemIndex,
		);
		rawByLocale[targetLocale] = localeResult.raw;

		const resourceTrees = toArrayOfObjects(localeResult.simplified).map((resourceNode) =>
			buildTranslationResourceTree(resourceNode, targetLocale, targetMarketId),
		);
		for (const resourceTree of resourceTrees) {
			flattenTranslationResourceTree(resourceTree, localeRows);
		}
	}

	const coverageRows = buildTranslationCoverageRows(
		localeRows,
		targetLocales,
		primaryLocale?.locale,
		targetMarketId,
	);
	const outputShape = getTranslationOutputShape(operationParameters);
	const simplified =
		outputShape === 'resources'
			? buildTranslationCoverageResourceTrees(
					coverageRows,
					targetLocales,
					primaryLocale?.locale,
					targetMarketId,
				)
			: outputShape === 'flattenedMissing'
				? coverageRows.filter((row) => Number(row.missingLocaleCount ?? 0) > 0)
				: coverageRows;

	return {
		simplified,
		raw: {
			byLocale: rawByLocale,
			translationCoverageOutputShape: outputShape,
			translationCoveragePrimaryLocale: primaryLocale?.locale ?? null,
			translationCoverageResourceCount:
				outputShape === 'resources'
					? toArrayOfObjects(simplified).length
					: new Set(
							coverageRows
								.map((row) => toOptionalString(row.resourceId))
								.filter((resourceId): resourceId is string => !!resourceId),
						).size,
			translationCoverageRowCount: coverageRows.length,
			translationCoverageTargetLocales: targetLocales,
			translationCoverageTargetMarketId: targetMarketId ?? null,
		},
	};
}

function maybeShapeTranslationOutput(
	resource: ShopifyResourceValue,
	operation: string,
	operationParameters: IDataObject,
	mainResult: { simplified: unknown; raw: IDataObject },
): { simplified: unknown; raw: IDataObject } {
	if (resource !== 'translation' || (operation !== 'get' && operation !== 'getMany')) {
		return mainResult;
	}

	const outputShape = getTranslationOutputShape(operationParameters);
	const targetLocale =
		typeof operationParameters.locale === 'string' ? operationParameters.locale : '';
	const targetMarketId = getRequestedTranslationMarketId(operationParameters);
	const resourceTrees = toArrayOfObjects(mainResult.simplified).map((resourceNode) =>
		buildTranslationResourceTree(resourceNode, targetLocale, targetMarketId),
	);
	if (outputShape === 'resources') {
		return {
			simplified: resourceTrees,
			raw: {
				...mainResult.raw,
				translationOutputShape: outputShape,
				translationResourceCount: resourceTrees.length,
				translationTargetMarketId: targetMarketId ?? null,
			},
		};
	}

	const flattenedRows: IDataObject[] = [];
	for (const resourceTree of resourceTrees) {
		flattenTranslationResourceTree(resourceTree, flattenedRows);
	}
	const shapedRows =
		outputShape === 'flattenedMissing'
			? flattenedRows.filter((row) => row.translationStatus === 'missing')
			: flattenedRows;

	return {
		simplified: shapedRows,
		raw: {
			...mainResult.raw,
			translationOutputShape: outputShape,
			translationOutputRows: shapedRows.length,
			translationResourceCount: resourceTrees.length,
			translationTargetMarketId: targetMarketId ?? null,
		},
	};
}

export class ShopifyCustom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopify Custom',
		name: 'shopifyCustom',
		icon: { light: 'file:shopify.svg', dark: 'file:shopify.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Shopify Admin GraphQL node with metafields and definitions support',
		defaults: {
			name: 'Shopify Custom',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'shopifyCustomAdminApi',
				required: true,
			},
		],
		properties: buildProperties(),
	};

	methods = {
		loadOptions: {
			async getMetafieldDefinitionTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					return await getMetafieldDefinitionTypeOptions(this);
				} catch {
					return [];
				}
			},
			async getMetafieldDefinitionsForCurrentContext(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				let resource = 'product' as ShopifyResourceValue;
				try {
					resource = this.getCurrentNodeParameter('resource') as ShopifyResourceValue;
				} catch {
					resource = 'product';
				}
				const ownerTypeFromResource = getOwnerTypeFromResource(resource);
				let ownerTypeFromParameter: ShopifyMetafieldOwnerType | undefined;
				try {
					ownerTypeFromParameter = asMetafieldOwnerType(
						this.getCurrentNodeParameter('ownerType'),
					);
				} catch {
					ownerTypeFromParameter = undefined;
				}
				const ownerType = ownerTypeFromResource ?? (ownerTypeFromParameter || undefined);

				if (!ownerType) {
					return [];
				}

				try {
					return await getMetafieldDefinitionOptions(this, ownerType);
				} catch {
					return [];
				}
			},
			async getReferenceOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					return await getReferenceOptions(this);
				} catch {
					return [];
				}
			},
			async getCollectionNativeRuleTypeOptions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				try {
					return await getCollectionNativeRuleTypeOptions(this);
				} catch {
					return [];
				}
			},
			async getCollectionMetafieldRuleOptions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				try {
					return await getCollectionMetafieldRuleOptions(this);
				} catch {
					return [];
				}
			},
			async getCollectionRuleRelationOptions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				try {
					return await getCollectionRuleRelationOptions(this);
				} catch {
					return [];
				}
			},
			async getShopLocaleOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					return await getShopLocaleOptions(this);
				} catch {
					return [];
				}
			},
			async getTranslationTargetLocaleOptions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				try {
					return await getTranslationTargetLocaleOptions(this);
				} catch {
					return [];
				}
			},
			async getMarketOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					return await getMarketOptions(this);
				} catch {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let adminApiVersion: string | undefined;
		try {
			const credentials = await this.getCredentials('shopifyCustomAdminApi');
			adminApiVersion =
				typeof credentials.apiVersion === 'string' ? credentials.apiVersion.trim() : undefined;
		} catch {
			adminApiVersion = undefined;
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
			let currentResource: ShopifyResourceValue = 'product';
			let currentOperation = 'getMany';
			try {
				const resource = safeGetNodeParameter<ShopifyResourceValue>(
					this,
					'resource',
					itemIndex,
					'product',
				);
				currentResource = resource;
				const fallbackOperation = OPERATION_BY_RESOURCE[resource]?.[0]?.value ?? 'getMany';
				const operation = safeGetNodeParameter<string>(
					this,
					'operation',
					itemIndex,
					fallbackOperation,
				);
				currentOperation = operation;
				const outputMode = safeGetNodeParameter<ShopifyOutputMode>(
					this,
					'outputMode',
					itemIndex,
					'simplified',
				);
				const selectedFields = safeGetNodeParameter<string>(this, 'selectedFields', itemIndex, '');

				const operationConfig = getOperationConfig(resource, operation);
				if (!operationConfig) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" for resource "${resource}"`,
						{
							itemIndex,
						},
					);
				}

				let operationParameters = getOperationParameters(
					this,
					resource,
					operation,
					itemIndex,
				);
				if (adminApiVersion) {
					operationParameters.__apiVersion = adminApiVersion;
				}

				if (resource === 'metafieldValue') {
					const ownerId = String(operationParameters.ownerId ?? '');
					if ((operation === 'set' || operation === 'delete') && !ownerId) {
						throw new NodeOperationError(this.getNode(), 'Owner ID is required', { itemIndex });
					}

					if (operation === 'set') {
						const collection = safeGetNodeParameter<IDataObject>(
							this,
							'metafieldsSetItems',
							itemIndex,
							{},
						);
						operationParameters.metafieldsPayload = buildMetafieldsSetPayload(
							'Shopify Custom',
							ownerId,
							collection,
						);
					} else if (operation === 'delete') {
						const collection = safeGetNodeParameter<IDataObject>(
							this,
							'metafieldsDeleteItems',
							itemIndex,
							{},
						);
						operationParameters.metafieldsPayload = buildMetafieldsDeletePayload(
							'Shopify Custom',
							ownerId,
							collection,
						);
					}
				}

				if (resource === 'metafieldValue' && operation === 'getMany') {
					operationParameters.afterCursor = '';
				}

				if (resource === 'metafieldDefinition' && operation === 'list') {
					operationParameters.afterCursor = '';
				}

				operationParameters = await validateTranslationParameters(
					this,
					resource,
					operation,
					operationParameters,
					itemIndex,
				);

				const mainResult =
					resource === 'translation' && operation === 'coverage'
						? await runTranslationCoverageOperation(this, operationParameters, itemIndex)
						: resource === 'file' && operation === 'deleteUnusedImages'
						? await runDeleteUnusedImagesOperation(this, operationParameters, itemIndex)
						: resource === 'file' && operation === 'createUpload'
							? await runCreateUploadFileOperation(this, operationParameters, itemIndex)
						: await runRegistryOperation(
								this,
								operationConfig.registryKey,
								operationParameters,
								itemIndex,
							);
				const resultWithTranslationMetadata = await maybeEnrichTranslationMetafieldMetadata(
					this,
					resource,
					operation,
					operationParameters,
					mainResult,
					itemIndex,
				);
				const resultWithTranslationShape = maybeShapeTranslationOutput(
					resource,
					operation,
					operationParameters,
					resultWithTranslationMetadata,
				);

				const outputItems = mapOutputItems(
					outputMode,
					resultWithTranslationShape.simplified,
					resultWithTranslationShape.raw,
					selectedFields,
				);
				returnData.push(...this.helpers.returnJsonArray(outputItems));
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				if (/Could not get parameter/i.test(errorMessage)) {
					throw new NodeOperationError(
						this.getNode(),
						`Could not read one of the node parameters while executing "${currentResource} -> ${currentOperation}". Reopen the node, reselect the operation, save, and run again. If the issue persists, update the installed node package to the latest version.`,
						{ itemIndex },
					);
				}

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: getErrorData(error),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
