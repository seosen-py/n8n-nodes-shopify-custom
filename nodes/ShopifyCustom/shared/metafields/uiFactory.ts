import type { INodeProperties } from 'n8n-workflow';
import {
	BOOLEAN_TYPES,
	DATE_TIME_TYPES,
	DATE_TYPES,
	DIMENSION_TYPES,
	INTEGER_TYPES,
	JSON_TYPES,
	LIST_REFERENCE_TYPES,
	LIST_STRING_ARRAY_TYPES,
	MONEY_TYPES,
	NUMBER_TYPES,
	RATING_TYPES,
	REFERENCE_TYPES,
	TEXT_TYPES,
	VOLUME_TYPES,
	WEIGHT_TYPES,
} from './valueAdapters';

const BASE_LIST_TYPES = [
	...BOOLEAN_TYPES,
	...INTEGER_TYPES,
	...NUMBER_TYPES,
	...TEXT_TYPES,
	...DATE_TYPES,
	...DATE_TIME_TYPES,
	...JSON_TYPES,
	...MONEY_TYPES,
	...RATING_TYPES,
	...DIMENSION_TYPES,
	...VOLUME_TYPES,
	...WEIGHT_TYPES,
].map((type) => `list.${type}`);

const NON_REFERENCE_LIST_TYPES = BASE_LIST_TYPES.filter((type) => !LIST_REFERENCE_TYPES.includes(type));
const NON_REFERENCE_FIXED_COLLECTION_TYPES = NON_REFERENCE_LIST_TYPES.filter(
	(type) => !LIST_STRING_ARRAY_TYPES.includes(type),
);
const LIST_REFERENCE_FIXED_COLLECTION_TYPES = LIST_REFERENCE_TYPES.filter(
	(type) => !LIST_STRING_ARRAY_TYPES.includes(type),
);
const PLAIN_TEXT_TYPES = TEXT_TYPES.filter((type) => type !== 'email');
const JSON_ONLY_TYPES = JSON_TYPES.filter((type) => type !== 'rich_text_field');

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function definitionTypeConditions(types: string[]): Array<{ _cnd: { regex: string } }> {
	return types.map((type) => ({
		_cnd: {
			regex: `"type":"${escapeRegex(type)}"`,
		},
	}));
}

function showForDefinitionTypes(types: string[]): INodeProperties['displayOptions'] {
	return {
		show: {
			definition: definitionTypeConditions(types),
		},
	};
}

function withDisplay(
	properties: INodeProperties[],
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties[] {
	return properties.map((property) => ({
		...property,
		displayOptions,
	}));
}

function buildMetafieldSetCollection(
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties[] {
	const items: INodeProperties[] = [
		{
			displayName: 'Definition Name or ID',
			name: 'definition',
			type: 'options',
			description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getMetafieldDefinitionsForCurrentContext',
				loadOptionsDependsOn: ['resource', 'ownerType'],
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Text Value',
			name: 'textValue',
			type: 'string',
			default: '',
			displayOptions: showForDefinitionTypes(PLAIN_TEXT_TYPES),
		},
		{
			displayName: 'Boolean Value',
			name: 'booleanValue',
			type: 'boolean',
			default: false,
			displayOptions: showForDefinitionTypes(BOOLEAN_TYPES),
		},
		{
			displayName: 'Integer Value',
			name: 'integerValue',
			type: 'number',
			default: 0,
			displayOptions: showForDefinitionTypes(INTEGER_TYPES),
		},
		{
			displayName: 'Number Value',
			name: 'numberValue',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 4,
			},
			displayOptions: showForDefinitionTypes(NUMBER_TYPES),
		},
		{
			displayName: 'Date Value',
			name: 'dateValue',
			type: 'dateTime',
			default: '',
			displayOptions: showForDefinitionTypes(DATE_TYPES),
		},
		{
			displayName: 'Date Time Value',
			name: 'dateTimeValue',
			type: 'dateTime',
			default: '',
			displayOptions: showForDefinitionTypes(DATE_TIME_TYPES),
		},
		{
			displayName: 'JSON Value',
			name: 'jsonValue',
			type: 'json',
			default: '',
			displayOptions: showForDefinitionTypes(JSON_ONLY_TYPES),
		},
		{
			displayName: 'Rich Text (HTML)',
			name: 'richTextHtml',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
			description: 'HTML input that will be converted to Shopify rich text format',
			displayOptions: showForDefinitionTypes(['rich_text_field']),
		},
		{
			displayName: 'Email Value',
			name: 'emailValue',
			type: 'string',
			placeholder: 'name@example.com',
			default: '',
			displayOptions: showForDefinitionTypes(['email']),
		},
		{
			displayName: 'Money Amount',
			name: 'moneyAmount',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 2,
			},
			displayOptions: showForDefinitionTypes(MONEY_TYPES),
		},
		{
			displayName: 'Currency Code',
			name: 'moneyCurrencyCode',
			type: 'string',
			default: 'USD',
			displayOptions: showForDefinitionTypes(MONEY_TYPES),
		},
		{
			displayName: 'Rating Value',
			name: 'ratingValue',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 2,
			},
			displayOptions: showForDefinitionTypes(RATING_TYPES),
		},
		{
			displayName: 'Scale Min',
			name: 'ratingScaleMin',
			type: 'number',
			default: 1,
			typeOptions: {
				numberPrecision: 2,
			},
			displayOptions: showForDefinitionTypes(RATING_TYPES),
		},
		{
			displayName: 'Scale Max',
			name: 'ratingScaleMax',
			type: 'number',
			default: 5,
			typeOptions: {
				numberPrecision: 2,
			},
			displayOptions: showForDefinitionTypes(RATING_TYPES),
		},
		{
			displayName: 'Dimension Value',
			name: 'dimensionValue',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 3,
			},
			displayOptions: showForDefinitionTypes(DIMENSION_TYPES),
		},
		{
			displayName: 'Dimension Unit',
			name: 'dimensionUnit',
			type: 'options',
			options: [
				{ name: 'Centimeter', value: 'cm' },
				{ name: 'Foot', value: 'ft' },
				{ name: 'Inch', value: 'in' },
				{ name: 'Meter', value: 'm' },
				{ name: 'Millimeter', value: 'mm' },
				{ name: 'Yard', value: 'yd' },
			],
			default: 'cm',
			displayOptions: showForDefinitionTypes(DIMENSION_TYPES),
		},
		{
			displayName: 'Volume Value',
			name: 'volumeValue',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 3,
			},
			displayOptions: showForDefinitionTypes(VOLUME_TYPES),
		},
		{
			displayName: 'Volume Unit',
			name: 'volumeUnit',
			type: 'options',
			options: [
				{ name: 'Centiliter', value: 'cl' },
				{ name: 'Cubic Meter', value: 'm3' },
				{ name: 'Imperial Fluid Ounce', value: 'imp_fl_oz' },
				{ name: 'Imperial Gallon', value: 'imp_gal' },
				{ name: 'Imperial Pint', value: 'imp_pt' },
				{ name: 'Imperial Quart', value: 'imp_qt' },
				{ name: 'Liter', value: 'l' },
				{ name: 'Milliliter', value: 'ml' },
				{ name: 'US Fluid Ounce', value: 'us_fl_oz' },
				{ name: 'US Gallon', value: 'us_gal' },
				{ name: 'US Pint', value: 'us_pt' },
				{ name: 'US Quart', value: 'us_qt' },
			],
			default: 'ml',
			displayOptions: showForDefinitionTypes(VOLUME_TYPES),
		},
		{
			displayName: 'Weight Value',
			name: 'weightValue',
			type: 'number',
			default: 0,
			typeOptions: {
				numberPrecision: 3,
			},
			displayOptions: showForDefinitionTypes(WEIGHT_TYPES),
		},
		{
			displayName: 'Weight Unit',
			name: 'weightUnit',
			type: 'options',
			options: [
				{ name: 'Gram', value: 'g' },
				{ name: 'Kilogram', value: 'kg' },
				{ name: 'Ounce', value: 'oz' },
				{ name: 'Pound', value: 'lb' },
			],
			default: 'g',
			displayOptions: showForDefinitionTypes(WEIGHT_TYPES),
		},
		{
			displayName: 'Values (JSON Array of Strings)',
			name: 'listStringArray',
			type: 'json',
			default: '[]',
			description: 'Enter a JSON array of strings. Example: ["value 1", "value 2"].',
			displayOptions: showForDefinitionTypes(LIST_STRING_ARRAY_TYPES),
		},
		{
			displayName: 'List Items',
			name: 'listItems',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			description: 'Add one value per list item',
			options: [
				{
					name: 'items',
					displayName: 'Item',
					values: [
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
						},
					],
				},
			],
			displayOptions: showForDefinitionTypes(NON_REFERENCE_FIXED_COLLECTION_TYPES),
		},
		{
			displayName: 'Reference GID',
			name: 'referenceGid',
			type: 'string',
			default: '',
			placeholder: 'gid://shopify/...',
			description: 'Shopify GID of the referenced record',
			displayOptions: showForDefinitionTypes(REFERENCE_TYPES),
		},
		{
			displayName: 'Reference Items',
			name: 'listReferenceItems',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			description: 'Add one Shopify GID per list item',
			options: [
				{
					name: 'items',
					displayName: 'Item',
					values: [
						{
							displayName: 'GID',
							name: 'gid',
							type: 'string',
							default: '',
							placeholder: 'gid://shopify/...',
						},
					],
				},
			],
			displayOptions: showForDefinitionTypes(LIST_REFERENCE_FIXED_COLLECTION_TYPES),
		},
	];

	return withDisplay(
		[
			{
				displayName: 'Metafields',
				name: 'metafieldsSetItems',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'items',
						displayName: 'Metafield',
						values: items,
					},
				],
			},
		],
		displayOptions,
	);
}

function buildMetafieldDeleteCollection(
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties[] {
	return withDisplay(
		[
			{
				displayName: 'Metafields',
				name: 'metafieldsDeleteItems',
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
								displayName: 'Definition Name or ID',
								name: 'definition',
								type: 'options',
								description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getMetafieldDefinitionsForCurrentContext',
									loadOptionsDependsOn: ['resource', 'ownerType'],
								},
								default: '',
								required: true,
							},
						],
					},
				],
			},
		],
		displayOptions,
	);
}

export function buildStandaloneMetafieldValueFields(): INodeProperties[] {
	return [
		...buildMetafieldSetCollection({
			show: {
				resource: ['metafieldValue'],
				operation: ['set'],
			},
		}),
		...buildMetafieldDeleteCollection({
			show: {
				resource: ['metafieldValue'],
				operation: ['delete'],
			},
		}),
	];
}
