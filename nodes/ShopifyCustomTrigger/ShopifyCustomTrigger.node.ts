import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { assertNoGraphQLErrors, executeShopifyGraphql } from '../ShopifyCustom/shared/graphql/client';
import {
	WEBHOOK_SUBSCRIPTION_CREATE_MUTATION,
	WEBHOOK_SUBSCRIPTION_DELETE_MUTATION,
	WEBHOOK_SUBSCRIPTION_GET_QUERY,
} from '../ShopifyCustom/shared/graphql/templates/webhook';

type ShopifyTriggerResource = 'order';

interface IShopifyWebhookCredentials extends IDataObject {
	webhookSecret?: string;
}

interface IShopifyWebhookUserError {
	field?: string[] | null;
	message: string;
}

interface IWebhookSubscriptionNode extends IDataObject {
	id?: string;
	topic?: string;
	uri?: string;
	includeFields?: string[];
	metafieldNamespaces?: string[];
}

interface IWebhookSubscriptionGetResponse {
	webhookSubscription?: IWebhookSubscriptionNode | null;
}

interface IWebhookSubscriptionCreateResponse {
	webhookSubscriptionCreate?: {
		webhookSubscription?: IWebhookSubscriptionNode | null;
		userErrors?: IShopifyWebhookUserError[];
	} | null;
}

interface IWebhookSubscriptionDeleteResponse {
	webhookSubscriptionDelete?: {
		deletedWebhookSubscriptionId?: string | null;
		userErrors?: IShopifyWebhookUserError[];
	} | null;
}

interface IStoredWebhookState extends IDataObject {
	configHash?: string;
	subscriptionIdsByTopic?: IDataObject;
}

const ORDER_EVENT_OPTIONS = [
	{
		name: 'Created',
		value: 'ORDERS_CREATE',
		description: 'Trigger when an order is created',
	},
	{
		name: 'Updated',
		value: 'ORDERS_UPDATED',
		description: 'Trigger when an order is updated',
	},
	{
		name: 'Paid',
		value: 'ORDERS_PAID',
		description: 'Trigger when an order is marked as paid',
	},
	{
		name: 'Cancelled',
		value: 'ORDERS_CANCELLED',
		description: 'Trigger when an order is cancelled',
	},
	{
		name: 'Fulfilled',
		value: 'ORDERS_FULFILLED',
		description: 'Trigger when an order is fulfilled',
	},
	{
		name: 'Partially Fulfilled',
		value: 'ORDERS_PARTIALLY_FULFILLED',
		description: 'Trigger when an order is partially fulfilled',
	},
	{
		name: 'Deleted',
		value: 'ORDERS_DELETE',
		description: 'Trigger when an order is deleted',
	},
	{
		name: 'Edited',
		value: 'ORDERS_EDITED',
		description: 'Trigger when an order is edited',
	},
	{
		name: 'Risk Assessment Changed',
		value: 'ORDERS_RISK_ASSESSMENT_CHANGED',
		description: 'Trigger when Shopify publishes a new risk assessment for an order',
	},
	{
		name: 'Transaction Created',
		value: 'ORDER_TRANSACTIONS_CREATE',
		description: 'Trigger when a successful, failed, or errored order transaction is created',
	},
] as const;

const ORDER_TOPIC_TO_EVENT = new Map<string, string>(
	ORDER_EVENT_OPTIONS.map((option) => [option.value, option.name]),
);

const ORDER_EVENT_NODE_OPTIONS: INodePropertyOptions[] = ORDER_EVENT_OPTIONS.map((option) => ({
	name: option.name,
	value: option.value,
	description: option.description,
	action: `${option.name} order`,
}));

function isObject(value: unknown): value is IDataObject {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((item) => toOptionalString(item))
		.filter((item): item is string => !!item);
}

function parseCommaSeparatedValues(value: unknown): string[] {
	const raw = toOptionalString(value);
	if (!raw) {
		return [];
	}

	return Array.from(
		new Set(
			raw
				.split(',')
				.map((item) => item.trim())
				.filter((item) => item.length > 0),
		),
	).sort((a, b) => a.localeCompare(b));
}

function getHeaderValue(headers: IDataObject, headerName: string): string | undefined {
	const directValue = headers[headerName];
	if (typeof directValue === 'string' && directValue.trim()) {
		return directValue.trim();
	}

	const fallbackKey = Object.keys(headers).find(
		(key) => key.toLowerCase() === headerName.toLowerCase(),
	);
	if (!fallbackKey) {
		return undefined;
	}

	const fallbackValue = headers[fallbackKey];
	return typeof fallbackValue === 'string' && fallbackValue.trim()
		? fallbackValue.trim()
		: undefined;
}

function getSelectedTopics(context: IHookFunctions | ITriggerFunctions | IWebhookFunctions): string[] {
	const primaryEvent = toOptionalString(context.getNodeParameter('event', ''));
	const additionalEvents = toStringArray(context.getNodeParameter('additionalEvents', []));

	return Array.from(
		new Set(
			[primaryEvent, ...additionalEvents].filter((topic): topic is string => !!topic),
		),
	).sort((a, b) => a.localeCompare(b));
}

function getTriggerOptions(context: IHookFunctions | ITriggerFunctions | IWebhookFunctions): IDataObject {
	const rawOptions = context.getNodeParameter('triggerOptions', {}) as IDataObject;
	return isObject(rawOptions) ? rawOptions : {};
}

function getIncludeFields(context: IHookFunctions | ITriggerFunctions | IWebhookFunctions): string[] {
	return parseCommaSeparatedValues(getTriggerOptions(context).includeFields);
}

function getMetafieldNamespaces(
	context: IHookFunctions | ITriggerFunctions | IWebhookFunctions,
): string[] {
	return parseCommaSeparatedValues(getTriggerOptions(context).metafieldNamespaces);
}

function shouldIncludeHeaders(
	context: IHookFunctions | ITriggerFunctions | IWebhookFunctions,
): boolean {
	return Boolean(getTriggerOptions(context).includeHeaders);
}

function getConfigHash(
	topics: string[],
	webhookUrl: string,
	includeFields: string[],
	metafieldNamespaces: string[],
): string {
	return JSON.stringify({
		topics: [...topics].sort((a, b) => a.localeCompare(b)),
		webhookUrl,
		includeFields: [...includeFields].sort((a, b) => a.localeCompare(b)),
		metafieldNamespaces: [...metafieldNamespaces].sort((a, b) => a.localeCompare(b)),
	});
}

function getNodeStaticData(context: IHookFunctions): IStoredWebhookState {
	return context.getWorkflowStaticData('node') as IStoredWebhookState;
}

function getStoredSubscriptionIdsByTopic(staticData: IStoredWebhookState): Record<string, string> {
	const rawValue = staticData.subscriptionIdsByTopic;
	if (!isObject(rawValue)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(rawValue)
			.map(([topic, subscriptionId]) => [topic, toOptionalString(subscriptionId)])
			.filter((entry): entry is [string, string] => !!entry[1]),
	);
}

function setStoredSubscriptionIdsByTopic(
	staticData: IStoredWebhookState,
	subscriptionIdsByTopic: Record<string, string>,
): void {
	staticData.subscriptionIdsByTopic = { ...subscriptionIdsByTopic };
}

function getWebhookSecret(credentials: IShopifyWebhookCredentials): string | undefined {
	return toOptionalString(credentials.webhookSecret);
}

function throwIfWebhookUserErrors(
	node: ReturnType<IHookFunctions['getNode']>,
	userErrors: IShopifyWebhookUserError[] | null | undefined,
): void {
	if (!userErrors || userErrors.length === 0) {
		return;
	}

	const message = userErrors
		.map((userError) => {
			const fieldPath = Array.isArray(userError.field) ? userError.field.join('.') : '';
			return fieldPath ? `${userError.message} (field: ${fieldPath})` : userError.message;
		})
		.join('; ');

	throw new NodeOperationError(node, `Shopify user error: ${message}`);
}

function getRawRequestBody(request: IDataObject): string | undefined {
	const rawBody = request.rawBody as unknown;
	if (typeof rawBody === 'string') {
		return rawBody;
	}
	if (Buffer.isBuffer(rawBody)) {
		return rawBody.toString('utf8');
	}

	const body = request.body as unknown;
	if (typeof body === 'string') {
		return body;
	}
	if (Buffer.isBuffer(body)) {
		return body.toString('utf8');
	}

	return undefined;
}

function verifyWebhookSignature(rawBody: string, secret: string, providedSignature: string): boolean {
	const expectedSignature = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
	const providedBuffer = Buffer.from(providedSignature, 'utf8');
	const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

	if (providedBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return timingSafeEqual(providedBuffer, expectedBuffer);
}

async function getWebhookSubscription(
	context: IHookFunctions,
	subscriptionId: string,
): Promise<IWebhookSubscriptionNode | undefined> {
	const response = await executeShopifyGraphql<IWebhookSubscriptionGetResponse>(
		context,
		WEBHOOK_SUBSCRIPTION_GET_QUERY,
		{ id: subscriptionId },
	);
	assertNoGraphQLErrors(context, response);
	return response.data?.webhookSubscription ?? undefined;
}

async function createWebhookSubscription(
	context: IHookFunctions,
	topic: string,
	webhookUrl: string,
	includeFields: string[],
	metafieldNamespaces: string[],
): Promise<string> {
	const response = await executeShopifyGraphql<IWebhookSubscriptionCreateResponse>(
		context,
		WEBHOOK_SUBSCRIPTION_CREATE_MUTATION,
		{
			topic,
			webhookSubscription: {
				uri: webhookUrl,
				includeFields: includeFields.length > 0 ? includeFields : undefined,
				metafieldNamespaces: metafieldNamespaces.length > 0 ? metafieldNamespaces : undefined,
			},
		},
	);
	assertNoGraphQLErrors(context, response);
	const payload = response.data?.webhookSubscriptionCreate;
	throwIfWebhookUserErrors(context.getNode(), payload?.userErrors);

	const createdSubscriptionId = toOptionalString(payload?.webhookSubscription?.id);
	if (!createdSubscriptionId) {
		throw new NodeOperationError(
			context.getNode(),
			`Shopify did not return a webhook subscription ID for topic "${topic}"`,
		);
	}

	return createdSubscriptionId;
}

async function deleteWebhookSubscription(
	context: IHookFunctions,
	subscriptionId: string,
): Promise<void> {
	const response = await executeShopifyGraphql<IWebhookSubscriptionDeleteResponse>(
		context,
		WEBHOOK_SUBSCRIPTION_DELETE_MUTATION,
		{ id: subscriptionId },
	);
	assertNoGraphQLErrors(context, response);
	const payload = response.data?.webhookSubscriptionDelete;
	throwIfWebhookUserErrors(context.getNode(), payload?.userErrors);
}

async function deleteStoredWebhookSubscriptions(context: IHookFunctions): Promise<void> {
	const staticData = getNodeStaticData(context);
	const storedSubscriptionIdsByTopic = getStoredSubscriptionIdsByTopic(staticData);

	for (const subscriptionId of Object.values(storedSubscriptionIdsByTopic)) {
		await deleteWebhookSubscription(context, subscriptionId);
	}

	staticData.configHash = undefined;
	staticData.subscriptionIdsByTopic = {};
}

async function validateTriggerCredentials(context: IHookFunctions | IWebhookFunctions): Promise<string> {
	const credentials = await context.getCredentials<IShopifyWebhookCredentials>('shopifyCustomAdminApi');
	const webhookSecret = getWebhookSecret(credentials);
	if (!webhookSecret) {
		throw new NodeOperationError(
			context.getNode(),
			'Webhook Secret is required in Shopify Custom Admin API credentials for Shopify Custom Trigger',
		);
	}

	return webhookSecret;
}

export class ShopifyCustomTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopify Custom Trigger',
		name: 'shopifyCustomTrigger',
		icon: { light: 'file:shopify.svg', dark: 'file:shopify.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{$parameter["resource"] + ": " + $parameter["event"] + (($parameter["additionalEvents"] || []).length ? " +" + ($parameter["additionalEvents"] || []).length : "")}}',
		description: 'Receive Shopify webhook events through webhook subscriptions',
		defaults: {
			name: 'Shopify Custom Trigger',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'shopifyCustomAdminApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'order',
				options: [
					{
						name: 'Order',
						value: 'order',
						description: 'Subscribe to Shopify order webhooks',
					},
				],
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				default: 'ORDERS_CREATE',
				required: true,
				displayOptions: {
					show: {
						resource: ['order'],
					},
				},
				options: ORDER_EVENT_NODE_OPTIONS,
				description: 'Select the primary Shopify order event to subscribe to',
			},
			{
				displayName: 'Additional Events',
				name: 'additionalEvents',
				type: 'multiOptions',
				noDataExpression: true,
				default: [],
				displayOptions: {
					show: {
						resource: ['order'],
					},
				},
				options: ORDER_EVENT_NODE_OPTIONS,
				description: 'Optionally subscribe to additional Shopify order events in the same trigger',
			},
			{
				displayName: 'Options',
				name: 'triggerOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Include Fields',
						name: 'includeFields',
						type: 'string',
						default: '',
						placeholder: 'id,name,total_price',
						description:
							'Comma-separated fields to ask Shopify to include in the webhook payload',
					},
					{
						displayName: 'Include Headers',
						name: 'includeHeaders',
						type: 'boolean',
						default: false,
						description: 'Whether to include webhook headers in the trigger output',
					},
					{
						displayName: 'Metafield Namespaces',
						name: 'metafieldNamespaces',
						type: 'string',
						default: '',
						placeholder: 'custom,seo',
						description:
							'Comma-separated metafield namespaces Shopify should include in the payload',
					},
				],
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'shopify-custom-trigger',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		return {
			closeFunction: async () => {},
		};
	}

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				await validateTriggerCredentials(this);

				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					return false;
				}

				const topics = getSelectedTopics(this);
				if (topics.length === 0) {
					return false;
				}

				const includeFields = getIncludeFields(this);
				const metafieldNamespaces = getMetafieldNamespaces(this);
				const expectedConfigHash = getConfigHash(
					topics,
					webhookUrl,
					includeFields,
					metafieldNamespaces,
				);

				const staticData = getNodeStaticData(this);
				const storedSubscriptionIdsByTopic = getStoredSubscriptionIdsByTopic(staticData);

				if (
					staticData.configHash !== expectedConfigHash ||
					Object.keys(storedSubscriptionIdsByTopic).length !== topics.length
				) {
					return false;
				}

				for (const topic of topics) {
					const subscriptionId = storedSubscriptionIdsByTopic[topic];
					if (!subscriptionId) {
						return false;
					}

					const subscription = await getWebhookSubscription(this, subscriptionId);
					if (!subscription) {
						return false;
					}

					if (subscription.topic !== topic || subscription.uri !== webhookUrl) {
						return false;
					}
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				await validateTriggerCredentials(this);

				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Could not resolve webhook URL');
				}

				const topics = getSelectedTopics(this);
				if (topics.length === 0) {
					throw new NodeOperationError(this.getNode(), 'At least one Shopify event is required');
				}

				const includeFields = getIncludeFields(this);
				const metafieldNamespaces = getMetafieldNamespaces(this);
				const staticData = getNodeStaticData(this);

				if (Object.keys(getStoredSubscriptionIdsByTopic(staticData)).length > 0) {
					await deleteStoredWebhookSubscriptions(this);
				}

				const subscriptionIdsByTopic: Record<string, string> = {};
				for (const topic of topics) {
					subscriptionIdsByTopic[topic] = await createWebhookSubscription(
						this,
						topic,
						webhookUrl,
						includeFields,
						metafieldNamespaces,
					);
				}

				setStoredSubscriptionIdsByTopic(staticData, subscriptionIdsByTopic);
				staticData.configHash = getConfigHash(
					topics,
					webhookUrl,
					includeFields,
					metafieldNamespaces,
				);

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				await validateTriggerCredentials(this);
				await deleteStoredWebhookSubscriptions(this);
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookSecret = await validateTriggerCredentials(this);
		const response = this.getResponseObject();
		const request = this.getRequestObject() as unknown as IDataObject;
		const headers = this.getHeaderData() as unknown as IDataObject;
		const rawBody = getRawRequestBody(request);

		if (!rawBody) {
			response.status(500).send('Could not access raw webhook body for Shopify HMAC verification');
			return { noWebhookResponse: true };
		}

		const providedSignature = getHeaderValue(headers, 'x-shopify-hmac-sha256');
		if (!providedSignature || !verifyWebhookSignature(rawBody, webhookSecret, providedSignature)) {
			response.status(401).send('Invalid Shopify webhook signature');
			return { noWebhookResponse: true };
		}

		const topic = getHeaderValue(headers, 'x-shopify-topic') ?? 'UNKNOWN';
		const shopDomain = getHeaderValue(headers, 'x-shopify-shop-domain') ?? null;
		const webhookId = getHeaderValue(headers, 'x-shopify-webhook-id') ?? null;
		const resource = (this.getNodeParameter('resource', 'order') as ShopifyTriggerResource) ?? 'order';
		const payload = this.getBodyData();
		const json: IDataObject = {
			resource,
			topic,
			event: ORDER_TOPIC_TO_EVENT.get(topic) ?? topic,
			shopDomain,
			webhookId,
			receivedAt: new Date().toISOString(),
			payload,
		};

		if (shouldIncludeHeaders(this)) {
			json.headers = headers;
		}

		const workflowData: INodeExecutionData[][] = [[{ json }]];
		response.status(200).send('OK');

		return {
			workflowData,
			noWebhookResponse: true,
		};
	}
}
