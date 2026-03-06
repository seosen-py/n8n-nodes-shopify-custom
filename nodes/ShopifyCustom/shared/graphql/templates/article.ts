import { OPTIONAL_METAFIELDS_CONNECTION, USER_ERRORS_FIELDS } from './commonFragments';

export const ARTICLE_CREATE_MUTATION = `
mutation ArticleCreate($article: ArticleCreateInput!) {
	articleCreate(article: $article) {
		article {
			id
			title
			handle
			image {
				altText
				url
			}
			isPublished
			publishedAt
			blog {
				id
				title
			}
			author {
				name
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const ARTICLE_GET_QUERY = `
query ArticleGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	article(id: $id) {
		id
		title
		handle
		image {
			altText
			url
		}
		body
		summary
		tags
		templateSuffix
		isPublished
		publishedAt
		createdAt
		updatedAt
		blog {
			id
			title
		}
		author {
			name
		}
		${OPTIONAL_METAFIELDS_CONNECTION}
	}
}
`;

export const ARTICLE_GET_MANY_QUERY = `
query ArticleGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: ArticleSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
) {
	articles(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			id
			title
			handle
			image {
				altText
				url
			}
			isPublished
			publishedAt
			blog {
				id
				title
			}
			author {
				name
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

export const ARTICLE_UPDATE_MUTATION = `
mutation ArticleUpdate($id: ID!, $article: ArticleUpdateInput!) {
	articleUpdate(id: $id, article: $article) {
		article {
			id
			title
			handle
			image {
				altText
				url
			}
			isPublished
			publishedAt
			blog {
				id
				title
			}
			author {
				name
			}
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const ARTICLE_DELETE_MUTATION = `
mutation ArticleDelete($id: ID!) {
	articleDelete(id: $id) {
		deletedArticleId
		${USER_ERRORS_FIELDS}
	}
}
`;
