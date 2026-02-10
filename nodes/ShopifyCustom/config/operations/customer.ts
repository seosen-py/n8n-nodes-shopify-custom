import type { INodeProperties } from 'n8n-workflow';
import { gidField, paginationFields, readMetafieldsFields, TAGS_FIELD } from './common';
import type { IShopifyOperationConfig } from './types';

const CUSTOMER_SORT_OPTIONS = [
	{ name: 'ID', value: 'ID' },
	{ name: 'Created At', value: 'CREATED_AT' },
	{ name: 'Last Order Date', value: 'LAST_ORDER_DATE' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
];

function customerBaseFields(isCreate: boolean): INodeProperties[] {
	return [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
			required: isCreate,
		},
		{
			displayName: 'Phone',
			name: 'phone',
			type: 'string',
			default: '',
		},
		{
			displayName: 'First Name',
			name: 'firstName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Last Name',
			name: 'lastName',
			type: 'string',
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
		{
			displayName: 'Tax Exempt',
			name: 'taxExempt',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Accepts Marketing',
			name: 'acceptsMarketing',
			type: 'boolean',
			default: false,
		},
		TAGS_FIELD,
	];
}

export const CUSTOMER_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'customer',
		value: 'create',
		name: 'Create',
		description: 'Create a customer',
		registryKey: 'customer.create',
		fields: customerBaseFields(true),
		supportsMetafields: true,
	},
	{
		resource: 'customer',
		value: 'get',
		name: 'Get',
		description: 'Get a customer by ID',
		registryKey: 'customer.get',
		fields: [gidField('customerId', 'Customer ID', 'Global customer ID in Shopify'), ...readMetafieldsFields()],
	},
	{
		resource: 'customer',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many customers',
		registryKey: 'customer.getMany',
		fields: paginationFields(CUSTOMER_SORT_OPTIONS),
	},
	{
		resource: 'customer',
		value: 'update',
		name: 'Update',
		description: 'Update a customer',
		registryKey: 'customer.update',
		fields: [gidField('customerId', 'Customer ID', 'Global customer ID in Shopify'), ...customerBaseFields(false)],
		supportsMetafields: true,
	},
	{
		resource: 'customer',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a customer',
		registryKey: 'customer.delete',
		fields: [gidField('customerId', 'Customer ID', 'Global customer ID in Shopify')],
	},
];
