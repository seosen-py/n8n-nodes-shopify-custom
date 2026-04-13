import { OPTIONAL_METAFIELDS_CONNECTION, USER_ERRORS_FIELDS } from './commonFragments';

export const PRODUCT_VARIANT_CREATE_MUTATION = `
mutation ProductVariantCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
	productVariantsBulkCreate(productId: $productId, variants: $variants) {
		productVariants {
			id
			title
			sku
			price
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const PRODUCT_VARIANT_GET_QUERY = `
query ProductVariantGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
	$includeAvailableForSale: Boolean!
	$includeInventoryItem: Boolean!
	$includeInventoryQuantity: Boolean!
	$includeProductHandle: Boolean!
	$includeImage: Boolean!
	$includeMedia: Boolean!
) {
	productVariant(id: $id) {
		id
		title
		sku
		barcode
		price
		compareAtPrice
		taxable
		updatedAt
		availableForSale @include(if: $includeAvailableForSale)
		inventoryItem @include(if: $includeInventoryItem) {
			id
			sku
			tracked
			requiresShipping
		}
		inventoryQuantity @include(if: $includeInventoryQuantity)
		product @include(if: $includeProductHandle) {
			id
			title
			handle
		}
		image @include(if: $includeImage) {
			altText
			url
		}
		media(first: 10) @include(if: $includeMedia) {
			nodes {
				__typename
				... on MediaImage {
					id
					image {
						url
						width
						height
					}
				}
			}
		}
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const PRODUCT_VARIANT_GET_MANY_QUERY = `
query ProductVariantGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: ProductVariantSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
	$includeAvailableForSale: Boolean!
	$includeInventoryItem: Boolean!
	$includeInventoryQuantity: Boolean!
	$includeProductHandle: Boolean!
	$includeImage: Boolean!
	$includeMedia: Boolean!
) {
	productVariants(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			title
			sku
			price
			updatedAt
			availableForSale @include(if: $includeAvailableForSale)
			inventoryItem @include(if: $includeInventoryItem) {
				id
				sku
				tracked
				requiresShipping
			}
			inventoryQuantity @include(if: $includeInventoryQuantity)
			product {
				id
				title
				handle @include(if: $includeProductHandle)
			}
			image @include(if: $includeImage) {
				altText
				url
			}
			media(first: 10) @include(if: $includeMedia) {
				nodes {
					__typename
					... on MediaImage {
						id
						image {
							url
							width
							height
						}
					}
				}
			}
			${OPTIONAL_METAFIELDS_CONNECTION}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const PRODUCT_VARIANT_UPDATE_MUTATION = `
mutation ProductVariantUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
	productVariantsBulkUpdate(productId: $productId, variants: $variants) {
		productVariants {
			id
			title
			sku
			price
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const PRODUCT_VARIANT_DELETE_MUTATION = `
mutation ProductVariantDelete($productId: ID!, $variantsIds: [ID!]!) {
	productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
		product {
			id
			title
		}
		${USER_ERRORS_FIELDS}
	}
}
`;
