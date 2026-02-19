import { USER_ERRORS_FIELDS } from './commonFragments';

const FILE_NODE_FIELDS = `
	__typename
	id
	alt
	createdAt
	updatedAt
	fileStatus
	preview {
		status
		image {
			url
			width
			height
		}
	}
	... on GenericFile {
		url
		mimeType
		originalFileSize
	}
	... on MediaImage {
		mimeType
		image {
			url
			width
			height
		}
	}
`;

export const FILE_GET_MANY_QUERY = `
query FileGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: FileSortKeys
	$reverse: Boolean
) {
	files(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			${FILE_NODE_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const FILE_UPDATE_MUTATION = `
mutation FileUpdate($files: [FileUpdateInput!]!) {
	fileUpdate(files: $files) {
		files {
			${FILE_NODE_FIELDS}
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const FILE_DELETE_MUTATION = `
mutation FileDelete($fileIds: [ID!]!) {
	fileDelete(fileIds: $fileIds) {
		deletedFileIds
		${USER_ERRORS_FIELDS}
	}
}
`;

