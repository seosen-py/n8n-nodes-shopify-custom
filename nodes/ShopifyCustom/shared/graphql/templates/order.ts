import { OPTIONAL_METAFIELDS_CONNECTION, USER_ERRORS_FIELDS } from './commonFragments';

const MONEY_BAG_FIELDS = `
	shopMoney {
		amount
		currencyCode
	}
	presentmentMoney {
		amount
		currencyCode
	}
`;

const ADDRESS_FIELDS = `
	id
	firstName
	lastName
	name
	company
	address1
	address2
	city
	province
	provinceCode
	zip
	country
	countryCodeV2
	phone
	latitude
	longitude
	formatted
`;

const TAX_LINE_FIELDS = `
	channelLiable
	rate
	ratePercentage
	title
	priceSet {
		${MONEY_BAG_FIELDS}
	}
`;

const ORDER_READ_VARIABLES = `
	$includeCustomer: Boolean!
	$includeLineItems: Boolean!
	$lineItemsFirst: Int!
	$includeShippingLines: Boolean!
	$shippingLinesFirst: Int!
	$includeDiscountApplications: Boolean!
	$discountApplicationsFirst: Int!
	$includeFulfillments: Boolean!
	$fulfillmentsFirst: Int!
	$fulfillmentLineItemsFirst: Int!
	$includeTransactions: Boolean!
	$transactionsFirst: Int!
	$includeRefunds: Boolean!
	$refundsFirst: Int!
	$refundLineItemsFirst: Int!
	$includeReturns: Boolean!
	$returnsFirst: Int!
	$returnLineItemsFirst: Int!
	$includeRisk: Boolean!
`;

const ORDER_READ_FIELDS = `
	id
	legacyResourceId
	name
	email
	phone
	note
	tags
	cancelReason
	cancelledAt
	closed
	closedAt
	confirmed
	createdAt
	customerLocale
	displayFinancialStatus
	displayFulfillmentStatus
	edited
	fullyPaid
	merchantEditable
	paymentGatewayNames
	poNumber
	processedAt
	refundable
	requiresShipping
	restockable
	returnStatus
	sourceIdentifier
	sourceName
	statusPageUrl
	subtotalLineItemsQuantity
	taxExempt
	taxesIncluded
	test
	totalWeight
	unpaid
	updatedAt
	currencyCode
	presentmentCurrencyCode
	risk @include(if: $includeRisk) {
		recommendation
		assessments {
			riskLevel
			facts {
				description
				sentiment
			}
			provider {
				title
			}
		}
	}
	currentSubtotalPriceSet {
		${MONEY_BAG_FIELDS}
	}
	subtotalPriceSet {
		${MONEY_BAG_FIELDS}
	}
	currentTotalDiscountsSet {
		${MONEY_BAG_FIELDS}
	}
	totalDiscountsSet {
		${MONEY_BAG_FIELDS}
	}
	currentTotalTaxSet {
		${MONEY_BAG_FIELDS}
	}
	totalTaxSet {
		${MONEY_BAG_FIELDS}
	}
	currentTotalPriceSet {
		${MONEY_BAG_FIELDS}
	}
	totalPriceSet {
		${MONEY_BAG_FIELDS}
	}
	totalShippingPriceSet {
		${MONEY_BAG_FIELDS}
	}
	totalRefundedSet {
		${MONEY_BAG_FIELDS}
	}
	totalReceivedSet {
		${MONEY_BAG_FIELDS}
	}
	totalOutstandingSet {
		${MONEY_BAG_FIELDS}
	}
	billingAddress {
		${ADDRESS_FIELDS}
	}
	shippingAddress {
		${ADDRESS_FIELDS}
	}
	customer @include(if: $includeCustomer) {
		id
		legacyResourceId
		defaultEmailAddress {
			emailAddress
		}
		defaultPhoneNumber {
			phoneNumber
		}
		firstName
		lastName
		displayName
		state
		tags
		createdAt
		updatedAt
	}
	lineItems(first: $lineItemsFirst) @include(if: $includeLineItems) {
		nodes {
			id
			name
			title
			sku
			vendor
			quantity
			currentQuantity
			refundableQuantity
			unfulfilledQuantity
			requiresShipping
			taxable
			originalUnitPriceSet {
				${MONEY_BAG_FIELDS}
			}
			discountedUnitPriceSet {
				${MONEY_BAG_FIELDS}
			}
			originalTotalSet {
				${MONEY_BAG_FIELDS}
			}
			discountedTotalSet {
				${MONEY_BAG_FIELDS}
			}
			totalDiscountSet {
				${MONEY_BAG_FIELDS}
			}
			customAttributes {
				key
				value
			}
			taxLines {
				${TAX_LINE_FIELDS}
			}
			variant {
				id
				legacyResourceId
				title
				sku
				barcode
				displayName
				product {
					id
					legacyResourceId
					title
					handle
					vendor
					productType
				}
			}
			product {
				id
				legacyResourceId
				title
				handle
				vendor
				productType
			}
		}
	}
	shippingLines(first: $shippingLinesFirst) @include(if: $includeShippingLines) {
		nodes {
			id
			title
			code
			source
			carrierIdentifier
			phone
			originalPriceSet {
				${MONEY_BAG_FIELDS}
			}
			discountedPriceSet {
				${MONEY_BAG_FIELDS}
			}
			taxLines {
				${TAX_LINE_FIELDS}
			}
		}
	}
	taxLines {
		${TAX_LINE_FIELDS}
	}
	discountApplications(first: $discountApplicationsFirst) @include(if: $includeDiscountApplications) {
		nodes {
			__typename
			allocationMethod
			targetSelection
			targetType
			value {
				__typename
				... on MoneyV2 {
					amount
					currencyCode
				}
				... on PricingPercentageValue {
					percentage
				}
			}
			... on DiscountCodeApplication {
				code
			}
			... on ManualDiscountApplication {
				title
				description
			}
			... on ScriptDiscountApplication {
				title
			}
			... on AutomaticDiscountApplication {
				title
			}
		}
	}
	fulfillments(first: $fulfillmentsFirst) @include(if: $includeFulfillments) {
		id
		name
		status
		displayStatus
		createdAt
		updatedAt
		deliveredAt
		estimatedDeliveryAt
		inTransitAt
		trackingInfo(first: 10) {
			company
			number
			url
		}
		location {
			id
			legacyResourceId
			name
		}
		service {
			handle
			serviceName
			type
		}
		originAddress {
			address1
			address2
			city
			countryCode
			provinceCode
			zip
		}
		fulfillmentLineItems(first: $fulfillmentLineItemsFirst) {
			nodes {
				id
				quantity
				originalTotalSet {
					${MONEY_BAG_FIELDS}
				}
				lineItem {
					id
					name
					title
					sku
					quantity
				}
			}
		}
	}
	transactions(first: $transactionsFirst) @include(if: $includeTransactions) {
		id
		kind
		status
		gateway
		paymentId
		createdAt
		processedAt
		amountSet {
			${MONEY_BAG_FIELDS}
		}
		parentTransaction {
			id
			kind
			status
		}
	}
	refunds(first: $refundsFirst) @include(if: $includeRefunds) {
		id
		createdAt
		updatedAt
		note
		totalRefundedSet {
			${MONEY_BAG_FIELDS}
		}
		refundLineItems(first: $refundLineItemsFirst) {
			nodes {
				id
				quantity
				restockType
				subtotalSet {
					${MONEY_BAG_FIELDS}
				}
				totalTaxSet {
					${MONEY_BAG_FIELDS}
				}
				lineItem {
					id
					name
					title
					sku
					quantity
				}
			}
		}
	}
	returns(first: $returnsFirst) @include(if: $includeReturns) {
		nodes {
			id
			name
			status
			createdAt
			totalQuantity
			returnLineItems(first: $returnLineItemsFirst) {
				nodes {
					id
					quantity
					refundableQuantity
					returnReason
					returnReasonNote
					... on ReturnLineItem {
						fulfillmentLineItem {
							id
							lineItem {
								id
								title
								sku
								quantity
							}
						}
					}
				}
			}
		}
	}
	${OPTIONAL_METAFIELDS_CONNECTION}
`;

export const ORDER_CREATE_MUTATION = `
mutation OrderCreate($order: OrderCreateOrderInput!) {
	orderCreate(order: $order) {
		order {
			id
			name
			email
			displayFinancialStatus
			displayFulfillmentStatus
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const ORDER_GET_QUERY = `
query OrderGet(
	$id: ID!
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
	${ORDER_READ_VARIABLES}
) {
	order(id: $id) {
		${ORDER_READ_FIELDS}
	}
}
`;

export const ORDER_GET_MANY_QUERY = `
query OrderGetMany(
	$first: Int!
	$after: String
	$query: String
	$sortKey: OrderSortKeys
	$reverse: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
	$metafieldKeys: [String!]
	$resolveMetafieldReferences: Boolean!
	$metafieldReferencesFirst: Int!
	${ORDER_READ_VARIABLES}
) {
	orders(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
		nodes {
			${ORDER_READ_FIELDS}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const ORDER_UPDATE_MUTATION = `
mutation OrderUpdate($input: OrderInput!) {
	orderUpdate(input: $input) {
		order {
			id
			name
			email
			note
			tags
			updatedAt
		}
		${USER_ERRORS_FIELDS}
	}
}
`;

export const ORDER_DELETE_MUTATION = `
mutation OrderDelete($orderId: ID!) {
	orderDelete(orderId: $orderId) {
		deletedId
		${USER_ERRORS_FIELDS}
	}
}
`;
