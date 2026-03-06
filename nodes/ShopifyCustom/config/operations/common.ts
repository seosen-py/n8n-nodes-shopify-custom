import type { INodeProperties } from 'n8n-workflow';
import type { ShopifyResourceValue } from '../resources';
import type { ShopifyOperationValue } from './types';

export function operationDisplayOptions(
	resource: ShopifyResourceValue,
	operation: ShopifyOperationValue,
): INodeProperties['displayOptions'] {
	return {
		show: {
			resource: [resource],
			operation: [operation],
		},
	};
}

export function gidField(
	name: string,
	displayName: string,
	description: string,
	required = true,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required,
		description,
		placeholder: 'gid://shopify/...',
	};
}

export function paginationFields(sortOptions: Array<{ name: string; value: string }>): INodeProperties[] {
	return [
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
					displayName: 'Metafields',
					name: 'metafields',
					type: 'collection',
					placeholder: 'Add metafields options',
					default: {},
					options: [
						{
							displayName: 'Include Metafields',
							name: 'includeMetafields',
							type: 'boolean',
							default: false,
							description: 'Whether to also fetch metafields and their values',
						},
						{
							displayName: 'Metafield Definition Names or IDs',
							name: 'selectedMetafields',
							type: 'multiOptions',
							description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							typeOptions: {
								loadOptionsMethod: 'getMetafieldDefinitionsForCurrentContext',
								loadOptionsDependsOn: ['resource', 'ownerType'],
							},
							default: [],
							displayOptions: {
								show: {
									includeMetafields: [true],
								},
							},
						},
						{
							displayName: 'Resolve Metafield References',
							name: 'resolveMetafieldReferences',
							type: 'boolean',
							default: false,
							description: 'Whether to resolve references for reference metafield types',
							displayOptions: {
								show: {
									includeMetafields: [true],
								},
							},
						},
					],
				},
				{
					displayName: 'Search Query',
					name: 'query',
					type: 'string',
					default: '',
					description: 'Shopify search syntax query',
				},
				{
					displayName: 'Sorting',
					name: 'sorting',
					type: 'collection',
					placeholder: 'Add sorting options',
					default: {},
					options: [
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
							options: sortOptions,
							default: 'ID',
						},
					],
				},
			],
		},
	];
}

export function readMetafieldsFields(): INodeProperties[] {
	return [
		{
			displayName: 'Include Metafields',
			name: 'includeMetafields',
			type: 'boolean',
			default: false,
			description: 'Whether to also fetch metafields and their values',
		},
		{
			displayName: 'Metafield Definition Names or IDs',
			name: 'selectedMetafields',
			type: 'multiOptions',
			description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getMetafieldDefinitionsForCurrentContext',
				loadOptionsDependsOn: ['resource', 'ownerType'],
			},
			default: [],
			displayOptions: {
				show: {
					includeMetafields: [true],
				},
			},
		},
		{
			displayName: 'Resolve Metafield References',
			name: 'resolveMetafieldReferences',
			type: 'boolean',
			default: false,
			description: 'Whether to resolve references for reference metafield types',
			displayOptions: {
				show: {
					includeMetafields: [true],
				},
			},
		},
	];
}

export function seoFields(): INodeProperties[] {
	return [
		{
			displayName: 'Meta Title',
			name: 'seoTitle',
			type: 'string',
			default: '',
			description: 'SEO title shown in search engines',
		},
		{
			displayName: 'Meta Description',
			name: 'seoDescription',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			default: '',
			description: 'SEO description shown in search engines',
		},
	];
}

export function templateSuffixTextField(
	templateName: 'product' | 'collection' | 'article' | 'blog',
): INodeProperties {
	return {
		displayName: 'Template Suffix',
		name: 'templateSuffix',
		type: 'string',
		default: '',
		placeholder: 'custom',
		description: `Leave empty to use the default template. Find suffix in Shopify Admin -> Online Store -> Themes -> Edit code -> templates (for example, ${templateName}.custom.JSON => custom).`,
	};
}

export const TAGS_FIELD: INodeProperties = {
	displayName: 'Tags',
	name: 'tags',
	type: 'string',
	default: '',
	description: 'Comma-separated tags',
};
