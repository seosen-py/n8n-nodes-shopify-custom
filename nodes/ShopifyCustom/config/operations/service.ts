import type { IShopifyOperationConfig } from './types';

export const SERVICE_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'service',
		value: 'listDefinitionTypes',
		name: 'List Metafield Definition Types',
		description: 'List metafield types and their supported validations',
		registryKey: 'service.listDefinitionTypes',
		fields: [],
	},
];
