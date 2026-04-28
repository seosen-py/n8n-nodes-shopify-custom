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
							includeDiscountApplications: [true],
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
							includeFulfillments: [true],
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
							includeFulfillments: [true],
						},
					},
				},
				{
					displayName: 'Include Customer',
					name: 'includeCustomer',
					type: 'boolean',
					default: true,
					description: 'Whether to include the related customer object',
				},
				{
					displayName: 'Include Discount Applications',
					name: 'includeDiscountApplications',
					type: 'boolean',
					default: true,
					description: 'Whether to include order-level discount applications',
				},
				{
					displayName: 'Include Fulfillments',
					name: 'includeFulfillments',
					type: 'boolean',
					default: true,
					description: 'Whether to include fulfillments, tracking, fulfillment service, and location details',
				},
				{
					displayName: 'Include Line Items',
					name: 'includeLineItems',
					type: 'boolean',
					default: true,
					description: 'Whether to include order line items with pricing, tax, product, and variant details',
				},
				{
					displayName: 'Include Refunds',
					name: 'includeRefunds',
					type: 'boolean',
					default: true,
					description: 'Whether to include refunds and refund line items',
				},
				{
					displayName: 'Include Returns',
					name: 'includeReturns',
					type: 'boolean',
					default: true,
					description: 'Whether to include returns and return line items',
				},
				{
					displayName: 'Include Risk Assessment',
					name: 'includeRisk',
					type: 'boolean',
					default: true,
					description: 'Whether to include Shopify order risk assessment data',
				},
				{
					displayName: 'Include Shipping Lines',
					name: 'includeShippingLines',
					type: 'boolean',
					default: true,
					description: 'Whether to include shipping lines and their taxes',
				},
				{
					displayName: 'Include Transactions',
					name: 'includeTransactions',
					type: 'boolean',
					default: true,
					description: 'Whether to include order transactions',
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
							includeLineItems: [true],
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
							includeRefunds: [true],
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
							includeRefunds: [true],
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
							includeReturns: [true],
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
							includeReturns: [true],
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
							includeShippingLines: [true],
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
							includeTransactions: [true],
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
