export const TAXONOMY_CATEGORY_FIELDS = `
	id
	name
	fullName
	level
	isLeaf
	isRoot
	isArchived
	parentId @include(if: $includeParentId)
	childrenIds @include(if: $includeChildrenIds)
	ancestorIds @include(if: $includeAncestorIds)
`;

export const TAXONOMY_CATEGORIES_QUERY = `
query TaxonomyCategories(
	$first: Int!
	$after: String
	$search: String
	$childrenOf: ID
	$descendantsOf: ID
	$includeParentId: Boolean!
	$includeChildrenIds: Boolean!
	$includeAncestorIds: Boolean!
) {
	taxonomy {
		categories(
			first: $first
			after: $after
			search: $search
			childrenOf: $childrenOf
			descendantsOf: $descendantsOf
		) {
			nodes {
				${TAXONOMY_CATEGORY_FIELDS}
			}
			pageInfo {
				hasNextPage
				endCursor
			}
		}
	}
}
`;

export const TAXONOMY_CATEGORY_GET_QUERY = `
query TaxonomyCategoryGet(
	$id: ID!
	$includeParentId: Boolean!
	$includeChildrenIds: Boolean!
	$includeAncestorIds: Boolean!
) {
	node(id: $id) {
		... on TaxonomyCategory {
			${TAXONOMY_CATEGORY_FIELDS}
		}
	}
}
`;

export const TAXONOMY_CATEGORY_ATTRIBUTES_QUERY = `
query TaxonomyCategoryAttributes(
	$id: ID!
	$first: Int!
	$valuesFirst: Int!
	$includeParentId: Boolean!
	$includeChildrenIds: Boolean!
	$includeAncestorIds: Boolean!
) {
	node(id: $id) {
		... on TaxonomyCategory {
			${TAXONOMY_CATEGORY_FIELDS}
			attributes(first: $first) {
				nodes {
					__typename
					... on TaxonomyAttribute {
						id
					}
					... on TaxonomyChoiceListAttribute {
						id
						name
						values(first: $valuesFirst) {
							nodes {
								id
								name
							}
						}
					}
					... on TaxonomyMeasurementAttribute {
						id
						name
					}
				}
			}
		}
	}
}
`;
