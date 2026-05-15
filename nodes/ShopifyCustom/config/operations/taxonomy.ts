import type { INodeProperties } from 'n8n-workflow';
import { gidField, returnFieldsField } from './common';
import type { IShopifyOperationConfig } from './types';

function taxonomyPaginationFields(): INodeProperties[] {
	return [
		{
			displayName: 'Get All',
			name: 'getAll',
			type: 'boolean',
			default: false,
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
			name: 'taxonomyOptions',
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
			],
		},
	];
}

function taxonomyCategoryIdField(
	name = 'categoryId',
	displayName = 'Category ID',
): INodeProperties {
	return gidField(
		name,
		displayName,
		'Global taxonomy category ID in Shopify',
	);
}

const TAXONOMY_RETURN_FIELD_OPTIONS = [
	{ name: 'Ancestor IDs', value: 'ancestorIds' },
	{ name: 'Children IDs', value: 'childrenIds' },
	{ name: 'Parent ID', value: 'parentId' },
];

const TAXONOMY_DEFAULT_RETURN_FIELDS = ['ancestorIds', 'childrenIds', 'parentId'];

export const TAXONOMY_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'taxonomy',
		value: 'searchCategories',
		name: 'Search Categories',
		description: 'Search Shopify product taxonomy categories',
		registryKey: 'taxonomy.searchCategories',
		fields: [
			{
				displayName: 'Search Query',
				name: 'search',
				type: 'string',
				default: '',
				required: true,
				description: 'Text to search in Shopify product taxonomy categories',
			},
			returnFieldsField(TAXONOMY_RETURN_FIELD_OPTIONS, TAXONOMY_DEFAULT_RETURN_FIELDS),
			...taxonomyPaginationFields(),
		],
	},
	{
		resource: 'taxonomy',
		value: 'getRootCategories',
		name: 'Get Root Categories',
		description: 'Get top-level Shopify product taxonomy categories',
		registryKey: 'taxonomy.getRootCategories',
		fields: [
			returnFieldsField(TAXONOMY_RETURN_FIELD_OPTIONS, TAXONOMY_DEFAULT_RETURN_FIELDS),
			...taxonomyPaginationFields(),
		],
	},
	{
		resource: 'taxonomy',
		value: 'getChildren',
		name: 'Get Children',
		description: 'Get child categories for a Shopify taxonomy category',
		registryKey: 'taxonomy.getChildren',
		fields: [
			taxonomyCategoryIdField(),
			returnFieldsField(TAXONOMY_RETURN_FIELD_OPTIONS, TAXONOMY_DEFAULT_RETURN_FIELDS),
			...taxonomyPaginationFields(),
		],
	},
	{
		resource: 'taxonomy',
		value: 'getDescendants',
		name: 'Get Descendants',
		description: 'Get descendant categories for a Shopify taxonomy category',
		registryKey: 'taxonomy.getDescendants',
		fields: [
			taxonomyCategoryIdField(),
			returnFieldsField(TAXONOMY_RETURN_FIELD_OPTIONS, TAXONOMY_DEFAULT_RETURN_FIELDS),
			...taxonomyPaginationFields(),
		],
	},
	{
		resource: 'taxonomy',
		value: 'get',
		name: 'Get Category',
		description: 'Get a Shopify taxonomy category by ID',
		registryKey: 'taxonomy.get',
		fields: [
			taxonomyCategoryIdField(),
			returnFieldsField(TAXONOMY_RETURN_FIELD_OPTIONS, TAXONOMY_DEFAULT_RETURN_FIELDS),
		],
	},
	{
		resource: 'taxonomy',
		value: 'getCategoryAttributes',
		name: 'Get Category Attributes',
		description: 'Get product attributes for a Shopify taxonomy category',
		registryKey: 'taxonomy.getCategoryAttributes',
		fields: [
			taxonomyCategoryIdField(),
			returnFieldsField(TAXONOMY_RETURN_FIELD_OPTIONS, TAXONOMY_DEFAULT_RETURN_FIELDS),
			{
				displayName: 'Attribute Limit',
				name: 'attributeLimit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
					maxValue: 250,
				},
			},
			{
				displayName: 'Value Limit',
				name: 'valueLimit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
					maxValue: 250,
				},
				description: 'Max number of values to return for choice-list attributes',
			},
		],
	},
];
