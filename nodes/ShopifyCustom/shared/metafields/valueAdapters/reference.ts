import type { IDataObject } from 'n8n-workflow';
import { LIST_REFERENCE_TYPES, REFERENCE_TYPES, isTypeIn } from './constants';

function isObject(value: unknown): value is IDataObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseManualIds(value: unknown): string[] {
	if (value === undefined || value === null) {
		return [];
	}
	return String(value)
		.split(/[\n,]/g)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

function parseJsonStringArray(value: unknown): string[] {
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
			throw new Error('Reference list values must be a valid JSON array');
		}

		if (!Array.isArray(parsed)) {
			throw new Error('Reference list values must be a JSON array');
		}

		return normalize(parsed);
	}

	throw new Error('Reference list values must be a JSON array');
}

function parseReferenceListItems(value: unknown): string[] {
	if (!isObject(value) || !Array.isArray(value.items)) {
		return [];
	}

	return value.items
		.filter(isObject)
		.map((entry) => String(entry.gid ?? '').trim())
		.filter((gid) => gid.length > 0);
}

export function serializeReferenceMetafieldValue(type: string, item: IDataObject): string | undefined {
	if (isTypeIn(type, REFERENCE_TYPES)) {
		const directValue =
			(typeof item.referenceGid === 'string' && item.referenceGid.trim()) ||
			(typeof item.referenceId === 'string' && item.referenceId.trim()) ||
			parseManualIds(item.manualReferenceIds)[0];
		if (!directValue) {
			return undefined;
		}
		return String(directValue);
	}

	if (isTypeIn(type, LIST_REFERENCE_TYPES)) {
		const jsonArrayIds = parseJsonStringArray(item.listStringArray);
		const listItems = parseReferenceListItems(item.listReferenceItems);
		const selectedIds = Array.isArray(item.referenceIds)
			? item.referenceIds.map((value) => String(value))
			: [];
		const manualIds = parseManualIds(item.manualReferenceIds);
		const uniqueIds = [...new Set([...jsonArrayIds, ...listItems, ...selectedIds, ...manualIds])];
		if (uniqueIds.length === 0) {
			return undefined;
		}
		return JSON.stringify(uniqueIds);
	}

	return undefined;
}
