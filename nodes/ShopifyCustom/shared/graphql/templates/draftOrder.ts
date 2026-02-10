import { OPTIONAL_METAFIELDS_CONNECTION, USER_ERRORS_FIELDS } from './commonFragments';

export const DRAFT_ORDER_CREATE_MUTATION = `
mutation DraftOrderCreate($input: DraftOrderInput!) {
	draftOrderCreate(input: $input) {
		draftOrder {
			id
			name
			email
			status
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const DRAFT_ORDER_GET_QUERY = `
query DraftOrderGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	draftOrder(id: $id) {
		id
		name
		email
		note2
		status
		tags
		updatedAt
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const DRAFT_ORDER_GET_MANY_QUERY = `
query DraftOrderGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: DraftOrderSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	draftOrders(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			name
			email
			status
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

export const DRAFT_ORDER_UPDATE_MUTATION = `
mutation DraftOrderUpdate($id: ID!, $input: DraftOrderInput!) {
	draftOrderUpdate(id: $id, input: $input) {
		draftOrder {
			id
			name
			email
			status
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const DRAFT_ORDER_DELETE_MUTATION = `
mutation DraftOrderDelete($input: DraftOrderDeleteInput!) {
	draftOrderDelete(input: $input) {
		deletedId
		${USER_ERRORS_FIELDS}
	}
}
`;
