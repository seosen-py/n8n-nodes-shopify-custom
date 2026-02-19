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
import { getMetafieldDefinitionOptions } from './shared/metafields/definitions';
import { getOwnerTypeFromResource } from './shared/metafields/ownerTypeMap';
import { getReferenceOptions } from './shared/metafields/referenceLoaders';
import { getMetafieldDefinitionTypeOptions } from './shared/metafields/types';
import { buildStandaloneMetafieldValueFields } from './shared/metafields/uiFactory';
import { buildMetafieldsDeletePayload, buildMetafieldsSetPayload } from './shared/metafields/valuePayload';
import { mapOutputItems, type ShopifyOutputMode } from './shared/output/outputMapper';

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
	for (const field of operationConfig.fields) {
		parameters[field.name] = executeFunctions.getNodeParameter(
			field.name,
			itemIndex,
			field.default,
		) as never;
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
				return await getMetafieldDefinitionTypeOptions(this);
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

				return await getMetafieldDefinitionOptions(this, ownerType);
			},
			async getReferenceOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await getReferenceOptions(this);
			},
			async getCollectionNativeRuleTypeOptions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getCollectionNativeRuleTypeOptions(this);
			},
			async getCollectionMetafieldRuleOptions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getCollectionMetafieldRuleOptions(this);
			},
			async getCollectionRuleRelationOptions(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				return await getCollectionRuleRelationOptions(this);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as ShopifyResourceValue;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const outputMode = this.getNodeParameter(
					'outputMode',
					itemIndex,
					'simplified',
				) as ShopifyOutputMode;
				const selectedFields = this.getNodeParameter('selectedFields', itemIndex, '') as string;

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

				if (resource === 'metafieldValue') {
					const ownerId = String(operationParameters.ownerId ?? '');
					if ((operation === 'set' || operation === 'delete') && !ownerId) {
						throw new NodeOperationError(this.getNode(), 'Owner ID is required', { itemIndex });
					}

					if (operation === 'set') {
						const collection = this.getNodeParameter('metafieldsSetItems', itemIndex, {}) as IDataObject;
						operationParameters.metafieldsPayload = buildMetafieldsSetPayload(
							'Shopify Custom',
							ownerId,
							collection,
						);
					} else if (operation === 'delete') {
						const collection = this.getNodeParameter(
							'metafieldsDeleteItems',
							itemIndex,
							{},
						) as IDataObject;
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
						: await runRegistryOperation(
								this,
								operationConfig.registryKey,
								operationParameters,
								itemIndex,
							);

				const outputItems = mapOutputItems(
					outputMode,
					mainResult.simplified,
					mainResult.raw,
					selectedFields,
				);
				returnData.push(...this.helpers.returnJsonArray(outputItems));
			} catch (error) {
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
