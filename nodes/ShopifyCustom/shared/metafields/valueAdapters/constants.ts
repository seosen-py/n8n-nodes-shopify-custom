export const BOOLEAN_TYPES = ['boolean'];

export const INTEGER_TYPES = ['number_integer'];

export const NUMBER_TYPES = ['number_decimal'];

export const TEXT_TYPES = [
	'single_line_text_field',
	'multi_line_text_field',
	'email',
	'link',
	'url',
	'color',
	'language',
	'id',
];

export const DATE_TYPES = ['date'];
export const DATE_TIME_TYPES = ['date_time'];

export const JSON_TYPES = ['json', 'rich_text_field'];

export const MONEY_TYPES = ['money'];
export const RATING_TYPES = ['rating'];
export const DIMENSION_TYPES = ['dimension'];
export const VOLUME_TYPES = ['volume'];
export const WEIGHT_TYPES = ['weight'];

export const REFERENCE_TYPES = [
	'product_reference',
	'variant_reference',
	'collection_reference',
	'customer_reference',
	'order_reference',
	'metaobject_reference',
	'page_reference',
	'file_reference',
];

export const LIST_REFERENCE_TYPES = REFERENCE_TYPES.map((type) => `list.${type}`);

export const LIST_STRING_ARRAY_TYPES = [
	'list.single_line_text_field',
	'list.file_reference',
	'list.id',
	'list.number_decimal',
	'list.number_integer',
	'list.url',
	'list.color',
	'list.date_time',
	'list.date',
];

export function unwrapListType(type: string): { isList: boolean; baseType: string } {
	if (!type.startsWith('list.')) {
		return { isList: false, baseType: type };
	}

	return {
		isList: true,
		baseType: type.slice(5),
	};
}

export function isTypeIn(type: string, supportedTypes: string[]): boolean {
	return supportedTypes.includes(type);
}
