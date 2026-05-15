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

function orderReadOptionFields(): INodeProperties[] {
	return [
		{
			displayName: 'Order Details',
			name: 'orderReadOptions',
			type: 'collection',
			placeholder: 'Add detail option',
			default: {},
			options: [
				{
					displayName: 'Detail Groups',
					name: 'detailGroups',
					type: 'multiOptions',
					default: [
						'customer',
						'discountApplications',
						'fulfillments',
						'lineItems',
						'refunds',
						'returns',
						'risk',
						'shippingLines',
						'transactions',
					],
					description: 'Additional order field groups to include in the response',
					options: [
						{ name: 'Customer', value: 'customer' },
						{ name: 'Discount Applications', value: 'discountApplications' },
						{ name: 'Fulfillments', value: 'fulfillments' },
						{ name: 'Line Items', value: 'lineItems' },
						{ name: 'Refunds', value: 'refunds' },
						{ name: 'Returns', value: 'returns' },
						{ name: 'Risk Assessment', value: 'risk' },
						{ name: 'Shipping Lines', value: 'shippingLines' },
						{ name: 'Transactions', value: 'transactions' },
					],
				},
				{
					displayName: 'Discount Applications Limit',
					name: 'discountApplicationsLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['discountApplications'],
						},
					},
				},
				{
					displayName: 'Fulfillment Line Items Limit',
					name: 'fulfillmentLineItemsLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['fulfillments'],
						},
					},
				},
				{
					displayName: 'Fulfillments Limit',
					name: 'fulfillmentsLimit',
					type: 'number',
					default: 25,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['fulfillments'],
						},
					},
				},
				{
					displayName: 'Line Items Limit',
					name: 'lineItemsLimit',
					type: 'number',
					default: 100,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['lineItems'],
						},
					},
				},
				{
					displayName: 'Refund Line Items Limit',
					name: 'refundLineItemsLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['refunds'],
						},
					},
				},
				{
					displayName: 'Refunds Limit',
					name: 'refundsLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['refunds'],
						},
					},
				},
				{
					displayName: 'Return Line Items Limit',
					name: 'returnLineItemsLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['returns'],
						},
					},
				},
				{
					displayName: 'Returns Limit',
					name: 'returnsLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['returns'],
						},
					},
				},
				{
					displayName: 'Shipping Lines Limit',
					name: 'shippingLinesLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['shippingLines'],
						},
					},
				},
				{
					displayName: 'Transactions Limit',
					name: 'transactionsLimit',
					type: 'number',
					default: 50,
					typeOptions: {
						minValue: 1,
						maxValue: 250,
					},
					displayOptions: {
						show: {
							detailGroups: ['transactions'],
						},
					},
				},
			],
		},
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
		fields: [
			gidField('orderId', 'Order ID', 'Global order ID in Shopify'),
			...readMetafieldsFields(),
			...orderReadOptionFields(),
		],
	},
	{
		resource: 'order',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many orders',
		registryKey: 'order.getMany',
		fields: [...paginationFields(ORDER_SORT_OPTIONS), ...orderReadOptionFields()],
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
