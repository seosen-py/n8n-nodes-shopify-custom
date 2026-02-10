import { OPTIONAL_METAFIELDS_CONNECTION, USER_ERRORS_FIELDS } from './commonFragments';

export const ORDER_CREATE_MUTATION = `
mutation OrderCreate($order: OrderCreateOrderInput!) {
	orderCreate(order: $order) {
		order {
			id
			name
			email
			displayFinancialStatus
			displayFulfillmentStatus
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const ORDER_GET_QUERY = `
query OrderGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	order(id: $id) {
		id
		name
		email
		note
		tags
		displayFinancialStatus
		displayFulfillmentStatus
		updatedAt
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const ORDER_GET_MANY_QUERY = `
query OrderGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: OrderSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	orders(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			name
			email
			displayFinancialStatus
			displayFulfillmentStatus
			updatedAt
			${OPTIONAL_METAFIELDS_CONNECTION}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const ORDER_UPDATE_MUTATION = `
mutation OrderUpdate($input: OrderInput!) {
	orderUpdate(input: $input) {
		order {
			id
			name
			email
			note
			tags
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const ORDER_DELETE_MUTATION = `
mutation OrderDelete($orderId: ID!) {
	orderDelete(orderId: $orderId) {
		deletedId
		${USER_ERRORS_FIELDS}
	}
}
`;
