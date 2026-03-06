import type { INodeProperties } from 'n8n-workflow';
import { gidField } from './common';
import type { IShopifyOperationConfig } from './types';

const OWNER_TYPE_OPTIONS = [
	{ name: 'Article', value: 'ARTICLE' },
	{ name: 'Blog', value: 'BLOG' },
	{ name: 'Product', value: 'PRODUCT' },
	{ name: 'Product Variant', value: 'PRODUCTVARIANT' },
	{ name: 'Collection', value: 'COLLECTION' },
	{ name: 'Customer', value: 'CUSTOMER' },
	{ name: 'Order', value: 'ORDER' },
	{ name: 'Draft Order', value: 'DRAFTORDER' },
];

const validationsField: INodeProperties = {
	displayName: 'Validations',
	name: 'validations',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'items',
			displayName: 'Validation',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					required: true,
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					required: true,
				},
			],
		},
	],
};

export const METAFIELD_DEFINITION_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'metafieldDefinition',
		value: 'list',
		name: 'List',
		description: 'List metafield definitions',
		registryKey: 'metafieldDefinition.list',
		fields: [
			{
				displayName: 'Owner Type',
				name: 'ownerType',
				type: 'options',
				options: OWNER_TYPE_OPTIONS,
				default: 'PRODUCT',
			},
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Get All',
				name: 'getAll',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				description: 'Max number of results to return',
				default: 50,
				typeOptions: {
					minValue: 1,
					maxValue: 250,
				},
				displayOptions: {
					show: {
						getAll: [false],
					},
				},
			},
		],
	},
	{
		resource: 'metafieldDefinition',
		value: 'get',
		name: 'Get',
		description: 'Get metafield definition by ID',
		registryKey: 'metafieldDefinition.get',
		fields: [gidField('definitionId', 'Definition ID', 'Global definition ID in Shopify')],
	},
	{
		resource: 'metafieldDefinition',
		value: 'create',
		name: 'Create',
		description: 'Create metafield definition',
		registryKey: 'metafieldDefinition.create',
		fields: [
			{
				displayName: 'Owner Type',
				name: 'ownerType',
				type: 'options',
				options: OWNER_TYPE_OPTIONS,
				default: 'PRODUCT',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Namespace',
				name: 'namespace',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Type Name or ID',
				name: 'definitionType',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getMetafieldDefinitionTypes',
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			validationsField,
		],
	},
	{
		resource: 'metafieldDefinition',
		value: 'update',
		name: 'Update',
		description: 'Update metafield definition',
		registryKey: 'metafieldDefinition.update',
		fields: [
			gidField('definitionId', 'Definition ID', 'Global definition ID in Shopify'),
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			validationsField,
		],
	},
	{
		resource: 'metafieldDefinition',
		value: 'delete',
		name: 'Delete',
		description: 'Delete metafield definition',
		registryKey: 'metafieldDefinition.delete',
		fields: [
			gidField('definitionId', 'Definition ID', 'Global definition ID in Shopify'),
			{
				displayName: 'Delete All Associated Metafields',
				name: 'deleteAllAssociatedMetafields',
				type: 'boolean',
				default: false,
			},
		],
	},
];
