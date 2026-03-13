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
import { getMarketOptions, getShopLocaleOptions } from './shared/translations/options';

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
	if (resource !== 'translation' || (operation !== 'get' && operation !== 'getMany')) {
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

function getTranslationOutputShape(operationParameters: IDataObject): TranslationOutputShape {
	const translationOptions = isObject(operationParameters.translationOptions)
		? operationParameters.translationOptions
		: undefined;
	if (!translationOptions) {
		return 'resources';
	}

	const outputShape = String(translationOptions.outputShape ?? '').trim();
	if (outputShape === 'flattenedAll' || outputShape === 'flattenedMissing') {
		return outputShape;
	}

	return 'resources';
}

function getTranslationsByKey(
	resourceNode: IDataObject,
	targetLocale: string,
): Map<string, IDataObject[]> {
	const translationsByKey = new Map<string, IDataObject[]>();
	if (!Array.isArray(resourceNode.translations)) {
		return translationsByKey;
	}

	for (const translation of resourceNode.translations) {
		if (!isObject(translation)) {
			continue;
		}

		const key = translation.key;
		if (typeof key !== 'string' || !key) {
			continue;
		}

		const locale = translation.locale;
		if (targetLocale && typeof locale === 'string' && locale && locale !== targetLocale) {
			continue;
		}

		const existing = translationsByKey.get(key) ?? [];
		existing.push({ ...translation });
		translationsByKey.set(key, existing);
	}

	return translationsByKey;
}

function pickRepresentativeTranslation(translations: IDataObject[]): IDataObject | undefined {
	if (translations.length === 0) {
		return undefined;
	}

	const nonMarketTranslation = translations.find(
		(translation) => !isObject(translation.market),
	);
	return nonMarketTranslation ?? translations[0];
}

function flattenTranslationRowsForResource(
	resourceNode: IDataObject,
	targetLocale: string,
	rows: IDataObject[],
	parentResourceId?: string,
): void {
	const resourceId =
		typeof resourceNode.resourceId === 'string' && resourceNode.resourceId
			? resourceNode.resourceId
			: undefined;
	const translationsByKey = getTranslationsByKey(resourceNode, targetLocale);
	const translatableContentItems = Array.isArray(resourceNode.translatableContent)
		? resourceNode.translatableContent.filter(isObject)
		: [];

	for (const contentItem of translatableContentItems) {
		const key = contentItem.key;
		if (typeof key !== 'string' || !key) {
			continue;
		}

		const keyTranslations = translationsByKey.get(key) ?? [];
		const representative = pickRepresentativeTranslation(keyTranslations);
		const sourceLocale =
			typeof contentItem.locale === 'string' ? contentItem.locale : undefined;
		const usesSourceLocaleAsTarget =
			keyTranslations.length === 0 &&
			typeof targetLocale === 'string' &&
			targetLocale.length > 0 &&
			!!sourceLocale &&
			sourceLocale === targetLocale;
		const translationStatus =
			keyTranslations.length > 0
				? 'translated'
				: usesSourceLocaleAsTarget
					? 'source'
					: 'missing';

		const row: IDataObject = {
			resourceId,
			parentResourceId: parentResourceId ?? null,
			resourceLevel: parentResourceId ? 'nested' : 'root',
			key,
			sourceValue: contentItem.value,
			sourceLocale,
			sourceType: contentItem.type,
			translatableContentDigest: contentItem.digest,
			targetLocale,
			translationStatus,
			translationCount: keyTranslations.length,
		};

		if (representative) {
			row.translatedValue = representative.value;
			row.translatedUpdatedAt = representative.updatedAt;
			row.translatedOutdated = representative.outdated;
			if (isObject(representative.market)) {
				row.translatedMarketId = representative.market.id;
				row.translatedMarketName = representative.market.name;
			}
		}
		if (!representative && usesSourceLocaleAsTarget) {
			row.translatedValue = contentItem.value;
			row.translatedOutdated = false;
		}

		if (keyTranslations.length > 0) {
			row.translations = keyTranslations;
		}

		rows.push(row);
	}

	const nestedConnection = isObject(resourceNode.nestedTranslatableResources)
		? resourceNode.nestedTranslatableResources
		: undefined;
	const nestedResources = Array.isArray(nestedConnection?.nodes)
		? nestedConnection.nodes.filter(isObject)
		: [];
	const nestedParentResourceId = resourceId ?? parentResourceId;
	for (const nestedResource of nestedResources) {
		flattenTranslationRowsForResource(
			nestedResource,
			targetLocale,
			rows,
			nestedParentResourceId,
		);
	}
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
	if (outputShape === 'resources') {
		return mainResult;
	}

	const targetLocale =
		typeof operationParameters.locale === 'string' ? operationParameters.locale : '';
	const resources = toArrayOfObjects(mainResult.simplified);
	const flattenedRows: IDataObject[] = [];
	for (const resourceNode of resources) {
		flattenTranslationRowsForResource(resourceNode, targetLocale, flattenedRows);
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

				const operationParameters = getOperationParameters(
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

				const mainResult =
					resource === 'file' && operation === 'deleteUnusedImages'
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
