import { USER_ERRORS_FIELDS } from './commonFragments';

export const INVENTORY_GET_QUERY = `
query InventoryGet(
	$id: ID!
	$includeInventoryLevels: Boolean!
	$inventoryLevelsFirst: Int!
	$inventoryQuantityNames: [String!]!
) {
	inventoryItem(id: $id) {
		id
		sku
		tracked
		requiresShipping
		countryCodeOfOrigin
		provinceCodeOfOrigin
		harmonizedSystemCode
		unitCost {
			amount
			currencyCode
		}
		updatedAt
		variant {
			id
			title
			product {
				id
				title
			}
		}
		inventoryLevels(first: $inventoryLevelsFirst) @include(if: $includeInventoryLevels) {
			nodes {
				id
				updatedAt
				location {
					id
					name
				}
				quantities(names: $inventoryQuantityNames) {
					id
					name
					quantity
					updatedAt
				}
			}
		}
	}
}
`;

export const INVENTORY_GET_MANY_QUERY = `
query InventoryGetMany(
	$first: Int!
	$after: String
	$query: String
	$reverse: Boolean
	$includeInventoryLevels: Boolean!
	$inventoryLevelsFirst: Int!
	$inventoryQuantityNames: [String!]!
) {
	inventoryItems(first: $first, after: $after, query: $query, reverse: $reverse) {
		nodes {
			id
			sku
			tracked
			requiresShipping
			updatedAt
			variant {
				id
				title
				product {
					id
					title
				}
			}
			inventoryLevels(first: $inventoryLevelsFirst) @include(if: $includeInventoryLevels) {
				nodes {
					id
					updatedAt
					location {
						id
						name
					}
					quantities(names: $inventoryQuantityNames) {
						id
						name
						quantity
						updatedAt
					}
				}
			}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const INVENTORY_UPDATE_MUTATION = `
mutation InventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
	inventoryItemUpdate(id: $id, input: $input) {
		inventoryItem {
			id
			sku
			tracked
			requiresShipping
			countryCodeOfOrigin
			provinceCodeOfOrigin
			harmonizedSystemCode
			unitCost {
				amount
				currencyCode
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const INVENTORY_SET_QUANTITIES_MUTATION = `
mutation InventorySetQuantities($input: InventorySetQuantitiesInput!) {
	inventorySetQuantities(input: $input) {
		inventoryAdjustmentGroup {
			id
			createdAt
			reason
			referenceDocumentUri
			changes {
				name
				delta
				quantityAfterChange
				item {
					id
					sku
				}
				location {
					id
					name
				}
			}
		}
		userErrors {
			field
			message
			code
		}
	}
}
`;

export const INVENTORY_ADJUST_QUANTITIES_MUTATION = `
mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
	inventoryAdjustQuantities(input: $input) {
		inventoryAdjustmentGroup {
			id
			createdAt
			reason
			referenceDocumentUri
			changes {
				name
				delta
				quantityAfterChange
				item {
					id
					sku
				}
				location {
					id
					name
				}
			}
		}
		userErrors {
			field
			message
			code
		}
	}
}
`;
