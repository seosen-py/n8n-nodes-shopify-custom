import type { IDataObject } from 'n8n-workflow';
import {
	BOOLEAN_TYPES,
	DATE_TIME_TYPES,
	DATE_TYPES,
	INTEGER_TYPES,
	JSON_TYPES,
	NUMBER_TYPES,
	TEXT_TYPES,
	isTypeIn,
} from './constants';

function isEmpty(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

function asIsoDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid date value: ${value}`);
	}
	return date.toISOString().slice(0, 10);
}

function asIsoDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid date time value: ${value}`);
	}
	return date.toISOString();
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'");
}

function htmlToTextLines(html: string): string[] {
	const withLineBreaks = html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, '\n');
	const withoutTags = withLineBreaks.replace(/<[^>]*>/g, '');

	return decodeHtmlEntities(withoutTags)
		.split(/\r?\n/g)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

function toRichTextDocumentFromHtml(html: string): string {
	const lines = htmlToTextLines(html);

	const children = (lines.length > 0 ? lines : ['']).map((line) => ({
		type: 'paragraph',
		children: [
			{
				type: 'text',
				value: line,
			},
		],
	}));

	return JSON.stringify({
		type: 'root',
		children,
	});
}

export function serializeScalarMetafieldValue(type: string, item: IDataObject): string | undefined {
	if (isTypeIn(type, BOOLEAN_TYPES)) {
		return String(Boolean(item.booleanValue));
	}

	if (isTypeIn(type, INTEGER_TYPES)) {
		if (isEmpty(item.integerValue)) {
			return undefined;
		}
		return String(Math.trunc(Number(item.integerValue)));
	}

	if (isTypeIn(type, NUMBER_TYPES)) {
		if (isEmpty(item.numberValue)) {
			return undefined;
		}
		return String(Number(item.numberValue));
	}

	if (isTypeIn(type, TEXT_TYPES)) {
		if (type === 'email' && !isEmpty(item.emailValue)) {
			return String(item.emailValue);
		}

		if (isEmpty(item.textValue)) {
			return undefined;
		}
		return String(item.textValue);
	}

	if (isTypeIn(type, DATE_TYPES)) {
		if (isEmpty(item.dateValue)) {
			return undefined;
		}
		return asIsoDate(String(item.dateValue));
	}

	if (isTypeIn(type, DATE_TIME_TYPES)) {
		if (isEmpty(item.dateTimeValue)) {
			return undefined;
		}
		return asIsoDateTime(String(item.dateTimeValue));
	}

	if (isTypeIn(type, JSON_TYPES)) {
		if (type === 'rich_text_field' && !isEmpty(item.richTextHtml)) {
			return toRichTextDocumentFromHtml(String(item.richTextHtml));
		}

		if (isEmpty(item.jsonValue)) {
			return undefined;
		}
		const text = String(item.jsonValue);
		JSON.parse(text);
		return text;
	}

	if (isEmpty(item.textValue)) {
		return undefined;
	}

	return String(item.textValue);
}
