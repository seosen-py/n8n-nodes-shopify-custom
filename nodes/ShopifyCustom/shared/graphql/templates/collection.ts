import { OPTIONAL_METAFIELDS_CONNECTION, SEO_FIELDS, USER_ERRORS_FIELDS } from './commonFragments';

export const COLLECTION_CREATE_MUTATION = `
mutation CollectionCreate($input: CollectionInput!) {
	collectionCreate(input: $input) {
		collection {
			id
			title
			handle
			seo {
				${SEO_FIELDS}
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const COLLECTION_GET_QUERY = `
query CollectionGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	collection(id: $id) {
		id
		title
		handle
		descriptionHtml
		templateSuffix
		seo {
			${SEO_FIELDS}
		}
		updatedAt
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const COLLECTION_GET_MANY_QUERY = `
query CollectionGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: CollectionSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	collections(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			title
			handle
			seo {
				${SEO_FIELDS}
			}
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

export const COLLECTION_UPDATE_MUTATION = `
mutation CollectionUpdate($input: CollectionInput!) {
	collectionUpdate(input: $input) {
		collection {
			id
			title
			handle
			seo {
				${SEO_FIELDS}
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const COLLECTION_DELETE_MUTATION = `
mutation CollectionDelete($input: CollectionDeleteInput!) {
	collectionDelete(input: $input) {
		deletedCollectionId
		${USER_ERRORS_FIELDS}
	}
}
`;
