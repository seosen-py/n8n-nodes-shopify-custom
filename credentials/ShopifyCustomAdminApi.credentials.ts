import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
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
				'X-Shopify-Access-Token': '={{$credentials.accessToken.trim()}}',
			},
		},
	};

	preAuthentication = async function (
		this: IHttpRequestHelper,
		credentials: IDataObject,
	): Promise<IDataObject> {
		if (credentials.authenticationMethod !== 'clientCredentials') {
			return credentials;
		}

		const shopSubdomain = String(credentials.shopSubdomain ?? '')
			.trim()
			.replace(/^https?:\/\//, '')
			.replace(/\.myshopify\.com\/?$/, '');
		const clientId = String(credentials.clientId ?? '').trim();
		const clientSecret = String(credentials.clientSecret ?? '').trim();

		if (!shopSubdomain || !clientId || !clientSecret) {
			return credentials;
		}

		const response = (await this.helpers.httpRequest({
			url: `https://${shopSubdomain}.myshopify.com/admin/oauth/access_token`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: clientId,
				client_secret: clientSecret,
			}),
			json: true,
		})) as IDataObject;

		const accessToken = String(response.access_token ?? '').trim();
		if (!accessToken) {
			return credentials;
		}

		return {
			...credentials,
			accessToken,
		};
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
