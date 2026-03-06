import type { INodeProperties } from 'n8n-workflow';
import {
	gidField,
	paginationFields,
	readMetafieldsFields,
	templateSuffixTextField,
} from './common';
import type { IShopifyOperationConfig } from './types';

const BLOG_SORT_OPTIONS = [
	{ name: 'Handle', value: 'HANDLE' },
	{ name: 'ID', value: 'ID' },
	{ name: 'Title', value: 'TITLE' },
];

const COMMENT_POLICY_OPTIONS = [
	{ name: 'Auto Published', value: 'AUTO_PUBLISHED' },
	{ name: 'Closed', value: 'CLOSED' },
	{ name: 'Moderated', value: 'MODERATED' },
];

function blogBaseFields(requiredTitle: boolean): INodeProperties[] {
	return [
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			required: requiredTitle,
		},
		{
			displayName: 'Handle',
			name: 'handle',
			type: 'string',
			default: '',
		},
		templateSuffixTextField('blog'),
	];
}

export const BLOG_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'blog',
		value: 'create',
		name: 'Create',
		description: 'Create a blog',
		registryKey: 'blog.create',
		fields: [
			...blogBaseFields(true),
			{
				displayName: 'Options',
				name: 'blogOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Comment Policy',
						name: 'commentPolicy',
						type: 'options',
						options: COMMENT_POLICY_OPTIONS,
						default: 'MODERATED',
					},
				],
			},
		],
		supportsMetafields: true,
	},
	{
		resource: 'blog',
		value: 'get',
		name: 'Get',
		description: 'Get a blog by ID',
		registryKey: 'blog.get',
		fields: [
			gidField('blogId', 'Blog ID', 'Global blog ID in Shopify'),
			...readMetafieldsFields(),
		],
	},
	{
		resource: 'blog',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many blogs',
		registryKey: 'blog.getMany',
		fields: paginationFields(BLOG_SORT_OPTIONS),
	},
	{
		resource: 'blog',
		value: 'update',
		name: 'Update',
		description: 'Update a blog',
		registryKey: 'blog.update',
		fields: [
			gidField('blogId', 'Blog ID', 'Global blog ID in Shopify'),
			...blogBaseFields(false),
			{
				displayName: 'Options',
				name: 'blogOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Comment Policy',
						name: 'commentPolicy',
						type: 'options',
						options: COMMENT_POLICY_OPTIONS,
						default: 'MODERATED',
					},
					{
						displayName: 'Redirect Articles',
						name: 'redirectArticles',
						type: 'boolean',
						default: false,
						description: 'Whether to redirect blog posts automatically',
					},
					{
						displayName: 'Redirect New Handle',
						name: 'redirectNewHandle',
						type: 'boolean',
						default: false,
						description: 'Whether to create a redirect when the handle changes',
					},
				],
			},
		],
		supportsMetafields: true,
	},
	{
		resource: 'blog',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a blog',
		registryKey: 'blog.delete',
		fields: [gidField('blogId', 'Blog ID', 'Global blog ID in Shopify')],
	},
];
