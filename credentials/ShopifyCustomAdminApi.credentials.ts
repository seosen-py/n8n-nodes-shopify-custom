import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class ShopifyCustomAdminApi implements ICredentialType {
	name = 'shopifyCustomAdminApi';

	displayName = 'Shopify Custom Admin API';

	icon: Icon = {
		light: 'file:../nodes/ShopifyCustom/shopify.svg',
		dark: 'file:../nodes/ShopifyCustom/shopify.dark.svg',
	};

	documentationUrl = 'https://shopify.dev/docs/api/admin-graphql';

	properties: INodeProperties[] = [
		{
			displayName: 'Shop Subdomain',
			name: 'shopSubdomain',
			type: 'string',
			placeholder: 'my-store',
			default: '',
			required: true,
			description: 'Only subdomain without .myshopify.com suffix',
		},
		{
			displayName: 'Admin API Version',
			name: 'apiVersion',
			type: 'string',
			default: '2025-10',
			required: true,
		},
		{
			displayName: 'Admin Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Shopify-Access-Token': '={{$credentials.accessToken.trim()}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{"https://" + $credentials.shopSubdomain.trim().replace(".myshopify.com", "") + ".myshopify.com"}}',
			url: '=/admin/api/{{$credentials.apiVersion || "2025-10"}}/graphql.json',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				query: 'query { shop { id name } }',
			},
		},
	};
}
