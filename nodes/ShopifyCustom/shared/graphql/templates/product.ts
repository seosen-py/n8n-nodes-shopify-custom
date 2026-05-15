import { OPTIONAL_METAFIELDS_CONNECTION, SEO_FIELDS, USER_ERRORS_FIELDS } from './commonFragments';

const PRODUCT_CATEGORY_FIELDS = `
	id
	name
	fullName
	level
	isLeaf
	isArchived
	parentId
`;

export const PRODUCT_CREATE_MUTATION = `
mutation ProductCreate($product: ProductCreateInput!) {
	productCreate(product: $product) {
		product {
			id
			title
			handle
			status
			variants(first: 10) {
				nodes {
					id
					title
					sku
					price
					compareAtPrice
					inventoryQuantity
					inventoryItem {
						id
						sku
						tracked
						requiresShipping
					}
				}
			}
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
	$includeDescriptionHtml: Boolean!
	$includeVendor: Boolean!
	$includeProductType: Boolean!
	$includeTags: Boolean!
	$includeCategory: Boolean!
	$includeSeo: Boolean!
	$includeVariants: Boolean!
	$variantsFirst: Int!
	$includeVariantInventoryItem: Boolean!
	$includeVariantInventoryQuantity: Boolean!
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
		descriptionHtml @include(if: $includeDescriptionHtml)
		vendor @include(if: $includeVendor)
		productType @include(if: $includeProductType)
		tags @include(if: $includeTags)
		category @include(if: $includeCategory) {
			${PRODUCT_CATEGORY_FIELDS}
		}
		seo @include(if: $includeSeo) {
			${SEO_FIELDS}
		}
		variants(first: $variantsFirst) @include(if: $includeVariants) {
			nodes {
				id
				title
				sku
				price
				compareAtPrice
				inventoryQuantity @include(if: $includeVariantInventoryQuantity)
				inventoryItem @include(if: $includeVariantInventoryItem) {
					id
					sku
					tracked
					requiresShipping
				}
			}
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
	$includeDescriptionHtml: Boolean!
	$includeVendor: Boolean!
	$includeProductType: Boolean!
	$includeTags: Boolean!
	$includeCategory: Boolean!
	$includeSeo: Boolean!
	$includeVariants: Boolean!
	$variantsFirst: Int!
	$includeVariantInventoryItem: Boolean!
	$includeVariantInventoryQuantity: Boolean!
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
			descriptionHtml @include(if: $includeDescriptionHtml)
			vendor @include(if: $includeVendor)
			productType @include(if: $includeProductType)
			tags @include(if: $includeTags)
			category @include(if: $includeCategory) {
				${PRODUCT_CATEGORY_FIELDS}
			}
			seo @include(if: $includeSeo) {
				${SEO_FIELDS}
			}
			variants(first: $variantsFirst) @include(if: $includeVariants) {
				nodes {
					id
					title
					sku
					price
					compareAtPrice
					inventoryQuantity @include(if: $includeVariantInventoryQuantity)
					inventoryItem @include(if: $includeVariantInventoryItem) {
						id
						sku
						tracked
						requiresShipping
					}
				}
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
			category {
				${PRODUCT_CATEGORY_FIELDS}
			}
			seo {
				${SEO_FIELDS}
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const PRODUCT_SET_CATEGORY_MUTATION = `
mutation ProductSetCategory($product: ProductUpdateInput!) {
	productUpdate(product: $product) {
		product {
			id
			title
			handle
			category {
				${PRODUCT_CATEGORY_FIELDS}
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
