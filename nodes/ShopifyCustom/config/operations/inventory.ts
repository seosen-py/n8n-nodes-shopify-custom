import type { INodeProperties } from 'n8n-workflow';
import { gidField } from './common';
import type { IShopifyOperationConfig } from './types';

const INVENTORY_QUANTITY_STATE_OPTIONS = [
	{ name: 'Available', value: 'available' },
	{ name: 'Committed', value: 'committed' },
	{ name: 'Damaged', value: 'damaged' },
	{ name: 'Incoming', value: 'incoming' },
	{ name: 'On Hand', value: 'on_hand' },
	{ name: 'Quality Control', value: 'quality_control' },
	{ name: 'Reserved', value: 'reserved' },
	{ name: 'Safety Stock', value: 'safety_stock' },
];

const INVENTORY_SET_NAME_OPTIONS = [
	{ name: 'Available', value: 'available' },
	{ name: 'On Hand', value: 'on_hand' },
];

const INVENTORY_ADJUST_NAME_OPTIONS = [
	{ name: 'Available', value: 'available' },
	{ name: 'Damaged', value: 'damaged' },
	{ name: 'Quality Control', value: 'quality_control' },
	{ name: 'Reserved', value: 'reserved' },
	{ name: 'Safety Stock', value: 'safety_stock' },
];

const INVENTORY_REASON_OPTIONS = [
	{ name: 'Correction', value: 'correction' },
	{ name: 'Cycle Count Available', value: 'cycle_count_available' },
	{ name: 'Damaged', value: 'damaged' },
	{ name: 'Movement Canceled', value: 'movement_canceled' },
	{ name: 'Movement Created', value: 'movement_created' },
	{ name: 'Movement Received', value: 'movement_received' },
	{ name: 'Movement Updated', value: 'movement_updated' },
	{ name: 'Other', value: 'other' },
	{ name: 'Promotion', value: 'promotion' },
	{ name: 'Quality Control', value: 'quality_control' },
	{ name: 'Received', value: 'received' },
	{ name: 'Reservation Created', value: 'reservation_created' },
	{ name: 'Reservation Deleted', value: 'reservation_deleted' },
	{ name: 'Reservation Updated', value: 'reservation_updated' },
	{ name: 'Restock', value: 'restock' },
	{ name: 'Safety Stock', value: 'safety_stock' },
	{ name: 'Shrinkage', value: 'shrinkage' },
];

function inventoryLevelReadOptions(
	additionalOptions: INodeProperties[] = [],
): INodeProperties[] {
	return [
		...additionalOptions,
		{
			displayName: 'Include Inventory Levels',
			name: 'includeInventoryLevels',
			type: 'boolean',
			default: false,
			description: 'Whether to include inventory levels by location',
		},
		{
			displayName: 'Inventory Levels Limit',
			name: 'inventoryLevelsFirst',
			type: 'number',
			default: 25,
			typeOptions: {
				minValue: 1,
				maxValue: 250,
			},
			displayOptions: {
				show: {
					includeInventoryLevels: [true],
				},
			},
		},
		{
			displayName: 'Inventory Quantity States',
			name: 'inventoryQuantityNames',
			type: 'multiOptions',
			options: INVENTORY_QUANTITY_STATE_OPTIONS,
			default: ['available'],
			displayOptions: {
				show: {
					includeInventoryLevels: [true],
				},
			},
			description: 'Quantity states to retrieve for each location',
		},
	];
}

function getFields(): INodeProperties[] {
	return [
		gidField(
			'inventoryItemId',
			'Inventory Item ID',
			'Global inventory item ID in Shopify',
		),
		{
			displayName: 'Options',
			name: 'inventoryReadOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: inventoryLevelReadOptions(),
		},
	];
}

function getManyFields(): INodeProperties[] {
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
			name: 'inventoryQueryOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: inventoryLevelReadOptions([
				{
					displayName: 'Cursor',
					name: 'afterCursor',
					type: 'string',
					default: '',
					description: 'Use to continue from a specific cursor',
				},
				{
					displayName: 'Search Query',
					name: 'query',
					type: 'string',
					default: '',
					description: 'Shopify search syntax query (for example: sku:ABC-123)',
				},
				{
					displayName: 'Reverse',
					name: 'reverse',
					type: 'boolean',
					default: false,
				},
			]),
		},
	];
}

function updateFields(): INodeProperties[] {
	return [
		gidField(
			'inventoryItemId',
			'Inventory Item ID',
			'Global inventory item ID in Shopify',
		),
		{
			displayName: 'Input',
			name: 'inventoryUpdateInput',
			type: 'collection',
			placeholder: 'Add field',
			default: {},
			options: [
				{
					displayName: 'Cost',
					name: 'cost',
					type: 'string',
					default: '',
					placeholder: '145.89',
					description: 'Unit cost in the shop currency',
				},
				{
					displayName: 'Country Code of Origin',
					name: 'countryCodeOfOrigin',
					type: 'string',
					default: '',
					placeholder: 'US',
					description: 'ISO 3166-1 alpha-2 country code',
				},
				{
					displayName: 'Harmonized System Code',
					name: 'harmonizedSystemCode',
					type: 'string',
					default: '',
					placeholder: '621710',
					description: 'Harmonized system code (6-13 digits)',
				},
				{
					displayName: 'Province Code of Origin',
					name: 'provinceCodeOfOrigin',
					type: 'string',
					default: '',
					placeholder: 'OR',
					description: 'ISO 3166-2 alpha-2 province code',
				},
				{
					displayName: 'Requires Shipping',
					name: 'requiresShipping',
					type: 'boolean',
					default: true,
					description: 'Whether the inventory item requires shipping',
				},
				{
					displayName: 'SKU',
					name: 'sku',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Tracked',
					name: 'tracked',
					type: 'boolean',
					default: true,
					description: 'Whether inventory is tracked for the item',
				},
			],
		},
	];
}

function setFields(): INodeProperties[] {
	return [
		{
			displayName: 'Quantities',
			name: 'inventoryQuantities',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'items',
					displayName: 'Quantity',
					values: [
						{
							displayName: 'Compare Quantity',
							name: 'compareQuantity',
							type: 'string',
							default: '',
							placeholder: '10',
							description:
								'Last known quantity for compare-and-swap check; leave empty to use ignore option',
						},
						{
							displayName: 'Inventory Item ID',
							name: 'inventoryItemId',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'gid://shopify/InventoryItem/...',
							description: 'Global inventory item ID in Shopify',
						},
						{
							displayName: 'Location ID',
							name: 'locationId',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'gid://shopify/Location/...',
							description: 'Global location ID in Shopify',
						},
						{
							displayName: 'Quantity',
							name: 'quantity',
							type: 'number',
							default: 0,
							required: true,
							typeOptions: {
								minValue: 0,
							},
						},
					],
				},
			],
		},
		{
			displayName: 'Options',
			name: 'inventorySetOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Ignore Compare Quantity',
					name: 'ignoreCompareQuantity',
					type: 'boolean',
					default: false,
					description:
						'Whether to disable compare-and-swap check for set quantities (2025-10)',
				},
				{
					displayName: 'Name',
					name: 'name',
					type: 'options',
					options: INVENTORY_SET_NAME_OPTIONS,
					default: 'available',
					description: 'Inventory quantity state to set',
				},
				{
					displayName: 'Reason',
					name: 'reason',
					type: 'options',
					options: INVENTORY_REASON_OPTIONS,
					default: 'correction',
					description: 'Reason for inventory quantity change',
				},
				{
					displayName: 'Reference Document URI',
					name: 'referenceDocumentUri',
					type: 'string',
					default: '',
					placeholder: 'gid://your-app/PurchaseOrder/PO-2024-001',
					description: 'URI to identify why this change happened',
				},
			],
		},
	];
}

function adjustFields(): INodeProperties[] {
	return [
		{
			displayName: 'Changes',
			name: 'inventoryAdjustChanges',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'items',
					displayName: 'Change',
					values: [
						{
							displayName: 'Change From Quantity',
							name: 'changeFromQuantity',
							type: 'string',
							default: '',
							placeholder: '5',
							description:
								'Last known quantity for compare-and-swap check (used in 2026-01+ API versions)',
						},
						{
							displayName: 'Delta',
							name: 'delta',
							type: 'number',
							default: 0,
							required: true,
							description: 'Positive to increase, negative to decrease',
						},
						{
							displayName: 'Inventory Item ID',
							name: 'inventoryItemId',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'gid://shopify/InventoryItem/...',
							description: 'Global inventory item ID in Shopify',
						},
						{
							displayName: 'Location ID',
							name: 'locationId',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'gid://shopify/Location/...',
							description: 'Global location ID in Shopify',
						},
					],
				},
			],
		},
		{
			displayName: 'Options',
			name: 'inventoryAdjustOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'options',
					options: INVENTORY_ADJUST_NAME_OPTIONS,
					default: 'available',
					description: 'Inventory quantity state to adjust',
				},
				{
					displayName: 'Reason',
					name: 'reason',
					type: 'options',
					options: INVENTORY_REASON_OPTIONS,
					default: 'correction',
					description: 'Reason for inventory quantity change',
				},
				{
					displayName: 'Reference Document URI',
					name: 'referenceDocumentUri',
					type: 'string',
					default: '',
					placeholder: 'gid://your-app/CycleCount/CC-2024-01',
					description: 'URI to identify why this change happened',
				},
			],
		},
	];
}

export const INVENTORY_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'inventory',
		value: 'get',
		name: 'Get',
		description: 'Get an inventory item by ID',
		registryKey: 'inventory.get',
		fields: getFields(),
	},
	{
		resource: 'inventory',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get many inventory items',
		registryKey: 'inventory.getMany',
		fields: getManyFields(),
	},
	{
		resource: 'inventory',
		value: 'update',
		name: 'Update',
		description: 'Update inventory item data',
		registryKey: 'inventory.update',
		fields: updateFields(),
	},
	{
		resource: 'inventory',
		value: 'set',
		name: 'Set Quantities',
		description: 'Set available or on-hand inventory quantities',
		registryKey: 'inventory.set',
		fields: setFields(),
	},
	{
		resource: 'inventory',
		value: 'adjust',
		name: 'Adjust Quantities',
		description: 'Increase or decrease inventory quantities by delta',
		registryKey: 'inventory.adjust',
		fields: adjustFields(),
	},
];
