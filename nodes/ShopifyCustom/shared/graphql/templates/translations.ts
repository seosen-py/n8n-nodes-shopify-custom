const TRANSLATION_FIELDS = `
	key
	locale
	value
	outdated
	updatedAt
	market {
		id
		name
	}
`;

const TRANSLATABLE_CONTENT_FIELDS = `
	key
	value
	digest
	locale
	type
`;

const TRANSLATION_USER_ERRORS_FIELDS = `
	userErrors {
		field
		message
		code
	}
`;

export const TRANSLATION_GET_QUERY = `
query TranslationGet(
	$resourceId: ID!
	$locale: String!
	$marketId: ID
	$outdated: Boolean
	$includeNestedResources: Boolean!
	$nestedResourceType: TranslatableResourceType
	$nestedFirst: Int!
) {
	translatableResource(resourceId: $resourceId) {
		resourceId
		translatableContent(marketId: $marketId) {
			${TRANSLATABLE_CONTENT_FIELDS}
		}
		translations(locale: $locale, marketId: $marketId, outdated: $outdated) {
			${TRANSLATION_FIELDS}
		}
		nestedTranslatableResources(
			resourceType: $nestedResourceType
			first: $nestedFirst
		) @include(if: $includeNestedResources) {
			nodes {
				resourceId
				translatableContent(marketId: $marketId) {
					${TRANSLATABLE_CONTENT_FIELDS}
				}
				translations(locale: $locale, marketId: $marketId, outdated: $outdated) {
					${TRANSLATION_FIELDS}
				}
			}
			pageInfo {
				hasNextPage
				endCursor
			}
		}
	}
}
`;

export const TRANSLATION_GET_MANY_QUERY = `
query TranslationGetMany(
	$resourceType: TranslatableResourceType!
	$first: Int!
	$after: String
	$reverse: Boolean
	$locale: String!
	$marketId: ID
	$outdated: Boolean
	$includeNestedResources: Boolean!
	$nestedResourceType: TranslatableResourceType
	$nestedFirst: Int!
) {
	translatableResources(
		resourceType: $resourceType
		first: $first
		after: $after
		reverse: $reverse
	) {
		nodes {
			resourceId
			translatableContent(marketId: $marketId) {
				${TRANSLATABLE_CONTENT_FIELDS}
			}
			translations(locale: $locale, marketId: $marketId, outdated: $outdated) {
				${TRANSLATION_FIELDS}
			}
			nestedTranslatableResources(
				resourceType: $nestedResourceType
				first: $nestedFirst
			) @include(if: $includeNestedResources) {
				nodes {
					resourceId
					translatableContent(marketId: $marketId) {
						${TRANSLATABLE_CONTENT_FIELDS}
					}
					translations(locale: $locale, marketId: $marketId, outdated: $outdated) {
						${TRANSLATION_FIELDS}
					}
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const TRANSLATION_REGISTER_MUTATION = `
mutation TranslationRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
	translationsRegister(resourceId: $resourceId, translations: $translations) {
		translations {
			${TRANSLATION_FIELDS}
		}
		${TRANSLATION_USER_ERRORS_FIELDS}
	}
}
`;

export const TRANSLATION_REMOVE_MUTATION = `
mutation TranslationRemove(
	$resourceId: ID!
	$translationKeys: [String!]!
	$locales: [String!]!
	$marketIds: [ID!]
) {
	translationsRemove(
		resourceId: $resourceId
		translationKeys: $translationKeys
		locales: $locales
		marketIds: $marketIds
	) {
		translations {
			${TRANSLATION_FIELDS}
		}
		${TRANSLATION_USER_ERRORS_FIELDS}
	}
}
`;

export const TRANSLATION_SHOP_LOCALES_QUERY = `
query TranslationShopLocales {
	shopLocales {
		locale
		name
		primary
		published
	}
}
`;

export const TRANSLATION_MARKETS_QUERY = `
query TranslationMarkets($first: Int!, $after: String) {
	markets(first: $first, after: $after) {
		nodes {
			id
			name
			status
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;

export const TRANSLATION_MARKETS_FROM_LOCALES_QUERY = `
query TranslationMarketsFromLocales {
	shopLocales {
		marketWebPresences {
			markets(first: 50) {
				nodes {
					id
					name
					status
				}
			}
		}
	}
}
`;
