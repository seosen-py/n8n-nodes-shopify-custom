import type { INodeProperties } from 'n8n-workflow';
import { gidField } from './common';
import type { IShopifyOperationConfig } from './types';

const TRANSLATABLE_RESOURCE_TYPE_OPTIONS = [
	{ name: 'Article', value: 'ARTICLE' },
	{ name: 'Article Image', value: 'ARTICLE_IMAGE' },
	{ name: 'Blog', value: 'BLOG' },
	{ name: 'Collection', value: 'COLLECTION' },
	{ name: 'Collection Image', value: 'COLLECTION_IMAGE' },
	{ name: 'Delivery Method Definition', value: 'DELIVERY_METHOD_DEFINITION' },
	{ name: 'Email Template', value: 'EMAIL_TEMPLATE' },
	{ name: 'Filter', value: 'FILTER' },
	{ name: 'Link', value: 'LINK' },
	{ name: 'Media Image', value: 'MEDIA_IMAGE' },
	{ name: 'Menu', value: 'MENU' },
	{ name: 'Metafield', value: 'METAFIELD' },
	{ name: 'Metaobject', value: 'METAOBJECT' },
	{ name: 'Online Store Theme', value: 'ONLINE_STORE_THEME' },
	{ name: 'Online Store Theme App Embed', value: 'ONLINE_STORE_THEME_APP_EMBED' },
	{ name: 'Online Store Theme JSON Template', value: 'ONLINE_STORE_THEME_JSON_TEMPLATE' },
	{
		name: 'Online Store Theme Locale Content',
		value: 'ONLINE_STORE_THEME_LOCALE_CONTENT',
	},
	{ name: 'Online Store Theme Section Group', value: 'ONLINE_STORE_THEME_SECTION_GROUP' },
	{
		name: 'Online Store Theme Settings Category',
		value: 'ONLINE_STORE_THEME_SETTINGS_CATEGORY',
	},
	{
		name: 'Online Store Theme Settings Data Sections',
		value: 'ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS',
	},
	{ name: 'Packing Slip Template', value: 'PACKING_SLIP_TEMPLATE' },
	{ name: 'Page', value: 'PAGE' },
	{ name: 'Payment Gateway', value: 'PAYMENT_GATEWAY' },
	{ name: 'Product', value: 'PRODUCT' },
	{ name: 'Product Option', value: 'PRODUCT_OPTION' },
	{ name: 'Product Option Value', value: 'PRODUCT_OPTION_VALUE' },
	{ name: 'Selling Plan', value: 'SELLING_PLAN' },
	{ name: 'Selling Plan Group', value: 'SELLING_PLAN_GROUP' },
	{ name: 'Shop', value: 'SHOP' },
	{ name: 'Shop Policy', value: 'SHOP_POLICY' },
];

const LOCALE_FIELD: INodeProperties = {
	displayName: 'Locale Name or ID',
	name: 'locale',
	type: 'options',
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	typeOptions: {
		loadOptionsMethod: 'getShopLocaleOptions',
	},
	default: '',
	required: true,
};

const MARKET_ID_FIELD: INodeProperties = {
	displayName: 'Market Name or ID',
	name: 'marketId',
	type: 'options',
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	typeOptions: {
		loadOptionsMethod: 'getMarketOptions',
	},
	default: '',
};

const REGISTER_TRANSLATIONS_FIELD: INodeProperties = {
	displayName: 'Translations',
	name: 'translationsInput',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'items',
			displayName: 'Translation',
			values: [
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					default: '',
					required: true,
					description:
						'Translatable field key. Use Translation -> Get to read available keys and digests first. For METAFIELD resources, use key "value".',
				},
				{
					displayName: 'Locale Name or ID',
					name: 'locale',
					type: 'options',
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					typeOptions: {
						loadOptionsMethod: 'getShopLocaleOptions',
					},
					default: '',
					required: true,
				},
				{
					displayName: 'Market Name or ID',
					name: 'marketId',
					type: 'options',
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					typeOptions: {
						loadOptionsMethod: 'getMarketOptions',
					},
					default: '',
				},
				{
					displayName: 'Translatable Content Digest',
					name: 'translatableContentDigest',
					type: 'string',
					default: '',
					required: true,
					description: 'Digest from translatableContent for the same key',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					typeOptions: {
						rows: 4,
					},
					default: '',
					required: true,
				},
			],
		},
	],
};

const REMOVE_TRANSLATION_KEYS_FIELD: INodeProperties = {
	displayName: 'Translation Keys',
	name: 'translationKeysInput',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			name: 'items',
			displayName: 'Key',
			values: [
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					default: '',
					required: true,
				},
			],
		},
	],
};

export const TRANSLATION_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'translation',
		value: 'get',
		name: 'Get',
		description: 'Get translatable content and translations for one resource',
		registryKey: 'translation.get',
		fields: [
			gidField(
				'resourceId',
				'Resource ID',
				'Global Shopify ID of the translatable resource (for metafields use gid://shopify/Metafield/{id})',
			),
			LOCALE_FIELD,
			{
				displayName: 'Options',
				name: 'translationOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Filter By Outdated',
						name: 'filterByOutdated',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Include Nested Resources',
						name: 'includeNestedResources',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Include Metafield Metadata',
						name: 'includeMetafieldMetadata',
						type: 'boolean',
						default: false,
						description:
							'For Metafield resource IDs, enriches output with namespace, key, definition name, and owner',
					},
					MARKET_ID_FIELD,
					{
						displayName: 'Nested Limit',
						name: 'nestedLimit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 250,
						},
						displayOptions: {
							show: {
								includeNestedResources: [true],
							},
						},
					},
					{
						displayName: 'Nested Resource Type',
						name: 'nestedResourceType',
						type: 'options',
						options: TRANSLATABLE_RESOURCE_TYPE_OPTIONS,
						default: 'METAFIELD',
						displayOptions: {
							show: {
								includeNestedResources: [true],
							},
						},
					},
					{
						displayName: 'Outdated',
						name: 'outdated',
						type: 'boolean',
						default: true,
						displayOptions: {
							show: {
								filterByOutdated: [true],
							},
						},
					},
				],
			},
		],
	},
	{
		resource: 'translation',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get translatable resources by resource type',
		registryKey: 'translation.getMany',
		fields: [
			{
				displayName: 'Resource Type',
				name: 'resourceType',
				type: 'options',
				options: TRANSLATABLE_RESOURCE_TYPE_OPTIONS,
				default: 'PRODUCT',
				required: true,
			},
			LOCALE_FIELD,
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
				name: 'translationOptions',
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
						displayName: 'Filter By Outdated',
						name: 'filterByOutdated',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Include Nested Resources',
						name: 'includeNestedResources',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Include Metafield Metadata',
						name: 'includeMetafieldMetadata',
						type: 'boolean',
						default: false,
						description:
							'For Metafield resource IDs, enriches output with namespace, key, definition name, and owner',
					},
					MARKET_ID_FIELD,
					{
						displayName: 'Nested Limit',
						name: 'nestedLimit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 250,
						},
						displayOptions: {
							show: {
								includeNestedResources: [true],
							},
						},
					},
					{
						displayName: 'Nested Resource Type',
						name: 'nestedResourceType',
						type: 'options',
						options: TRANSLATABLE_RESOURCE_TYPE_OPTIONS,
						default: 'METAFIELD',
						displayOptions: {
							show: {
								includeNestedResources: [true],
							},
						},
					},
					{
						displayName: 'Outdated',
						name: 'outdated',
						type: 'boolean',
						default: true,
						displayOptions: {
							show: {
								filterByOutdated: [true],
							},
						},
					},
					{
						displayName: 'Reverse',
						name: 'reverse',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	},
	{
		resource: 'translation',
		value: 'register',
		name: 'Register',
		description: 'Create or update translations for a resource',
		registryKey: 'translation.register',
		fields: [
			gidField(
				'resourceId',
				'Resource ID',
				'Global Shopify ID of the translatable resource (for metafields use gid://shopify/Metafield/{id})',
			),
			REGISTER_TRANSLATIONS_FIELD,
		],
	},
	{
		resource: 'translation',
		value: 'remove',
		name: 'Remove',
		description: 'Delete translations by keys/locales',
		registryKey: 'translation.remove',
		fields: [
			gidField(
				'resourceId',
				'Resource ID',
				'Global Shopify ID of the translatable resource (for metafields use gid://shopify/Metafield/{id})',
			),
			{
				displayName: 'Locale Names or IDs',
				name: 'locales',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getShopLocaleOptions',
				},
				default: [],
				required: true,
			},
			REMOVE_TRANSLATION_KEYS_FIELD,
			{
				displayName: 'Market Names or IDs',
				name: 'marketIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getMarketOptions',
				},
				default: [],
			},
		],
	},
];
