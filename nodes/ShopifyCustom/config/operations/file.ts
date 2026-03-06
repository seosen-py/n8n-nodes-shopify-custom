import type { INodeProperties } from 'n8n-workflow';
import type { IShopifyOperationConfig } from './types';

const FILE_SORT_OPTIONS = [
	{ name: 'Created At', value: 'CREATED_AT' },
	{ name: 'Filename', value: 'FILENAME' },
	{ name: 'ID', value: 'ID' },
	{ name: 'Original Upload Size', value: 'ORIGINAL_UPLOAD_SIZE' },
	{ name: 'Updated At', value: 'UPDATED_AT' },
];

const FILE_MEDIA_TYPE_OPTIONS = [
	{ name: 'Any', value: '' },
	{ name: 'Image', value: 'IMAGE' },
	{ name: 'Video', value: 'VIDEO' },
	{ name: '3D Model', value: 'MODEL_3D' },
	{ name: 'External Video', value: 'EXTERNAL_VIDEO' },
];

const FILE_USED_IN_OPTIONS = [
	{ name: 'Any', value: '' },
	{ name: 'Not Used Anywhere', value: 'none' },
	{ name: 'Used In Products', value: 'product' },
];

const FILE_CREATE_CONTENT_TYPE_OPTIONS = [
	{ name: '3D Model', value: 'MODEL_3D' },
	{ name: 'File', value: 'FILE' },
	{ name: 'Image', value: 'IMAGE' },
	{ name: 'Video', value: 'VIDEO' },
];

function createFields(): INodeProperties[] {
	return [
		{
			displayName: 'Files',
			name: 'fileCreateItems',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'items',
					displayName: 'File',
					values: [
						{
							displayName: 'Alt Text',
							name: 'alt',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Content Type',
							name: 'contentType',
							type: 'options',
							options: FILE_CREATE_CONTENT_TYPE_OPTIONS,
							default: 'IMAGE',
						},
						{
							displayName: 'Filename',
							name: 'filename',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Original Source',
							name: 'originalSource',
							type: 'string',
							default: '',
							required: true,
							placeholder:
								'https://cdn.example.com/image.jpg or staged upload URL from stagedUploadsCreate',
							description: 'Public URL or staged upload URL',
						},
					],
				},
			],
		},
	];
}

function createUploadFields(): INodeProperties[] {
	return [
		{
			displayName: 'Binary Property Name',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			description: 'Name of the binary input property containing the file to upload',
		},
		{
			displayName: 'Content Type',
			name: 'contentType',
			type: 'options',
			options: FILE_CREATE_CONTENT_TYPE_OPTIONS,
			default: 'IMAGE',
		},
		{
			displayName: 'Options',
			name: 'fileUploadOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Alt Text',
					name: 'alt',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Filename',
					name: 'filename',
					type: 'string',
					default: '',
					description: 'Overrides filename from binary metadata',
				},
				{
					displayName: 'MIME Type',
					name: 'mimeType',
					type: 'string',
					default: '',
					description: 'Overrides MIME type from binary metadata',
				},
			],
		},
	];
}

function getManyFields(): INodeProperties[] {
	return [
		{
			displayName: 'Get All',
			name: 'getAll',
			type: 'boolean',
			default: true,
			description: 'Whether to fetch all pages',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			description: 'Max number of results to return',
			default: 50,
			typeOptions: {
				minValue: 1,
				maxValue: 250,
			},
			displayOptions: {
				show: {
					getAll: [false],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'fileQueryOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Cursor',
					name: 'afterCursor',
					type: 'string',
					default: '',
					description: 'Use to continue from a specific cursor',
				},
				{
					displayName: 'Media Type',
					name: 'mediaType',
					type: 'options',
					options: FILE_MEDIA_TYPE_OPTIONS,
					default: '',
				},
				{
					displayName: 'Reverse',
					name: 'reverse',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'Search Query',
					name: 'query',
					type: 'string',
					default: '',
					description: 'Shopify search syntax. Example: used_in:none media_type:IMAGE.',
				},
				{
					displayName: 'Sort By',
					name: 'sortKey',
					type: 'options',
					options: FILE_SORT_OPTIONS,
					default: 'UPDATED_AT',
				},
				{
					displayName: 'Used In',
					name: 'usedIn',
					type: 'options',
					options: FILE_USED_IN_OPTIONS,
					default: '',
				},
			],
		},
	];
}

function updateFields(): INodeProperties[] {
	return [
		{
			displayName: 'Updates',
			name: 'fileUpdates',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'items',
					displayName: 'Update',
					values: [
						{
							displayName: 'File ID',
							name: 'fileId',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'gid://shopify/MediaImage/...',
							description: 'Global file ID in Shopify',
						},
						{
							displayName: 'Alt Text',
							name: 'alt',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Filename',
							name: 'filename',
							type: 'string',
							default: '',
							description: 'File name including extension',
						},
					],
				},
			],
		},
	];
}

function deleteFields(): INodeProperties[] {
	return [
		{
			displayName: 'Files',
			name: 'fileDeleteItems',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'items',
					displayName: 'File',
					values: [
						{
							displayName: 'File ID',
							name: 'fileId',
							type: 'string',
							default: '',
							required: true,
							placeholder: 'gid://shopify/MediaImage/...',
							description: 'Global file ID in Shopify',
						},
					],
				},
			],
		},
	];
}

function deleteUnusedImagesFields(): INodeProperties[] {
	return [
		{
			displayName: 'Dry Run',
			name: 'dryRun',
			type: 'boolean',
			default: true,
			description: 'Whether to only return matched files without deleting them',
		},
		{
			displayName: 'Get All',
			name: 'getAll',
			type: 'boolean',
			default: true,
			description: 'Whether to fetch all pages of unused images',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			description: 'Max number of results to return',
			default: 50,
			typeOptions: {
				minValue: 1,
				maxValue: 250,
			},
			displayOptions: {
				show: {
					getAll: [false],
				},
			},
		},
		{
			displayName: 'Options',
			name: 'cleanupOptions',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Additional Query',
					name: 'additionalQuery',
					type: 'string',
					default: '',
					description:
						'Additional Shopify search terms appended to "used_in:none media_type:IMAGE"',
				},
				{
					displayName: 'Reverse',
					name: 'reverse',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'Sort By',
					name: 'sortKey',
					type: 'options',
					options: FILE_SORT_OPTIONS,
					default: 'UPDATED_AT',
				},
			],
		},
	];
}

export const FILE_OPERATION_CONFIGS: IShopifyOperationConfig[] = [
	{
		resource: 'file',
		value: 'create',
		name: 'Create',
		description: 'Create files in Shopify from URLs or staged upload sources',
		registryKey: 'file.create',
		fields: createFields(),
	},
	{
		resource: 'file',
		value: 'createUpload',
		name: 'Create Upload',
		description: 'Upload binary data and create files in Shopify',
		registryKey: 'file.create',
		fields: createUploadFields(),
	},
	{
		resource: 'file',
		value: 'getMany',
		name: 'Get Many',
		description: 'Get files and media assets',
		registryKey: 'file.getMany',
		fields: getManyFields(),
	},
	{
		resource: 'file',
		value: 'update',
		name: 'Update',
		description: 'Update file metadata like alt text or filename',
		registryKey: 'file.update',
		fields: updateFields(),
	},
	{
		resource: 'file',
		value: 'delete',
		name: 'Delete',
		description: 'Delete files by IDs',
		registryKey: 'file.delete',
		fields: deleteFields(),
	},
	{
		resource: 'file',
		value: 'deleteUnusedImages',
		name: 'Delete Unused Images',
		description: 'Find and optionally delete images that are not used anywhere',
		registryKey: 'file.deleteUnusedImages',
		fields: deleteUnusedImagesFields(),
	},
];
