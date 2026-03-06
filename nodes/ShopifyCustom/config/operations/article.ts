import type { INodeProperties } from 'n8n-workflow';
import {
	gidField,
	paginationFields,
	readMetafieldsFields,
	TAGS_FIELD,
	templateSuffixTextField,
} from './common';
import type { IShopifyOperationConfig } from './types';

const ARTICLE_SORT_OPTIONS = [
	{ name: 'ID', value: 'ID' },
	{ name: 'Author', value: 'AUTHOR' },
	{ name: 'Blog Title', value: 'BLOG_TITLE' },
	{ name: 'Published At', value: 'PUBLISHED_AT' },
	{ name: 'Title', value: 'TITLE' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
];

function articleAuthorFields(required: boolean): INodeProperties[] {
	return [
		{
			displayName: 'Author Source',
			name: 'authorSource',
			type: 'options',
			options: [
				{ name: 'Author Name', value: 'name' },
				{ name: 'Staff User ID', value: 'userId' },
			],
			default: 'name',
		},
		{
			displayName: 'Author Name',
			name: 'authorName',
			type: 'string',
			default: '',
			required,
			displayOptions: {
				show: {
					authorSource: ['name'],
				},
			},
		},
		{
			displayName: 'Author User ID',
			name: 'authorUserId',
			type: 'string',
			default: '',
			required,
			placeholder: 'gid://shopify/StaffMember/...',
			description: 'Global staff user ID in Shopify',
			displayOptions: {
				show: {
					authorSource: ['userId'],
				},
			},
		},
	];
}

function articleBaseFields(
	requiredBlogId: boolean,
	requiredTitle: boolean,
	requiredAuthor: boolean,
): INodeProperties[] {
	return [
		{
			displayName: 'Blog ID',
			name: 'blogId',
			type: 'string',
			default: '',
			required: requiredBlogId,
			placeholder: 'gid://shopify/Blog/...',
			description: 'Global blog ID in Shopify',
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			required: requiredTitle,
		},
		...articleAuthorFields(requiredAuthor),
		{
			displayName: 'Handle',
			name: 'handle',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Body HTML',
			name: 'body',
			type: 'string',
			typeOptions: {
				rows: 6,
			},
			default: '',
		},
		{
			displayName: 'Summary HTML',
			name: 'summary',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
		},
		{
			displayName: 'Publish Date',
			name: 'publishDate',
			type: 'dateTime',
			default: '',
			description: 'ISO date and time when the article should become visible',
		},
		TAGS_FIELD,
		templateSuffixTextField('article'),
	];
}

export const ARTICLE_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'article',
		value: 'create',
		name: 'Create',
		description: 'Create a blog article',
		registryKey: 'article.create',
		fields: [
			...articleBaseFields(true, true, true),
			{
				displayName: 'Is Published',
				name: 'isPublished',
				type: 'boolean',
				default: false,
				description: 'Whether the article should be visible immediately',
			},
		],
		supportsMetafields: true,
	},
	{
		resource: 'article',
		value: 'get',
		name: 'Get',
		description: 'Get an article by ID',
		registryKey: 'article.get',
		fields: [
			gidField('articleId', 'Article ID', 'Global article ID in Shopify'),
			...readMetafieldsFields(),
		],
	},
	{
		resource: 'article',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many articles',
		registryKey: 'article.getMany',
		fields: paginationFields(ARTICLE_SORT_OPTIONS),
	},
	{
		resource: 'article',
		value: 'update',
		name: 'Update',
		description: 'Update a blog article',
		registryKey: 'article.update',
		fields: [
			gidField('articleId', 'Article ID', 'Global article ID in Shopify'),
			...articleBaseFields(false, false, false),
			{
				displayName: 'Options',
				name: 'articleOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Is Published',
						name: 'isPublished',
						type: 'boolean',
						default: false,
						description: 'Whether to update article visibility',
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
		resource: 'article',
		value: 'delete',
		name: 'Delete',
		description: 'Delete a blog article',
		registryKey: 'article.delete',
		fields: [gidField('articleId', 'Article ID', 'Global article ID in Shopify')],
	},
];
