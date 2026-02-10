import type { IDataObject } from 'n8n-workflow';

export type ShopifyOutputMode = 'simplified' | 'raw' | 'selectedFields';

function isObject(value: unknown): value is IDataObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getByPath(source: unknown, path: string): unknown {
	if (!path) {
		return undefined;
	}
	const chunks = path.split('.').filter((chunk) => chunk.length > 0);
	let current: unknown = source;
	for (const chunk of chunks) {
		if (!isObject(current) && !Array.isArray(current)) {
			return undefined;
		}

		if (Array.isArray(current)) {
			const index = Number(chunk);
			if (Number.isNaN(index)) {
				return undefined;
			}
			current = current[index];
			continue;
		}

		current = (current as IDataObject)[chunk];
	}
	return current;
}

function setByPath(target: IDataObject, path: string, value: unknown): void {
	const chunks = path.split('.').filter((chunk) => chunk.length > 0);
	if (chunks.length === 0) {
		return;
	}

	let current: IDataObject = target;
	for (let index = 0; index < chunks.length - 1; index += 1) {
		const chunk = chunks[index];
		if (!isObject(current[chunk])) {
			current[chunk] = {};
		}
		current = current[chunk] as IDataObject;
	}

	current[chunks[chunks.length - 1]] = value as never;
}

function normalizeToArray(payload: unknown): IDataObject[] {
	if (Array.isArray(payload)) {
		return payload.filter(isObject);
	}
	if (isObject(payload)) {
		return [payload];
	}
	return [];
}

function toSelectedFields(items: IDataObject[], selectedFieldsRaw: string): IDataObject[] {
	const fields = selectedFieldsRaw
		.split(',')
		.map((field) => field.trim())
		.filter((field) => field.length > 0);
	if (fields.length === 0) {
		return items;
	}

	return items.map((item) => {
		const selectedItem: IDataObject = {};
		for (const field of fields) {
			const value = getByPath(item, field);
			if (value !== undefined) {
				setByPath(selectedItem, field, value);
			}
		}
		return selectedItem;
	});
}

export function mapOutputItems(
	mode: ShopifyOutputMode,
	simplifiedPayload: unknown,
	rawPayload: IDataObject,
	selectedFieldsRaw: string,
): IDataObject[] {
	if (mode === 'raw') {
		return [rawPayload];
	}

	const simplifiedItems = normalizeToArray(simplifiedPayload);
	if (mode === 'selectedFields') {
		return toSelectedFields(simplifiedItems, selectedFieldsRaw);
	}

	return simplifiedItems.length > 0 ? simplifiedItems : [rawPayload];
}
