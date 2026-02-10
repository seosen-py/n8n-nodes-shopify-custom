import type { IDataObject } from 'n8n-workflow';
import {
	LIST_REFERENCE_TYPES,
	REFERENCE_TYPES,
	isTypeIn,
	unwrapListType,
} from './constants';
import { serializeListMetafieldValue } from './list';
import { serializeReferenceMetafieldValue } from './reference';
import { serializeScalarMetafieldValue } from './scalar';
import { serializeStructuredMetafieldValue } from './structured';

export {
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
} from './constants';

export function serializeMetafieldValue(type: string, item: IDataObject): string | undefined {
	const { isList, baseType } = unwrapListType(type);
	if (isList) {
		if (isTypeIn(type, LIST_REFERENCE_TYPES)) {
			return serializeReferenceMetafieldValue(type, item);
		}
		return serializeListMetafieldValue(baseType, item);
	}

	if (isTypeIn(type, REFERENCE_TYPES)) {
		return serializeReferenceMetafieldValue(type, item);
	}

	const structuredValue = serializeStructuredMetafieldValue(type, item);
	if (structuredValue !== undefined) {
		return structuredValue;
	}

	return serializeScalarMetafieldValue(type, item);
}
