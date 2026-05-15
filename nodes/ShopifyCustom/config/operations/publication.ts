import type { INodeProperties } from 'n8n-workflow';
import type { IShopifyOperationConfig } from './types';

function publicationPaginationFields(): INodeProperties[] {
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
			],
		},
	];
}

function publicationProductFields(): INodeProperties[] {
	return [
		{
			displayName: 'Product IDs',
			name: 'productIds',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
			required: true,
			placeholder: 'gid://shopify/Product/123\ngid://shopify/Product/456',
			description: 'Product GIDs to publish or unpublish. Separate multiple IDs with commas or new lines.',
		},
		{
			displayName: 'Publication IDs',
			name: 'publicationIds',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			default: '',
			required: true,
			placeholder: 'gid://shopify/Publication/123',
			description:
				'Publication GIDs for the target sales channels. Use Publication -> Get Many to list them.',
		},
	];
}

export const PUBLICATION_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'publication',
		value: 'getMany',
		name: 'Get Many',
		description: 'List Shopify publications for sales channels',
		registryKey: 'publication.getMany',
		fields: publicationPaginationFields(),
	},
	{
		resource: 'publication',
		value: 'publishProducts',
		name: 'Publish Products',
		description: 'Publish one or more products to one or more sales channels',
		registryKey: 'publication.publishProducts',
		fields: publicationProductFields(),
	},
	{
		resource: 'publication',
		value: 'unpublishProducts',
		name: 'Unpublish Products',
		description: 'Unpublish one or more products from one or more sales channels',
		registryKey: 'publication.unpublishProducts',
		fields: publicationProductFields(),
	},
];
