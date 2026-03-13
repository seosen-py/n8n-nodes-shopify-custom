import type { INodePropertyOptions } from 'n8n-workflow';
import type { ShopifyResourceValue } from '../resources';
import { ARTICLE_OPERATION_CONFIGS } from './article';
import { BLOG_OPERATION_CONFIGS } from './blog';
import { COLLECTION_OPERATION_CONFIGS } from './collection';
import { CUSTOMER_OPERATION_CONFIGS } from './customer';
import { DRAFT_ORDER_OPERATION_CONFIGS } from './draftOrder';
import { FILE_OPERATION_CONFIGS } from './file';
import { INVENTORY_OPERATION_CONFIGS } from './inventory';
import { METAFIELD_DEFINITION_OPERATION_CONFIGS } from './metafieldDefinition';
import { METAFIELD_VALUE_OPERATION_CONFIGS } from './metafieldValue';
import { METAOBJECT_OPERATION_CONFIGS } from './metaobject';
import { ORDER_OPERATION_CONFIGS } from './order';
import { PRODUCT_OPERATION_CONFIGS } from './product';
import { PRODUCT_VARIANT_OPERATION_CONFIGS } from './productVariant';
import { SERVICE_OPERATION_CONFIGS } from './service';
import { TRANSLATION_OPERATION_CONFIGS } from './translation';
import type { IShopifyOperationConfig } from './types';

export const SHOPIFY_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	...PRODUCT_OPERATION_CONFIGS,
	...PRODUCT_VARIANT_OPERATION_CONFIGS,
	...COLLECTION_OPERATION_CONFIGS,
	...ARTICLE_OPERATION_CONFIGS,
	...BLOG_OPERATION_CONFIGS,
	...CUSTOMER_OPERATION_CONFIGS,
	...ORDER_OPERATION_CONFIGS,
	...DRAFT_ORDER_OPERATION_CONFIGS,
	...INVENTORY_OPERATION_CONFIGS,
	...FILE_OPERATION_CONFIGS,
	...TRANSLATION_OPERATION_CONFIGS,
	...METAOBJECT_OPERATION_CONFIGS,
	...METAFIELD_VALUE_OPERATION_CONFIGS,
	...METAFIELD_DEFINITION_OPERATION_CONFIGS,
	...SERVICE_OPERATION_CONFIGS,
];

export const OPERATION_BY_RESOURCE = SHOPIFY_OPERATION_CONFIGS.reduce(
	(acc, operationConfig) => {
		acc[operationConfig.resource] ??= [];
		acc[operationConfig.resource].push(operationConfig);
		return acc;
	},
	{} as Record<ShopifyResourceValue, IShopifyOperationConfig[]>,
);

export function buildOperationOptions(resource: ShopifyResourceValue): INodePropertyOptions[] {
	const operationConfigs = OPERATION_BY_RESOURCE[resource] ?? [];
	return operationConfigs.map((operationConfig) => ({
		name: operationConfig.name,
		value: operationConfig.value,
		description: operationConfig.description,
		action: `${operationConfig.name} (${resource})`,
	}));
}

export function getOperationConfig(
	resource: ShopifyResourceValue,
	operation: string,
): IShopifyOperationConfig | undefined {
	return SHOPIFY_OPERATION_CONFIGS.find(
		(operationConfig) => operationConfig.resource === resource && operationConfig.value === operation,
	);
}
