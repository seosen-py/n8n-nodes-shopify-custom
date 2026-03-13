export type ShopifyResourceValue =
	| 'product'
	| 'productVariant'
	| 'collection'
	| 'article'
	| 'blog'
	| 'customer'
	| 'order'
	| 'draftOrder'
	| 'inventory'
	| 'file'
	| 'translation'
	| 'metaobject'
	| 'metafieldValue'
	| 'metafieldDefinition'
	| 'service';

export type ShopifyMetafieldOwnerType =
	| 'PRODUCT'
	| 'PRODUCTVARIANT'
	| 'COLLECTION'
	| 'ARTICLE'
	| 'BLOG'
	| 'CUSTOMER'
	| 'ORDER'
	| 'DRAFTORDER';

export interface IShopifyResourceDefinition {
	value: ShopifyResourceValue;
	name: string;
	description: string;
	ownerType?: ShopifyMetafieldOwnerType;
}

export const SHOPIFY_RESOURCE_DEFINITIONS: IShopifyResourceDefinition[] = [
	{
		value: 'product',
		name: 'Product',
		description: 'Create, read, update and delete products',
		ownerType: 'PRODUCT',
	},
	{
		value: 'productVariant',
		name: 'Product Variant',
		description: 'Create, read, update and delete product variants',
		ownerType: 'PRODUCTVARIANT',
	},
	{
		value: 'collection',
		name: 'Collection',
		description: 'Manage Shopify collections',
		ownerType: 'COLLECTION',
	},
	{
		value: 'article',
		name: 'Article',
		description: 'Manage Shopify blog articles',
		ownerType: 'ARTICLE',
	},
	{
		value: 'blog',
		name: 'Blog',
		description: 'Manage Shopify blogs',
		ownerType: 'BLOG',
	},
	{
		value: 'customer',
		name: 'Customer',
		description: 'Manage customer records',
		ownerType: 'CUSTOMER',
	},
	{
		value: 'order',
		name: 'Order',
		description: 'Create and manage orders',
		ownerType: 'ORDER',
	},
	{
		value: 'draftOrder',
		name: 'Draft Order',
		description: 'Manage draft orders',
		ownerType: 'DRAFTORDER',
	},
	{
		value: 'inventory',
		name: 'Inventory',
		description: 'Manage inventory items and quantities',
	},
	{
		value: 'file',
		name: 'File',
		description: 'Manage Shopify files and media assets',
	},
	{
		value: 'translation',
		name: 'Translation',
		description: 'Manage translated content for Shopify resources',
	},
	{
		value: 'metaobject',
		name: 'Metaobject',
		description: 'Manage Shopify metaobjects',
	},
	{
		value: 'metafieldValue',
		name: 'Metafield Value',
		description: 'Set, read and delete metafield values',
	},
	{
		value: 'metafieldDefinition',
		name: 'Metafield Definition',
		description: 'Create, read, update and delete metafield definitions',
	},
	{
		value: 'service',
		name: 'Service',
		description: 'Service utilities',
	},
];
