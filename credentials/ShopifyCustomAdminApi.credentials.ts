import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
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
			displayName: 'Authentication Method',
			name: 'authenticationMethod',
			type: 'options',
			default: 'accessToken',
			options: [
				{
					name: 'Client Credentials (Dev Dashboard)',
					value: 'clientCredentials',
					description: 'Exchange Client ID and Client Secret for a short-lived Admin API access token.',
				},
				{
					name: 'Admin Access Token (Legacy)',
					value: 'accessToken',
					description: 'Use a static Admin API access token from an admin-created legacy custom app.',
				},
			],
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
			displayOptions: {
				show: {
					authenticationMethod: ['accessToken'],
				},
			},
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authenticationMethod: ['clientCredentials'],
				},
			},
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					authenticationMethod: ['clientCredentials'],
				},
			},
		},
		{
			displayName: 'Webhook Secret',
			name: 'webhookSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: false,
			description:
				'Used to verify Shopify webhook signatures for trigger nodes. Leave empty to reuse Client Secret in Dev Dashboard mode.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Shopify-Access-Token':
					'={{$credentials.authenticationMethod === "accessToken" ? $credentials.accessToken.trim() : ""}}',
			},
		},
	};

	test: ICredentialTestRequest = {
			request: {
				baseURL:
					'={{"https://" + $credentials.shopSubdomain.trim().replace(".myshopify.com", "") + ".myshopify.com"}}',
				url: '={{$credentials.authenticationMethod === "clientCredentials" ? "/admin/oauth/access_token" : "/admin/api/" + ($credentials.apiVersion || "2025-10") + "/graphql.json"}}',
				method: 'POST',
				headers: {
					'Content-Type':
						'={{$credentials.authenticationMethod === "clientCredentials" ? "application/x-www-form-urlencoded" : "application/json"}}',
					'X-Shopify-Access-Token':
						'={{$credentials.authenticationMethod === "accessToken" ? $credentials.accessToken.trim() : ""}}',
				},
				body:
					'={{$credentials.authenticationMethod === "clientCredentials" ? "grant_type=client_credentials&client_id=" + encodeURIComponent($credentials.clientId.trim()) + "&client_secret=" + encodeURIComponent($credentials.clientSecret.trim()) : JSON.stringify({query: "query { shop { id name } }"})}}' as unknown as IDataObject,
				json: false,
			},
		};
	}
