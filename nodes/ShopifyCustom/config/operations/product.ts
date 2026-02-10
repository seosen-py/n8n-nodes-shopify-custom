import type { INodeProperties } from 'n8n-workflow';
import {
	gidField,
	paginationFields,
	readMetafieldsFields,
	seoFields,
	TAGS_FIELD,
	templateSuffixTextField,
} from './common';
import type { IShopifyOperationConfig } from './types';

const PRODUCT_SORT_OPTIONS = [
	{ name: 'ID', value: 'ID' },
	{ name: 'Created At', value: 'CREATED_AT' },
	{ name: 'Title', value: 'TITLE' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
	{ name: 'Inventory Total', value: 'INVENTORY_TOTAL' },
];

function productCreateFields(): INodeProperties[] {
	return [
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Handle',
			name: 'handle',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Description HTML',
			name: 'descriptionHtml',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
		},
		...seoFields(),
		templateSuffixTextField('product'),
		{
			displayName: 'Vendor',
			name: 'vendor',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Product Type',
			name: 'productType',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			options: [
				{ name: 'Active', value: 'ACTIVE' },
				{ name: 'Draft', value: 'DRAFT' },
				{ name: 'Archived', value: 'ARCHIVED' },
			],
			default: 'DRAFT',
		},
		TAGS_FIELD,
	];
}

function productUpdateFields(): INodeProperties[] {
	return [
		gidField('productId', 'Product ID', 'Global product ID in Shopify'),
		...productCreateFields().map((field) => ({
			...field,
			required: false,
		})),
	];
}

export const PRODUCT_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'product',
		value: 'create',
		name: 'Create',
		description: 'Create a product',
		registryKey: 'product.create',
		fields: productCreateFields(),
		supportsMetafields: true,
	},
	{
		resource: 'product',
		value: 'get',
		name: 'Get',
		description: 'Get a product by ID',
		registryKey: 'product.get',
		fields: [
			gidField('productId', 'Product ID', 'Global product ID in Shopify'),
			...readMetafieldsFields(),
		],
	},
	{
		resource: 'product',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many products',
		registryKey: 'product.getMany',
		fields: paginationFields(PRODUCT_SORT_OPTIONS),
	},
	{
		resource: 'product',
		value: 'update',
		name: 'Update',
		description: 'Update a product',
		registryKey: 'product.update',
		fields: productUpdateFields(),
		supportsMetafields: true,
	},
	{
		resource: 'product',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a product',
		registryKey: 'product.delete',
		fields: [gidField('productId', 'Product ID', 'Global product ID in Shopify')],
	},
];
