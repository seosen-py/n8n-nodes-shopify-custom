export const USER_ERRORS_FIELDS = `
	userErrors {
		field
		message
	}
`;

export const METAFIELD_FIELDS = `
	id
	namespace
	key
	type
	value
	compareDigest
	updatedAt
`;

export const METAFIELD_REFERENCE_FIELDS = `
	__typename
	... on Node {
		id
	}
	... on Metaobject {
		type
		handle
		displayName
		fields {
			key
			type
			value
			jsonValue
		}
	}
`;

export const OPTIONAL_METAFIELD_REFERENCE_CONNECTIONS = `
	reference @include(if: $resolveMetafieldReferences) {
		${METAFIELD_REFERENCE_FIELDS}
	}
	references(first: $metafieldReferencesFirst) @include(if: $resolveMetafieldReferences) {
		nodes {
			${METAFIELD_REFERENCE_FIELDS}
		}
	}
`;

export const OPTIONAL_METAFIELDS_CONNECTION = `
	metafields(first: $metafieldsFirst, keys: $metafieldKeys) @include(if: $includeMetafields) {
		nodes {
			${METAFIELD_FIELDS}
			${OPTIONAL_METAFIELD_REFERENCE_CONNECTIONS}
		}
	}
`;

export const METAFIELD_DEFINITION_FIELDS = `
	id
	name
	namespace
	key
	type {
		name
	}
	description
	ownerType
`;

export const SEO_FIELDS = `
	title
	description
`;
