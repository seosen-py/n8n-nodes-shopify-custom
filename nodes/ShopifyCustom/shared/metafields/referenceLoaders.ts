import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { assertNoGraphQLErrors, executeShopifyGraphql } from '../graphql/client';

type ReferenceResource = 'product' | 'productVariant' | 'collection' | 'customer' | 'order' | 'draftOrder';

const REFERENCE_QUERY_MAP: Record<ReferenceResource, string> = {
	product: `
		query ProductReferences($first: Int!) {
			products(first: $first, sortKey: UPDATED_AT, reverse: true) {
				nodes {
					id
					title
				}
			}
		}
	`,
	productVariant: `
		query ProductVariantReferences($first: Int!) {
			productVariants(first: $first, sortKey: UPDATED_AT, reverse: true) {
				nodes {
					id
					title
					sku
				}
			}
		}
	`,
	collection: `
		query CollectionReferences($first: Int!) {
			collections(first: $first, sortKey: UPDATED_AT, reverse: true) {
				nodes {
					id
					title
				}
			}
		}
	`,
	customer: `
		query CustomerReferences($first: Int!) {
			customers(first: $first, sortKey: UPDATED_AT, reverse: true) {
				nodes {
					id
					displayName
					email
				}
			}
		}
	`,
	order: `
		query OrderReferences($first: Int!) {
			orders(first: $first, sortKey: UPDATED_AT, reverse: true) {
				nodes {
					id
					name
					email
				}
			}
		}
	`,
	draftOrder: `
		query DraftOrderReferences($first: Int!) {
			draftOrders(first: $first, sortKey: UPDATED_AT, reverse: true) {
				nodes {
					id
					name
					email
				}
			}
		}
	`,
};

function normalizeReferenceResource(rawValue: unknown): ReferenceResource {
	const parsed = String(rawValue ?? '').trim();
	if (
		parsed === 'product' ||
		parsed === 'productVariant' ||
		parsed === 'collection' ||
		parsed === 'customer' ||
		parsed === 'order' ||
		parsed === 'draftOrder'
	) {
		return parsed;
	}
	return 'product';
}

function getNodeDisplayName(node: Record<string, unknown>, resource: ReferenceResource): string {
	switch (resource) {
		case 'product':
		case 'collection':
			return String(node.title ?? node.id);
		case 'productVariant':
			return `${String(node.title ?? 'Variant')} (${String(node.sku ?? 'no sku')})`;
		case 'customer':
			return `${String(node.displayName ?? 'Customer')} (${String(node.email ?? 'no email')})`;
		case 'order':
		case 'draftOrder':
			return `${String(node.name ?? 'Order')} (${String(node.email ?? 'no email')})`;
		default:
			return String(node.id);
	}
}

export async function getReferenceOptions(
	context: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let referenceResource: ReferenceResource = 'product';
	try {
		referenceResource = normalizeReferenceResource(
			context.getCurrentNodeParameter('referenceResource'),
		);
	} catch {
		referenceResource = 'product';
	}
	const response = await executeShopifyGraphql<Record<string, { nodes: Array<Record<string, unknown>> }>>(
		context,
		REFERENCE_QUERY_MAP[referenceResource],
		{
			first: 50,
		},
		0,
	);
	assertNoGraphQLErrors(context, response, 0);

	const rootValue = response.data?.[`${referenceResource}s`] ?? response.data?.[referenceResource];
	const nodes = rootValue?.nodes ?? [];
	return nodes
		.map((node) => ({
			name: getNodeDisplayName(node, referenceResource),
			value: String(node.id),
		}))
		.filter((item) => item.value.length > 0);
}
