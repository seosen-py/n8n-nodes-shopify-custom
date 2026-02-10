import { METAFIELD_DEFINITION_FIELDS, METAFIELD_FIELDS, USER_ERRORS_FIELDS } from './commonFragments';

const OWNER_SINGLE_METAFIELD_SELECTION = `
... on Product {
	id
	metafield(namespace: $namespace, key: $key) {
		${METAFIELD_FIELDS}
	}
}
... on ProductVariant {
	id
	metafield(namespace: $namespace, key: $key) {
		${METAFIELD_FIELDS}
	}
}
... on Collection {
	id
	metafield(namespace: $namespace, key: $key) {
		${METAFIELD_FIELDS}
	}
}
... on Customer {
	id
	metafield(namespace: $namespace, key: $key) {
		${METAFIELD_FIELDS}
	}
}
... on Order {
	id
	metafield(namespace: $namespace, key: $key) {
		${METAFIELD_FIELDS}
	}
}
... on DraftOrder {
	id
	metafield(namespace: $namespace, key: $key) {
		${METAFIELD_FIELDS}
	}
}
`;

const OWNER_CONNECTION_METAFIELDS_SELECTION = `
... on Product {
	id
	metafields(first: $first, after: $after, namespace: $namespace) {
		nodes {
			${METAFIELD_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
... on ProductVariant {
	id
	metafields(first: $first, after: $after, namespace: $namespace) {
		nodes {
			${METAFIELD_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
... on Collection {
	id
	metafields(first: $first, after: $after, namespace: $namespace) {
		nodes {
			${METAFIELD_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
... on Customer {
	id
	metafields(first: $first, after: $after, namespace: $namespace) {
		nodes {
			${METAFIELD_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
... on Order {
	id
	metafields(first: $first, after: $after, namespace: $namespace) {
		nodes {
			${METAFIELD_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
... on DraftOrder {
	id
	metafields(first: $first, after: $after, namespace: $namespace) {
		nodes {
			${METAFIELD_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const METAFIELD_SET_MUTATION = `
mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
	metafieldsSet(metafields: $metafields) {
		metafields {
			${METAFIELD_FIELDS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const METAFIELD_DELETE_MUTATION = `
mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
	metafieldsDelete(metafields: $metafields) {
		deletedMetafields {
			ownerId
			namespace
			key
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const METAFIELD_GET_QUERY = `
query MetafieldGet($ownerId: ID!, $namespace: String!, $key: String!) {
	nodes(ids: [$ownerId]) {
		${OWNER_SINGLE_METAFIELD_SELECTION}
	}
}
`;

export const METAFIELD_GET_MANY_QUERY = `
query MetafieldGetMany($ownerId: ID!, $first: Int!, $after: String, $namespace: String) {
	nodes(ids: [$ownerId]) {
		${OWNER_CONNECTION_METAFIELDS_SELECTION}
	}
}
`;

export const METAFIELD_DEFINITION_LIST_QUERY = `
query MetafieldDefinitionList($ownerType: MetafieldOwnerType!, $first: Int!, $after: String, $query: String) {
	metafieldDefinitions(ownerType: $ownerType, first: $first, after: $after, query: $query) {
		nodes {
			${METAFIELD_DEFINITION_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const METAFIELD_DEFINITION_GET_QUERY = `
query MetafieldDefinitionGet($id: ID!) {
	node(id: $id) {
		... on MetafieldDefinition {
			${METAFIELD_DEFINITION_FIELDS}
			validations {
				name
				value
				type
			}
		}
	}
}
`;

export const METAFIELD_DEFINITION_CREATE_MUTATION = `
mutation MetafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
	metafieldDefinitionCreate(definition: $definition) {
		createdDefinition {
			${METAFIELD_DEFINITION_FIELDS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const METAFIELD_DEFINITION_UPDATE_MUTATION = `
mutation MetafieldDefinitionUpdate($definition: MetafieldDefinitionUpdateInput!) {
	metafieldDefinitionUpdate(definition: $definition) {
		updatedDefinition {
			${METAFIELD_DEFINITION_FIELDS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const METAFIELD_DEFINITION_DELETE_MUTATION = `
mutation MetafieldDefinitionDelete($id: ID!, $deleteAllAssociatedMetafields: Boolean) {
	metafieldDefinitionDelete(
		id: $id
		deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields
	) {
		deletedDefinitionId
		${USER_ERRORS_FIELDS}
	}
}
`;

export const METAFIELD_DEFINITION_TYPES_QUERY = `
query MetafieldDefinitionTypes {
	metafieldDefinitionTypes {
		name
		category
		supportedValidations {
			name
			type
		}
	}
}
`;
