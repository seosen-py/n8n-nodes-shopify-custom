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
	{
		name: 'Online Store Theme Locale Content',
		value: 'ONLINE_STORE_THEME_LOCALE_CONTENT',
	},
	{ name: 'Online Store Theme JSON Template', value: 'ONLINE_STORE_THEME_JSON_TEMPLATE' },
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

const TARGET_LOCALE_FIELD: INodeProperties = {
	displayName: 'Target Locale Name or ID',
	name: 'locale',
	type: 'options',
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	typeOptions: {
		loadOptionsMethod: 'getTranslationTargetLocaleOptions',
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

const TRANSLATION_SCOPE_FIELD: INodeProperties = {
	displayName: 'Translation Scope',
	name: 'translationScope',
	type: 'options',
	default: 'global',
	options: [
		{
			name: 'Global',
			value: 'global',
			description: 'Create or remove a locale-wide translation with no market override',
		},
		{
			name: 'Market-Specific',
			value: 'marketSpecific',
			description: 'Create or remove a translation override for one market',
		},
	],
};

const TRANSLATION_OUTPUT_SHAPE_FIELD: INodeProperties = {
	displayName: 'Output Shape',
	name: 'outputShape',
	type: 'options',
	default: 'resources',
	description: 'How to structure translation data for automation workflows',
	options: [
		{
			name: 'Resource Tree',
			value: 'resources',
			description:
				'Return resources with per-field source, translation layers, and nested metafields',
		},
		{
			name: 'Field Rows (All)',
			value: 'flattenedAll',
			description: 'Return one row per field with source, translation layers, and effective value',
		},
		{
			name: 'Field Rows (Only Missing)',
			value: 'flattenedMissing',
			description: 'Return only fields that are missing a translation for the selected locale',
		},
	],
};

const TRANSLATION_COVERAGE_OUTPUT_SHAPE_FIELD: INodeProperties = {
	displayName: 'Output Shape',
	name: 'outputShape',
	type: 'options',
	default: 'resources',
	description: 'How to structure translation coverage data for automation workflows',
	options: [
		{
			name: 'Resource Tree',
			value: 'resources',
			description:
				'Return resources with per-field locale coverage and nested metafields',
		},
		{
			name: 'Field Rows (All)',
			value: 'flattenedAll',
			description: 'Return one row per field with translated and missing locale lists',
		},
		{
			name: 'Field Rows (Only Missing)',
			value: 'flattenedMissing',
			description: 'Return only fields that are missing at least one target locale',
		},
	],
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
		description:
			'Get source content plus global, market-specific, and effective translation data for one resource',
		registryKey: 'translation.get',
		fields: [
			gidField(
				'resourceId',
				'Resource ID',
				'Global Shopify ID of the exact translatable resource (for metafields use gid://shopify/Metafield/{id})',
			),
			TARGET_LOCALE_FIELD,
			MARKET_ID_FIELD,
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
						description: 'Whether to request only outdated translations from Shopify',
					},
					{
						displayName: 'Include Metafield Metadata',
						name: 'includeMetafieldMetadata',
						type: 'boolean',
						default: false,
						description:
							'Whether to enrich METAFIELD resources with namespace, key, definition name, and owner',
					},
					{
						displayName: 'Include Metafields',
						name: 'includeMetafields',
						type: 'boolean',
						default: false,
						description: 'Whether to include nested metafields under the resource',
					},
					{
						displayName: 'Metafield Limit',
						name: 'metafieldLimit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 250,
						},
						displayOptions: {
							show: {
								includeMetafields: [true],
							},
						},
					},
					{
						displayName: 'Outdated',
						name: 'outdated',
						type: 'boolean',
						default: true,
						description: 'Whether to return outdated translations when filtering by outdated',
						displayOptions: {
							show: {
								filterByOutdated: [true],
							},
						},
					},
					TRANSLATION_OUTPUT_SHAPE_FIELD,
				],
			},
		],
	},
	{
		resource: 'translation',
		value: 'getMany',
		name: 'Get Many',
		description:
			'Get source content plus translation layers for multiple resources of the same translatable type',
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
			TARGET_LOCALE_FIELD,
			MARKET_ID_FIELD,
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
						description: 'Whether to request only outdated translations from Shopify',
					},
					{
						displayName: 'Include Metafield Metadata',
						name: 'includeMetafieldMetadata',
						type: 'boolean',
						default: false,
						description:
							'Whether to enrich METAFIELD resources with namespace, key, definition name, and owner',
					},
					{
						displayName: 'Include Metafields',
						name: 'includeMetafields',
						type: 'boolean',
						default: false,
						description: 'Whether to include nested metafields under each resource',
					},
					{
						displayName: 'Metafield Limit',
						name: 'metafieldLimit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 250,
						},
						displayOptions: {
							show: {
								includeMetafields: [true],
							},
						},
					},
					{
						displayName: 'Outdated',
						name: 'outdated',
						type: 'boolean',
						default: true,
						description: 'Whether to return outdated translations when filtering by outdated',
						displayOptions: {
							show: {
								filterByOutdated: [true],
							},
						},
					},
					TRANSLATION_OUTPUT_SHAPE_FIELD,
					{
						displayName: 'Reverse',
						name: 'reverse',
						type: 'boolean',
						default: false,
						description: 'Whether to reverse the Shopify connection order',
					},
				],
			},
		],
	},
	{
		resource: 'translation',
		value: 'coverage',
		name: 'Coverage',
		description: 'Inspect which non-primary locales have translations for one resource',
		registryKey: 'translation.coverage',
		fields: [
			gidField(
				'resourceId',
				'Resource ID',
				'Global Shopify ID of the exact translatable resource (for metafields use gid://shopify/Metafield/{id})',
			),
			MARKET_ID_FIELD,
			{
				displayName: 'Options',
				name: 'translationOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Include Metafield Metadata',
						name: 'includeMetafieldMetadata',
						type: 'boolean',
						default: false,
						description:
							'Whether to enrich METAFIELD resources with namespace, key, definition name, and owner',
					},
					{
						displayName: 'Include Metafields',
						name: 'includeMetafields',
						type: 'boolean',
						default: false,
						description: 'Whether to include nested metafields under the resource',
					},
					{
						displayName: 'Metafield Limit',
						name: 'metafieldLimit',
						type: 'number',
						default: 50,
						typeOptions: {
							minValue: 1,
							maxValue: 250,
						},
						displayOptions: {
							show: {
								includeMetafields: [true],
							},
						},
					},
					TRANSLATION_COVERAGE_OUTPUT_SHAPE_FIELD,
				],
			},
		],
	},
	{
		resource: 'translation',
		value: 'register',
		name: 'Register',
		description: 'Create or update translations for one locale and one translation scope',
		registryKey: 'translation.register',
		fields: [
			gidField(
				'resourceId',
				'Resource ID',
				'Global Shopify ID of the exact translatable resource (for metafields use gid://shopify/Metafield/{id})',
			),
			TARGET_LOCALE_FIELD,
			TRANSLATION_SCOPE_FIELD,
			{
				...MARKET_ID_FIELD,
				displayOptions: {
					show: {
						translationScope: ['marketSpecific'],
					},
				},
			},
			REGISTER_TRANSLATIONS_FIELD,
		],
	},
	{
		resource: 'translation',
		value: 'remove',
		name: 'Remove',
		description: 'Delete translations for one locale and one translation scope',
		registryKey: 'translation.remove',
		fields: [
			gidField(
				'resourceId',
				'Resource ID',
				'Global Shopify ID of the exact translatable resource (for metafields use gid://shopify/Metafield/{id})',
			),
			TARGET_LOCALE_FIELD,
			TRANSLATION_SCOPE_FIELD,
			{
				...MARKET_ID_FIELD,
				displayOptions: {
					show: {
						translationScope: ['marketSpecific'],
					},
				},
			},
			REMOVE_TRANSLATION_KEYS_FIELD,
		],
	},
];
