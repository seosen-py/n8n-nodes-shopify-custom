import { OPTIONAL_METAFIELDS_CONNECTION, USER_ERRORS_FIELDS } from './commonFragments';

export const BLOG_CREATE_MUTATION = `
mutation BlogCreate($blog: BlogCreateInput!) {
	blogCreate(blog: $blog) {
		blog {
			id
			title
			handle
			templateSuffix
			commentPolicy
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const BLOG_GET_QUERY = `
query BlogGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	blog(id: $id) {
		id
		title
		handle
		templateSuffix
		commentPolicy
		tags
		createdAt
		updatedAt
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const BLOG_GET_MANY_QUERY = `
query BlogGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: BlogSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	blogs(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			title
			handle
			templateSuffix
			commentPolicy
			tags
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

export const BLOG_UPDATE_MUTATION = `
mutation BlogUpdate($id: ID!, $blog: BlogUpdateInput!) {
	blogUpdate(id: $id, blog: $blog) {
		blog {
			id
			title
			handle
			templateSuffix
			commentPolicy
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const BLOG_DELETE_MUTATION = `
mutation BlogDelete($id: ID!) {
	blogDelete(id: $id) {
		deletedBlogId
		${USER_ERRORS_FIELDS}
	}
}
`;
