import type { INodeProperties } from 'n8n-workflow';
import { gidField, paginationFields, readMetafieldsFields, TAGS_FIELD } from './common';
import type { IShopifyOperationConfig } from './types';

const DRAFT_ORDER_SORT_OPTIONS = [
	{ name: 'ID', value: 'ID' },
	{ name: 'Created At', value: 'CREATED_AT' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
	{ name: 'Number', value: 'NUMBER' },
];

const draftLineItemsField: INodeProperties = {
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

function draftOrderBaseFields(): INodeProperties[] {
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

export const DRAFT_ORDER_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'draftOrder',
		value: 'create',
		name: 'Create',
		description: 'Create a draft order',
		registryKey: 'draftOrder.create',
		fields: [...draftOrderBaseFields(), draftLineItemsField],
		supportsMetafields: true,
	},
	{
		resource: 'draftOrder',
		value: 'get',
		name: 'Get',
		description: 'Get a draft order by ID',
		registryKey: 'draftOrder.get',
		fields: [
			gidField('draftOrderId', 'Draft Order ID', 'Global draft order ID in Shopify'),
			...readMetafieldsFields(),
		],
	},
	{
		resource: 'draftOrder',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many draft orders',
		registryKey: 'draftOrder.getMany',
		fields: paginationFields(DRAFT_ORDER_SORT_OPTIONS),
	},
	{
		resource: 'draftOrder',
		value: 'update',
		name: 'Update',
		description: 'Update a draft order',
		registryKey: 'draftOrder.update',
		fields: [
			gidField('draftOrderId', 'Draft Order ID', 'Global draft order ID in Shopify'),
			...draftOrderBaseFields(),
			draftLineItemsField,
		],
		supportsMetafields: true,
	},
	{
		resource: 'draftOrder',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a draft order',
		registryKey: 'draftOrder.delete',
		fields: [gidField('draftOrderId', 'Draft Order ID', 'Global draft order ID in Shopify')],
	},
];
