import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export interface IShopifyUserError {
	field?: string[] | null;
	message: string;
	code?: string | null;
}

function renderFieldPath(field: string[] | null | undefined): string {
	if (!field || field.length === 0) {
		return '';
	}
	return field.join('.');
}

export function throwIfUserErrors(
	executeFunctions: IExecuteFunctions,
	userErrors: IShopifyUserError[] | null | undefined,
	itemIndex: number,
): void {
	if (!userErrors || userErrors.length === 0) {
		return;
	}

	const messages = userErrors.map((userError) => {
		const fieldPath = renderFieldPath(userError.field);
		const code = userError.code ? ` [${userError.code}]` : '';
		return fieldPath
			? `${userError.message}${code} (field: ${fieldPath})`
			: `${userError.message}${code}`;
	});

	throw new NodeOperationError(
		executeFunctions.getNode(),
		`Shopify user error: ${messages.join('; ')}`,
		{ itemIndex },
	);
}

export function getErrorData(error: unknown): IDataObject {
	if (error instanceof Error) {
		return {
			message: error.message,
			name: error.name,
			stack: error.stack,
		};
	}

	return {
		message: String(error),
	};
}
