import { OPTIONAL_METAFIELDS_CONNECTION, SEO_FIELDS, USER_ERRORS_FIELDS } from './commonFragments';

export const PRODUCT_CREATE_MUTATION = `
mutation ProductCreate($product: ProductCreateInput!) {
	productCreate(product: $product) {
		product {
			id
			title
			handle
			status
			seo {
				${SEO_FIELDS}
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const PRODUCT_GET_QUERY = `
query ProductGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	product(id: $id) {
		id
		title
		handle
		status
		descriptionHtml
		vendor
		productType
		tags
		seo {
			${SEO_FIELDS}
		}
		updatedAt
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const PRODUCT_GET_MANY_QUERY = `
query ProductGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: ProductSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			title
			handle
			status
			vendor
			productType
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

export const PRODUCT_UPDATE_MUTATION = `
mutation ProductUpdate($product: ProductUpdateInput!) {
	productUpdate(product: $product) {
		product {
			id
			title
			handle
			status
			seo {
				${SEO_FIELDS}
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const PRODUCT_DELETE_MUTATION = `
mutation ProductDelete($input: ProductDeleteInput!) {
	productDelete(input: $input) {
		deletedProductId
		${USER_ERRORS_FIELDS}
	}
}
`;
