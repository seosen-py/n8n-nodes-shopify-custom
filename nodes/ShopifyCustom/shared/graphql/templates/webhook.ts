import { USER_ERRORS_FIELDS } from './commonFragments';

export const WEBHOOK_SUBSCRIPTION_CREATE_MUTATION = `
mutation WebhookSubscriptionCreate(
	$topic: WebhookSubscriptionTopic!
	$webhookSubscription: WebhookSubscriptionInput!
) {
	webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
		webhookSubscription {
			id
			topic
			uri
			includeFields
			metafieldNamespaces
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const WEBHOOK_SUBSCRIPTION_DELETE_MUTATION = `
mutation WebhookSubscriptionDelete($id: ID!) {
	webhookSubscriptionDelete(id: $id) {
		deletedWebhookSubscriptionId
		${USER_ERRORS_FIELDS}
	}
}
`;

export const WEBHOOK_SUBSCRIPTION_GET_QUERY = `
query WebhookSubscriptionGet($id: ID!) {
	webhookSubscription(id: $id) {
		id
		topic
		uri
		includeFields
		metafieldNamespaces
	}
}
`;
