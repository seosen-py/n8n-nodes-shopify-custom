import type { INodeProperties } from 'n8n-workflow';
import { gidField, paginationFields, readMetafieldsFields } from './common';
import type { IShopifyOperationConfig } from './types';

const PRODUCT_VARIANT_SORT_OPTIONS = [
	{ name: 'ID', value: 'ID' },
	{ name: 'Position', value: 'POSITION' },
	{ name: 'SKU', value: 'SKU' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
	{ name: 'Inventory Quantity', value: 'INVENTORY_QUANTITY' },
];

function productVariantBaseFields(): INodeProperties[] {
	return [
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
		},
		{
			displayName: 'SKU',
			name: 'sku',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Barcode',
			name: 'barcode',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Price',
			name: 'price',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 2,
			},
		},
		{
			displayName: 'Compare At Price',
			name: 'compareAtPrice',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 2,
			},
		},
		{
			displayName: 'Taxable',
			name: 'taxable',
			type: 'boolean',
			default: true,
		},
	];
}

export const PRODUCT_VARIANT_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'productVariant',
		value: 'create',
		name: 'Create',
		description: 'Create a product variant',
		registryKey: 'productVariant.create',
		fields: [gidField('productId', 'Product ID', 'Global product ID in Shopify'), ...productVariantBaseFields()],
		supportsMetafields: true,
	},
	{
		resource: 'productVariant',
		value: 'get',
		name: 'Get',
		description: 'Get a product variant by ID',
		registryKey: 'productVariant.get',
		fields: [gidField('variantId', 'Variant ID', 'Global variant ID in Shopify'), ...readMetafieldsFields()],
	},
	{
		resource: 'productVariant',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many variants',
		registryKey: 'productVariant.getMany',
		fields: paginationFields(PRODUCT_VARIANT_SORT_OPTIONS),
	},
	{
		resource: 'productVariant',
		value: 'update',
		name: 'Update',
		description: 'Update a product variant',
		registryKey: 'productVariant.update',
		fields: [
			gidField('productId', 'Product ID', 'Global product ID in Shopify'),
			gidField('variantId', 'Variant ID', 'Global variant ID in Shopify'),
			...productVariantBaseFields(),
		],
		supportsMetafields: true,
	},
	{
		resource: 'productVariant',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a product variant',
		registryKey: 'productVariant.delete',
		fields: [
			gidField('productId', 'Product ID', 'Global product ID in Shopify'),
			gidField('variantId', 'Variant ID', 'Global variant ID in Shopify'),
		],
	},
];
