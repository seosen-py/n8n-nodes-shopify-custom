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
	$includeMarketContext: Boolean!
	$outdated: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
) {
	translatableResource(resourceId: $resourceId) {
		resourceId
		translatableContent {
			${TRANSLATABLE_CONTENT_FIELDS}
		}
		marketTranslatableContent: translatableContent(marketId: $marketId)
			@include(if: $includeMarketContext) {
			${TRANSLATABLE_CONTENT_FIELDS}
		}
		globalTranslations: translations(locale: $locale, outdated: $outdated) {
			${TRANSLATION_FIELDS}
		}
		marketTranslations: translations(locale: $locale, marketId: $marketId, outdated: $outdated)
			@include(if: $includeMarketContext) {
			${TRANSLATION_FIELDS}
		}
		metafields: nestedTranslatableResources(
			resourceType: METAFIELD
			first: $metafieldsFirst
		) @include(if: $includeMetafields) {
			nodes {
				resourceId
				translatableContent {
					${TRANSLATABLE_CONTENT_FIELDS}
				}
				marketTranslatableContent: translatableContent(marketId: $marketId)
					@include(if: $includeMarketContext) {
					${TRANSLATABLE_CONTENT_FIELDS}
				}
				globalTranslations: translations(locale: $locale, outdated: $outdated) {
					${TRANSLATION_FIELDS}
				}
				marketTranslations: translations(
					locale: $locale
					marketId: $marketId
					outdated: $outdated
				) @include(if: $includeMarketContext) {
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
	$includeMarketContext: Boolean!
	$outdated: Boolean
	$includeMetafields: Boolean!
	$metafieldsFirst: Int!
) {
	translatableResources(
		resourceType: $resourceType
		first: $first
		after: $after
		reverse: $reverse
	) {
		nodes {
			resourceId
			translatableContent {
				${TRANSLATABLE_CONTENT_FIELDS}
			}
			marketTranslatableContent: translatableContent(marketId: $marketId)
				@include(if: $includeMarketContext) {
				${TRANSLATABLE_CONTENT_FIELDS}
			}
			globalTranslations: translations(locale: $locale, outdated: $outdated) {
				${TRANSLATION_FIELDS}
			}
			marketTranslations: translations(locale: $locale, marketId: $marketId, outdated: $outdated)
				@include(if: $includeMarketContext) {
				${TRANSLATION_FIELDS}
			}
			metafields: nestedTranslatableResources(
				resourceType: METAFIELD
				first: $metafieldsFirst
			) @include(if: $includeMetafields) {
				nodes {
					resourceId
					translatableContent {
						${TRANSLATABLE_CONTENT_FIELDS}
					}
					marketTranslatableContent: translatableContent(marketId: $marketId)
						@include(if: $includeMarketContext) {
						${TRANSLATABLE_CONTENT_FIELDS}
					}
					globalTranslations: translations(locale: $locale, outdated: $outdated) {
						${TRANSLATION_FIELDS}
					}
					marketTranslations: translations(
						locale: $locale
						marketId: $marketId
						outdated: $outdated
					) @include(if: $includeMarketContext) {
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

export const TRANSLATION_COLLECTION_METAFIELD_IDS_QUERY = `
query TranslationCollectionMetafieldIds($collectionIds: [ID!]!, $metafieldsFirst: Int!) {
	nodes(ids: $collectionIds) {
		... on Collection {
			id
			metafields(first: $metafieldsFirst) {
				nodes {
					id
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}
	}
}
`;

export const TRANSLATION_RESOURCES_BY_IDS_QUERY = `
query TranslationResourcesByIds(
	$resourceIds: [ID!]!
	$first: Int!
	$locale: String!
	$marketId: ID
	$includeMarketContext: Boolean!
	$outdated: Boolean
) {
	translatableResourcesByIds(resourceIds: $resourceIds, first: $first) {
		nodes {
			resourceId
			translatableContent {
				${TRANSLATABLE_CONTENT_FIELDS}
			}
			marketTranslatableContent: translatableContent(marketId: $marketId)
				@include(if: $includeMarketContext) {
				${TRANSLATABLE_CONTENT_FIELDS}
			}
			globalTranslations: translations(locale: $locale, outdated: $outdated) {
				${TRANSLATION_FIELDS}
			}
			marketTranslations: translations(locale: $locale, marketId: $marketId, outdated: $outdated)
				@include(if: $includeMarketContext) {
				${TRANSLATION_FIELDS}
			}
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}
`;
