import { USER_ERRORS_FIELDS } from './commonFragments';

const PUBLICATION_FIELDS = `
	id
	autoPublish
	catalog {
		id
		title
	}
`;

const PUBLISHABLE_PUBLICATION_COUNTS = `
	... on Node {
		id
	}
	availablePublicationsCount {
		count
	}
	resourcePublicationsCount {
		count
	}
`;

export const PUBLICATION_GET_MANY_QUERY = `
query PublicationGetMany($first: Int!, $after: String) {
	publications(first: $first, after: $after) {
		nodes {
			${PUBLICATION_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const PUBLISHABLE_PUBLISH_MUTATION = `
mutation PublishablePublish($id: ID!, $input: [PublicationInput!]!) {
	publishablePublish(id: $id, input: $input) {
		publishable {
			${PUBLISHABLE_PUBLICATION_COUNTS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const PUBLISHABLE_UNPUBLISH_MUTATION = `
mutation PublishableUnpublish($id: ID!, $input: [PublicationInput!]!) {
	publishableUnpublish(id: $id, input: $input) {
		publishable {
			${PUBLISHABLE_PUBLICATION_COUNTS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;
