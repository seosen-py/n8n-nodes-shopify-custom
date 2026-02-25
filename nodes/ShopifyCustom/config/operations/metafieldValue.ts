import { gidField } from './common';
import type { IShopifyOperationConfig } from './types';

const OWNER_TYPE_OPTIONS = [
	{ name: 'Product', value: 'PRODUCT' },
	{ name: 'Product Variant', value: 'PRODUCTVARIANT' },
	{ name: 'Collection', value: 'COLLECTION' },
	{ name: 'Customer', value: 'CUSTOMER' },
	{ name: 'Order', value: 'ORDER' },
	{ name: 'Draft Order', value: 'DRAFTORDER' },
];

export const METAFIELD_VALUE_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'metafieldValue',
		value: 'set',
		name: 'Set',
		description: 'Set metafield values',
		registryKey: 'metafieldValue.set',
		fields: [
			{
				displayName: 'Owner Type',
				name: 'ownerType',
				type: 'options',
				options: OWNER_TYPE_OPTIONS,
				default: 'PRODUCT',
			},
			gidField('ownerId', 'Owner ID', 'Global owner ID in Shopify'),
		],
	},
	{
		resource: 'metafieldValue',
		value: 'get',
		name: 'Get',
		description: 'Get one metafield value',
		registryKey: 'metafieldValue.get',
		fields: [
			{
				displayName: 'Owner Type',
				name: 'ownerType',
				type: 'options',
				options: OWNER_TYPE_OPTIONS,
				default: 'PRODUCT',
			},
			gidField('ownerId', 'Owner ID', 'Global owner ID in Shopify'),
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
		],
	},
	{
		resource: 'metafieldValue',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many metafield values from an owner',
		registryKey: 'metafieldValue.getMany',
		fields: [
			{
				displayName: 'Owner Type',
				name: 'ownerType',
				type: 'options',
				options: OWNER_TYPE_OPTIONS,
				default: 'PRODUCT',
			},
			gidField('ownerId', 'Owner ID', 'Global owner ID in Shopify'),
			{
				displayName: 'Namespace',
				name: 'namespace',
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
		resource: 'metafieldValue',
		value: 'resolveMetadata',
		name: 'Resolve Metadata',
		description: 'Resolve metafield metadata by metafield IDs',
		registryKey: 'metafieldValue.resolveMetadata',
		fields: [
			{
				displayName: 'Metafields',
				name: 'metafieldResolveItems',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'items',
						displayName: 'Metafield',
						values: [
							{
								displayName: 'Metafield ID',
								name: 'metafieldId',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'gid://shopify/Metafield/...',
								description: 'Global metafield ID in Shopify',
							},
						],
					},
				],
			},
		],
	},
	{
		resource: 'metafieldValue',
		value: 'delete',
		name: 'Delete',
		description: 'Delete metafield values',
		registryKey: 'metafieldValue.delete',
		fields: [
			{
				displayName: 'Owner Type',
				name: 'ownerType',
				type: 'options',
				options: OWNER_TYPE_OPTIONS,
				default: 'PRODUCT',
			},
			gidField('ownerId', 'Owner ID', 'Global owner ID in Shopify'),
		],
	},
];
