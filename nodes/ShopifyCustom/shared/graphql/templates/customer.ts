import { OPTIONAL_METAFIELDS_CONNECTION, USER_ERRORS_FIELDS } from './commonFragments';

export const CUSTOMER_CREATE_MUTATION = `
mutation CustomerCreate($input: CustomerInput!) {
	customerCreate(input: $input) {
		customer {
			id
			email
			firstName
			lastName
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const CUSTOMER_GET_QUERY = `
query CustomerGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	customer(id: $id) {
		id
		email
		phone
		firstName
		lastName
		note
		taxExempt
		tags
		updatedAt
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const CUSTOMER_GET_MANY_QUERY = `
query CustomerGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: CustomerSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	customers(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			email
			firstName
			lastName
			phone
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

export const CUSTOMER_UPDATE_MUTATION = `
mutation CustomerUpdate($input: CustomerInput!) {
	customerUpdate(input: $input) {
		customer {
			id
			email
			firstName
			lastName
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const CUSTOMER_DELETE_MUTATION = `
mutation CustomerDelete($input: CustomerDeleteInput!) {
	customerDelete(input: $input) {
		deletedCustomerId
		${USER_ERRORS_FIELDS}
	}
}
`;
