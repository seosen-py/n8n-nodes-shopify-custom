import type { IDataObject } from 'n8n-workflow';
import {
	BOOLEAN_TYPES,
	DATE_TIME_TYPES,
	DATE_TYPES,
	INTEGER_TYPES,
	JSON_TYPES,
	NUMBER_TYPES,
} from './constants';

function isObject(value: unknown): value is IDataObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseRawListValues(value: unknown): string[] {
	if (value === undefined || value === null) {
		return [];
	}
	return String(value)
		.split(/[\n,]/g)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

function parseJsonArrayValues(value: unknown): string[] {
	if (value === undefined || value === null || value === '') {
		return [];
	}

	const normalize = (items: unknown[]): string[] =>
		items
			.map((item) => String(item ?? '').trim())
			.filter((item) => item.length > 0);

	if (Array.isArray(value)) {
		return normalize(value);
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed.length === 0) {
			return [];
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			throw new Error('List values must be a valid JSON array');
		}

		if (!Array.isArray(parsed)) {
			throw new Error('List values must be a JSON array');
		}

		return normalize(parsed);
	}

	throw new Error('List values must be a JSON array');
}

function parseFixedCollectionValues(value: unknown): string[] {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return [];
	}

	return value.items
		.filter(isObject)
		.map((entry) => String(entry.value ?? '').trim())
		.filter((entryValue) => entryValue.length > 0);
}

function toIsoDate(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`Invalid date value in list: ${value}`);
	}
	return parsed.toISOString().slice(0, 10);
}

function toIsoDateTime(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error(`Invalid date time value in list: ${value}`);
	}
	return parsed.toISOString();
}

export function serializeListMetafieldValue(baseType: string, item: IDataObject): string | undefined {
	const jsonArrayItems = parseJsonArrayValues(item.listStringArray);
	const fixedCollectionItems = parseFixedCollectionValues(item.listItems);
	const rawItems =
		jsonArrayItems.length > 0
			? jsonArrayItems
			: fixedCollectionItems.length > 0
				? fixedCollectionItems
				: parseRawListValues(item.listValues);
	if (rawItems.length === 0) {
		return undefined;
	}

	const mapped = rawItems.map((rawItem) => {
		if (BOOLEAN_TYPES.includes(baseType)) {
			return rawItem === 'true' || rawItem === '1';
		}
		if (INTEGER_TYPES.includes(baseType)) {
			return Math.trunc(Number(rawItem));
		}
		if (NUMBER_TYPES.includes(baseType)) {
			return Number(rawItem);
		}
		if (DATE_TYPES.includes(baseType)) {
			return toIsoDate(rawItem);
		}
		if (DATE_TIME_TYPES.includes(baseType)) {
			return toIsoDateTime(rawItem);
		}
		if (JSON_TYPES.includes(baseType)) {
			return JSON.parse(rawItem);
		}
		return rawItem;
	});

	return JSON.stringify(mapped);
}
