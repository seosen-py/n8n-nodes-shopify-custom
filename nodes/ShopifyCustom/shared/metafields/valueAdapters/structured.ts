import type { IDataObject } from 'n8n-workflow';
import {
	DIMENSION_TYPES,
	MONEY_TYPES,
	RATING_TYPES,
	VOLUME_TYPES,
	WEIGHT_TYPES,
	isTypeIn,
} from './constants';

function isEmpty(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

function ensureNumber(value: unknown, fieldName: string): number {
	const parsed = Number(value);
	if (Number.isNaN(parsed)) {
		throw new Error(`"${fieldName}" must be a number`);
	}
	return parsed;
}

export function serializeStructuredMetafieldValue(type: string, item: IDataObject): string | undefined {
	if (isTypeIn(type, MONEY_TYPES)) {
		if (isEmpty(item.moneyAmount) || isEmpty(item.moneyCurrencyCode)) {
			return undefined;
		}
		return JSON.stringify({
			amount: String(item.moneyAmount),
			currency_code: String(item.moneyCurrencyCode).toUpperCase(),
		});
	}

	if (isTypeIn(type, RATING_TYPES)) {
		if (isEmpty(item.ratingValue) || isEmpty(item.ratingScaleMin) || isEmpty(item.ratingScaleMax)) {
			return undefined;
		}
		return JSON.stringify({
			value: String(item.ratingValue),
			scale_min: String(item.ratingScaleMin),
			scale_max: String(item.ratingScaleMax),
		});
	}

	if (isTypeIn(type, DIMENSION_TYPES)) {
		if (isEmpty(item.dimensionValue) || isEmpty(item.dimensionUnit)) {
			return undefined;
		}
		return JSON.stringify({
			value: String(ensureNumber(item.dimensionValue, 'Dimension Value')),
			unit: String(item.dimensionUnit),
		});
	}

	if (isTypeIn(type, VOLUME_TYPES)) {
		if (isEmpty(item.volumeValue) || isEmpty(item.volumeUnit)) {
			return undefined;
		}
		return JSON.stringify({
			value: String(ensureNumber(item.volumeValue, 'Volume Value')),
			unit: String(item.volumeUnit),
		});
	}

	if (isTypeIn(type, WEIGHT_TYPES)) {
		if (isEmpty(item.weightValue) || isEmpty(item.weightUnit)) {
			return undefined;
		}
		return JSON.stringify({
			value: String(ensureNumber(item.weightValue, 'Weight Value')),
			unit: String(item.weightUnit),
		});
	}

	return undefined;
}
