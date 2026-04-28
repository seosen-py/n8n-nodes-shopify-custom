import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ShopifyCustomOAuth2Api implements ICredentialType {
	name = 'shopifyCustomOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Shopify Custom OAuth2 API';

	icon: Icon = {
		light: 'file:../nodes/ShopifyCustom/shopify.svg',
		dark: 'file:../nodes/ShopifyCustom/shopify.dark.svg',
	};

	documentationUrl =
		'https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant';

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
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'Shopify also labels this field as API key',
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
			description: 'Shopify also labels this field as API secret key',
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
				'Used to verify Shopify webhook signatures for trigger nodes. Leave empty to reuse Client Secret.',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://{{$self["shopSubdomain"]}}.myshopify.com/admin/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://{{$self["shopSubdomain"]}}.myshopify.com/admin/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
