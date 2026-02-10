/* eslint-disable n8n-nodes-base/node-param-fixed-collection-type-unsorted-items */

import type { INodeProperties } from 'n8n-workflow';
import {
	gidField,
	paginationFields,
	readMetafieldsFields,
	seoFields,
	templateSuffixTextField,
} from './common';
import type { IShopifyOperationConfig } from './types';

const COLLECTION_SORT_OPTIONS = [
	{ name: 'ID', value: 'ID' },
	{ name: 'Title', value: 'TITLE' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
	{ name: 'Products Count', value: 'PRODUCTS_COUNT' },
];

const COLLECTION_TYPE_OPTIONS = [
	{ name: 'Manual Collection', value: 'manual' },
	{ name: 'Smart Collection', value: 'smart' },
];

const SMART_RULE_MATCH_OPTIONS = [
	{ name: 'All Rules (AND)', value: 'all' },
	{ name: 'Any Rule (OR)', value: 'any' },
];

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function metafieldRuleValueTypeDisplay(valueType: string): INodeProperties['displayOptions'] {
	return {
		show: {
			ruleSource: ['metafield'],
			metafieldRule: [
				{
					_cnd: {
						regex: `"valueType":"${escapeRegex(valueType)}"`,
					},
				},
			],
		},
	};
}

function collectionBaseFields(): INodeProperties[] {
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
			typeOptions: {
				rows: 4,
			},
			default: '',
		},
		...seoFields(),
		templateSuffixTextField('collection'),
	];
}

function collectionCreateFields(): INodeProperties[] {
	return [
		...collectionBaseFields(),
		{
			displayName: 'Collection Type',
			name: 'collectionType',
			type: 'options',
			options: COLLECTION_TYPE_OPTIONS,
			default: 'manual',
		},
		{
			displayName: 'Products',
			name: 'manualProducts',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			description: 'Select products for a manual collection',
			default: {},
			options: [
				{
					name: 'items',
					displayName: 'Product',
					values: [
						{
							displayName: 'Product ID',
							name: 'productId',
							type: 'string',
							default: '',
							placeholder: 'gid://shopify/Product/...',
							description: 'Global product ID in Shopify',
						},
					],
				},
			],
			displayOptions: {
				show: {
					collectionType: ['manual'],
				},
			},
		},
		{
			displayName: 'Rule Match Mode',
			name: 'smartRuleMatchMode',
			type: 'options',
			options: SMART_RULE_MATCH_OPTIONS,
			default: 'all',
			displayOptions: {
				show: {
					collectionType: ['smart'],
				},
			},
		},
		{
			displayName: 'Rules',
			name: 'collectionRules',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'items',
					displayName: 'Rule',
					values: [
						{
							displayName: 'Rule Source',
							name: 'ruleSource',
							type: 'options',
							options: [
								{ name: 'Native Field', value: 'native' },
								{ name: 'Metafield', value: 'metafield' },
							],
							default: 'native',
							required: true,
						},
						{
							displayName: 'Native Rule Type Name or ID',
							name: 'nativeRuleType',
							type: 'options',
							description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							typeOptions: {
								loadOptionsMethod: 'getCollectionNativeRuleTypeOptions',
								loadOptionsDependsOn: ['resource', 'ruleSource'],
							},
							default: '',
							options: [],
							required: true,
							displayOptions: {
								show: {
									ruleSource: ['native'],
								},
							},
						},
						{
							displayName: 'Metafield Name or ID',
							name: 'metafieldRule',
							type: 'options',
							description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							typeOptions: {
								loadOptionsMethod: 'getCollectionMetafieldRuleOptions',
								loadOptionsDependsOn: ['resource', 'ruleSource'],
							},
							default: '',
							options: [],
							required: true,
							displayOptions: {
								show: {
									ruleSource: ['metafield'],
								},
							},
						},
						{
							displayName: 'Condition Name or ID',
							name: 'nativeRelation',
							type: 'options',
							description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							typeOptions: {
								loadOptionsMethod: 'getCollectionRuleRelationOptions',
								loadOptionsDependsOn: ['resource', 'ruleSource', 'nativeRuleType'],
							},
							default: '',
							options: [],
							required: true,
							displayOptions: {
								show: {
									ruleSource: ['native'],
								},
							},
						},
						{
							displayName: 'Value',
							name: 'nativeValue',
							type: 'string',
							default: '',
							required: true,
							description: 'Rule value to match',
							displayOptions: {
								show: {
									ruleSource: ['native'],
								},
							},
						},
						{
							displayName: 'Value',
							name: 'metafieldValueText',
							type: 'string',
							default: '',
							required: true,
							description: 'Text value for the selected metafield condition',
							displayOptions: metafieldRuleValueTypeDisplay('text'),
						},
						{
							displayName: 'Value',
							name: 'metafieldValueNumber',
							type: 'number',
							default: 0,
							required: true,
							description: 'Numeric value for the selected metafield condition',
							displayOptions: metafieldRuleValueTypeDisplay('number'),
						},
						{
							displayName: 'Value',
							name: 'metafieldValueBoolean',
							type: 'boolean',
							default: false,
							required: true,
							description: 'Whether the selected metafield condition should be true or false',
							displayOptions: metafieldRuleValueTypeDisplay('boolean'),
						},
						{
							displayName: 'Value',
							name: 'metafieldValueMetaobjectId',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'gid://shopify/Metaobject/1234567890',
							description: 'Metaobject record GID value',
							displayOptions: metafieldRuleValueTypeDisplay('metaobject_reference'),
						},
					],
				},
			],
			displayOptions: {
				show: {
					collectionType: ['smart'],
				},
			},
		},
	];
}

export const COLLECTION_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'collection',
		value: 'create',
		name: 'Create',
		description: 'Create a collection',
		registryKey: 'collection.create',
		fields: collectionCreateFields(),
		supportsMetafields: true,
	},
	{
		resource: 'collection',
		value: 'get',
		name: 'Get',
		description: 'Get a collection by ID',
		registryKey: 'collection.get',
		fields: [
			gidField('collectionId', 'Collection ID', 'Global collection ID in Shopify'),
			...readMetafieldsFields(),
		],
	},
	{
		resource: 'collection',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many collections',
		registryKey: 'collection.getMany',
		fields: paginationFields(COLLECTION_SORT_OPTIONS),
	},
	{
		resource: 'collection',
		value: 'update',
		name: 'Update',
		description: 'Update a collection',
		registryKey: 'collection.update',
		fields: [
			gidField('collectionId', 'Collection ID', 'Global collection ID in Shopify'),
			...collectionBaseFields().map((field) => ({ ...field, required: false })),
		],
		supportsMetafields: true,
	},
	{
		resource: 'collection',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a collection',
		registryKey: 'collection.delete',
		fields: [gidField('collectionId', 'Collection ID', 'Global collection ID in Shopify')],
	},
];
