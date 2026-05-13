import type {
	IAuthenticate,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

function getHttpErrorMessage(error: unknown): string {
	if (!error || typeof error !== 'object') {
		return String(error);
	}

	const typedError = error as IDataObject;
	const response = typedError.response as IDataObject | undefined;
	const body = (response?.body ?? typedError.body ?? typedError.message) as unknown;

	if (typeof body === 'string') {
		return body;
	}

	if (body && typeof body === 'object') {
		return JSON.stringify(body);
	}

	return String(typedError.message ?? 'Unknown error');
}

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
					description:
						'Exchange Client ID and Client Secret for a short-lived Admin API access token. Requires the app and store to be in the same Shopify organization.',
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

	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		if (credentials.authenticationMethod === 'clientCredentials') {
			return requestOptions;
		}

		const accessToken = String(credentials.accessToken ?? '').trim();
		if (!accessToken) {
			return requestOptions;
		}

		return {
			...requestOptions,
			headers: {
				...(requestOptions.headers ?? {}),
				'X-Shopify-Access-Token': accessToken,
			},
		};
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

		let response: IDataObject;
		try {
			response = (await this.helpers.httpRequest({
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
				}).toString(),
				json: true,
			})) as IDataObject;
		} catch (error) {
			throw new Error(`Shopify client credentials token exchange failed: ${getHttpErrorMessage(error)}`);
		}

		const accessToken = String(response.access_token ?? '').trim();
		if (!accessToken) {
			throw new Error('Shopify did not return an access token for the provided client credentials.');
		}

		return {
			...credentials,
			accessToken,
		};
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{"https://" + String($credentials.shopSubdomain || "").trim().replace(/^https?:\\/\\//, "").replace(/\\.myshopify\\.com\\/?$/, "") + ".myshopify.com"}}',
			url: '={{$credentials.authenticationMethod === "clientCredentials" ? "/admin/oauth/access_token" : "/admin/api/" + ($credentials.apiVersion || "2025-10") + "/graphql.json"}}',
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type':
					'={{$credentials.authenticationMethod === "clientCredentials" ? "application/x-www-form-urlencoded" : "application/json"}}',
			},
			body: '={{$credentials.authenticationMethod === "clientCredentials" ? "grant_type=client_credentials&client_id=" + encodeURIComponent(String($credentials.clientId || "").trim()) + "&client_secret=" + encodeURIComponent(String($credentials.clientSecret || "").trim()) : JSON.stringify({ query: "query { shop { id name } }" })}}',
		},
	};
}
