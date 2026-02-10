import type { INodeProperties } from 'n8n-workflow';
import { gidField } from './common';
import type { IShopifyOperationConfig } from './types';

const METAOBJECT_SORT_OPTIONS = [
	{ name: 'Display Name', value: 'display_name' },
	{ name: 'ID', value: 'id' },
	{ name: 'Type', value: 'type' },
	{ name: 'Updated At', value: 'updated_at' },
];

const METAOBJECT_FIELDS_COLLECTION: INodeProperties = {
	displayName: 'Fields',
	name: 'metaobjectFields',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'items',
			displayName: 'Field',
			values: [
				{
					displayName: 'Key',
					name: 'key',
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

function metaobjectCreateFields(): INodeProperties[] {
	return [
		{
			displayName: 'Type',
			name: 'metaobjectType',
			type: 'string',
			default: '',
			required: true,
			description: 'Metaobject definition type',
		},
		{
			displayName: 'Handle',
			name: 'handle',
			type: 'string',
			default: '',
		},
		METAOBJECT_FIELDS_COLLECTION,
	];
}

function metaobjectGetManyFields(): INodeProperties[] {
	return [
		{
			displayName: 'Type',
			name: 'metaobjectType',
			type: 'string',
			default: '',
			required: true,
			description: 'Metaobject definition type',
		},
		{
			displayName: 'Get All',
			name: 'getAll',
			type: 'boolean',
			default: true,
			description: 'Whether to fetch all pages',
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
		{
			displayName: 'Options',
			name: 'paginationOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Cursor',
					name: 'afterCursor',
					type: 'string',
					default: '',
					description: 'Use to continue from a specific cursor',
				},
				{
					displayName: 'Query',
					name: 'query',
					type: 'string',
					default: '',
					description: 'Search query for metaobjects',
				},
				{
					displayName: 'Reverse',
					name: 'reverse',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'Sort By',
					name: 'sortKey',
					type: 'options',
					options: METAOBJECT_SORT_OPTIONS,
					default: 'updated_at',
				},
			],
		},
	];
}

export const METAOBJECT_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'metaobject',
		value: 'create',
		name: 'Create',
		description: 'Create a metaobject',
		registryKey: 'metaobject.create',
		fields: metaobjectCreateFields(),
	},
	{
		resource: 'metaobject',
		value: 'get',
		name: 'Get',
		description: 'Get a metaobject by ID',
		registryKey: 'metaobject.get',
		fields: [gidField('metaobjectId', 'Metaobject ID', 'Global metaobject ID in Shopify')],
	},
	{
		resource: 'metaobject',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many metaobjects by type',
		registryKey: 'metaobject.getMany',
		fields: metaobjectGetManyFields(),
	},
	{
		resource: 'metaobject',
		value: 'update',
		name: 'Update',
		description: 'Update a metaobject',
		registryKey: 'metaobject.update',
		fields: [
			gidField('metaobjectId', 'Metaobject ID', 'Global metaobject ID in Shopify'),
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
			},
			METAOBJECT_FIELDS_COLLECTION,
			{
				displayName: 'Options',
				name: 'metaobjectOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Redirect New Handle',
						name: 'redirectNewHandle',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	},
	{
		resource: 'metaobject',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a metaobject',
		registryKey: 'metaobject.delete',
		fields: [gidField('metaobjectId', 'Metaobject ID', 'Global metaobject ID in Shopify')],
	},
];

