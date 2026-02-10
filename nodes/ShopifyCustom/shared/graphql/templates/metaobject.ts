import { USER_ERRORS_FIELDS } from './commonFragments';

const METAOBJECT_REFERENCE_FIELDS = `
	__typename
	... on Node {
		id
	}
	... on Metaobject {
		type
		handle
		displayName
	}
`;

const METAOBJECT_FIELDS = `
	id
	type
	handle
	displayName
	updatedAt
	fields {
		key
		type
		value
		jsonValue
		reference {
			${METAOBJECT_REFERENCE_FIELDS}
		}
		references(first: 50) {
			nodes {
				${METAOBJECT_REFERENCE_FIELDS}
			}
		}
	}
`;

export const METAOBJECT_GET_QUERY = `
query MetaobjectGet($id: ID!) {
	metaobject(id: $id) {
		${METAOBJECT_FIELDS}
	}
}
`;

export const METAOBJECT_GET_MANY_QUERY = `
query MetaobjectGetMany(
	$type: String!
	$first: Int!
	$after: String
	$query: String
	$sortKey: String
	$reverse: Boolean
) {
	metaobjects(type: $type, first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			${METAOBJECT_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const METAOBJECT_CREATE_MUTATION = `
mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
	metaobjectCreate(metaobject: $metaobject) {
		metaobject {
			${METAOBJECT_FIELDS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const METAOBJECT_UPDATE_MUTATION = `
mutation MetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
	metaobjectUpdate(id: $id, metaobject: $metaobject) {
		metaobject {
			${METAOBJECT_FIELDS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const METAOBJECT_DELETE_MUTATION = `
mutation MetaobjectDelete($id: ID!) {
	metaobjectDelete(id: $id) {
		deletedId
		${USER_ERRORS_FIELDS}
	}
}
`;

