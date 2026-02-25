import type { INodeProperties } from 'n8n-workflow';
import type { ShopifyResourceValue } from '../resources';

export type ShopifyOperationValue =
	| 'create'
	| 'get'
	| 'getMany'
	| 'update'
	| 'delete'
	| 'deleteUnusedImages'
	| 'set'
	| 'resolveMetadata'
	| 'register'
	| 'remove'
	| 'list'
	| 'listDefinitionTypes';

export type ShopifyOperationKey =
	| 'product.create'
	| 'product.get'
	| 'product.getMany'
	| 'product.update'
	| 'product.delete'
	| 'productVariant.create'
	| 'productVariant.get'
	| 'productVariant.getMany'
	| 'productVariant.update'
	| 'productVariant.delete'
	| 'collection.create'
	| 'collection.get'
	| 'collection.getMany'
	| 'collection.update'
	| 'collection.delete'
	| 'customer.create'
	| 'customer.get'
	| 'customer.getMany'
	| 'customer.update'
	| 'customer.delete'
	| 'order.create'
	| 'order.get'
	| 'order.getMany'
	| 'order.update'
	| 'order.delete'
	| 'draftOrder.create'
	| 'draftOrder.get'
	| 'draftOrder.getMany'
	| 'draftOrder.update'
	| 'draftOrder.delete'
	| 'file.getMany'
	| 'file.update'
	| 'file.delete'
	| 'file.deleteUnusedImages'
	| 'translation.get'
	| 'translation.getMany'
	| 'translation.register'
	| 'translation.remove'
	| 'metaobject.create'
	| 'metaobject.get'
	| 'metaobject.getMany'
	| 'metaobject.update'
	| 'metaobject.delete'
	| 'metafieldValue.set'
	| 'metafieldValue.get'
	| 'metafieldValue.getMany'
	| 'metafieldValue.resolveMetadata'
	| 'metafieldValue.delete'
	| 'metafieldDefinition.list'
	| 'metafieldDefinition.get'
	| 'metafieldDefinition.create'
	| 'metafieldDefinition.update'
	| 'metafieldDefinition.delete'
	| 'service.listDefinitionTypes';

export interface IShopifyOperationConfig {
	resource: ShopifyResourceValue;
	value: ShopifyOperationValue;
	name: string;
	description: string;
	registryKey: ShopifyOperationKey;
	fields: INodeProperties[];
	supportsMetafields?: boolean;
}
