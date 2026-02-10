import type { INodeProperties } from 'n8n-workflow';
import { gidField, paginationFields, readMetafieldsFields, TAGS_FIELD } from './common';
import type { IShopifyOperationConfig } from './types';

const ORDER_SORT_OPTIONS = [
	{ name: 'Processed At', value: 'PROCESSED_AT' },
	{ name: 'Created At', value: 'CREATED_AT' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
	{ name: 'Order Number', value: 'ORDER_NUMBER' },
];

const lineItemsField: INodeProperties = {
	displayName: 'Line Items',
	name: 'lineItems',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'items',
			displayName: 'Item',
			values: [
				{
					displayName: 'Variant ID',
					name: 'variantId',
					type: 'string',
					default: '',
					required: true,
					description: 'Global product variant ID',
				},
				{
					displayName: 'Quantity',
					name: 'quantity',
					type: 'number',
					default: 1,
					typeOptions: {
						minValue: 1,
					},
					required: true,
				},
			],
		},
	],
};

function orderBaseFields(): INodeProperties[] {
	return [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
		{
			displayName: 'Note',
			name: 'note',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
		},
		TAGS_FIELD,
	];
}

export const ORDER_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'order',
		value: 'create',
		name: 'Create',
		description: 'Create an order',
		registryKey: 'order.create',
		fields: [...orderBaseFields(), lineItemsField],
		supportsMetafields: true,
	},
	{
		resource: 'order',
		value: 'get',
		name: 'Get',
		description: 'Get an order by ID',
		registryKey: 'order.get',
		fields: [gidField('orderId', 'Order ID', 'Global order ID in Shopify'), ...readMetafieldsFields()],
	},
	{
		resource: 'order',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many orders',
		registryKey: 'order.getMany',
		fields: paginationFields(ORDER_SORT_OPTIONS),
	},
	{
		resource: 'order',
		value: 'update',
		name: 'Update',
		description: 'Update an order',
		registryKey: 'order.update',
		fields: [gidField('orderId', 'Order ID', 'Global order ID in Shopify'), ...orderBaseFields()],
		supportsMetafields: true,
	},
	{
		resource: 'order',
		value: 'delete',
		name: 'Delete',
		description: 'Delete an order',
		registryKey: 'order.delete',
		fields: [gidField('orderId', 'Order ID', 'Global order ID in Shopify')],
	},
];
