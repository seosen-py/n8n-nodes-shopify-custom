import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { assertNoGraphQLErrors, executeShopifyGraphql } from '../graphql/client';
import {
	TRANSLATION_MARKETS_FROM_LOCALES_QUERY,
	TRANSLATION_MARKETS_QUERY,
	TRANSLATION_SHOP_LOCALES_QUERY,
} from '../graphql/templates/translations';

type ShopifyTranslationContext = ILoadOptionsFunctions | IExecuteFunctions;

export interface IShopLocale {
	locale: string;
	name: string;
	primary: boolean;
	published: boolean;
}

interface IShopLocalesResponse {
	shopLocales: IShopLocale[];
}

export interface IMarketNode {
	id: string;
	name: string;
	status: string;
}

interface IMarketsResponse {
	markets: {
		nodes: IMarketNode[];
		pageInfo: {
			hasNextPage: boolean;
			endCursor?: string | null;
		};
	};
}

interface IMarketWebPresence {
	markets?: {
		nodes?: IMarketNode[];
	};
}

interface IShopLocaleWithMarkets {
	marketWebPresences?: IMarketWebPresence[];
}

interface IMarketsFromLocalesResponse {
	shopLocales: IShopLocaleWithMarkets[];
}

const LOCALES_CACHE = new Map<string, { expiresAt: number; data: IShopLocale[] }>();
const MARKETS_CACHE = new Map<string, { expiresAt: number; data: IMarketNode[] }>();
const TTL_MS = 2 * 60 * 1000;

function hasUsableCredentials(credentials: IDataObject): boolean {
	const shopSubdomain = String(credentials.shopSubdomain ?? '').trim();
	const accessToken = String(credentials.accessToken ?? '').trim();
	return shopSubdomain.length > 0 && accessToken.length > 0;
}

function getCacheKey(credentials: IDataObject): string {
	return `${String(credentials.shopSubdomain)}::${String(credentials.apiVersion ?? '2025-10')}`;
}

async function getCacheKeyFromCredentials(
	context: ShopifyTranslationContext,
): Promise<string | undefined> {
	try {
		const credentials = (await context.getCredentials('shopifyCustomAdminApi')) as IDataObject;
		if (!hasUsableCredentials(credentials)) {
			return undefined;
		}
		return getCacheKey(credentials);
	} catch {
		return undefined;
	}
}

function toLocaleLabel(locale: IShopLocale): string {
	const suffixParts: string[] = [];
	if (locale.primary) {
		suffixParts.push('Primary');
	}
	if (!locale.published) {
		suffixParts.push('Unpublished');
	}
	const suffix = suffixParts.length > 0 ? ` [${suffixParts.join(', ')}]` : '';
	return `${locale.name} (${locale.locale})${suffix}`;
}

function dedupeLocales(locales: IShopLocale[]): IShopLocale[] {
	const uniqueLocales = new Map<string, IShopLocale>();
	for (const locale of locales) {
		if (!locale.locale) {
			continue;
		}

		const existing = uniqueLocales.get(locale.locale);
		if (!existing) {
			uniqueLocales.set(locale.locale, locale);
			continue;
		}

		uniqueLocales.set(locale.locale, {
			locale: locale.locale,
			name: locale.name || existing.name,
			primary: locale.primary || existing.primary,
			published: locale.published || existing.published,
		});
	}
	return Array.from(uniqueLocales.values());
}

function dedupeMarkets(markets: IMarketNode[]): IMarketNode[] {
	const uniqueMarkets = new Map<string, IMarketNode>();
	for (const market of markets) {
		if (!market.id) {
			continue;
		}
		if (!uniqueMarkets.has(market.id)) {
			uniqueMarkets.set(market.id, market);
		}
	}
	return Array.from(uniqueMarkets.values());
}

async function fetchShopLocales(context: ShopifyTranslationContext): Promise<IShopLocale[]> {
	try {
		const response = await executeShopifyGraphql<IShopLocalesResponse>(
			context,
			TRANSLATION_SHOP_LOCALES_QUERY,
			{},
			0,
		);
		assertNoGraphQLErrors(context, response, 0);
		return response.data?.shopLocales ?? [];
	} catch {
		return [];
	}
}

export async function getShopLocales(context: ShopifyTranslationContext): Promise<IShopLocale[]> {
	const cacheKey = await getCacheKeyFromCredentials(context);
	if (!cacheKey) {
		return [];
	}

	const now = Date.now();
	const cacheEntry = LOCALES_CACHE.get(cacheKey);
	if (cacheEntry && cacheEntry.expiresAt > now) {
		return cacheEntry.data;
	}

	const locales = dedupeLocales(await fetchShopLocales(context));
	if (locales.length === 0) {
		return [];
	}

	LOCALES_CACHE.set(cacheKey, {
		expiresAt: now + TTL_MS,
		data: locales,
	});

	return locales;
}

export async function getShopLocaleOptions(
	context: ShopifyTranslationContext,
): Promise<INodePropertyOptions[]> {
	const locales = await getShopLocales(context);
	if (locales.length === 0) {
		return [];
	}

	return locales
		.map((locale) => ({
			name: toLocaleLabel(locale),
			value: locale.locale,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMarkets(context: ShopifyTranslationContext): Promise<IMarketNode[]> {
	const cacheKey = await getCacheKeyFromCredentials(context);
	if (!cacheKey) {
		return [];
	}

	const now = Date.now();

	const cacheEntry = MARKETS_CACHE.get(cacheKey);
	if (cacheEntry && cacheEntry.expiresAt > now) {
		return cacheEntry.data;
	}

	const markets: IMarketNode[] = [];
	let after: string | undefined;

	try {
		for (let page = 0; page < 10; page += 1) {
			const response = await executeShopifyGraphql<IMarketsResponse>(
				context,
				TRANSLATION_MARKETS_QUERY,
				{
					first: 100,
					after,
				},
				0,
			);
			assertNoGraphQLErrors(context, response, 0);

			const connection = response.data?.markets;
			if (!connection) {
				break;
			}

			markets.push(...(connection.nodes ?? []));
			if (!connection.pageInfo?.hasNextPage || !connection.pageInfo?.endCursor) {
				break;
			}

			after = connection.pageInfo.endCursor;
		}
	} catch {
		const fallbackMarkets: IMarketNode[] = [];
		try {
			const response = await executeShopifyGraphql<IMarketsFromLocalesResponse>(
				context,
				TRANSLATION_MARKETS_FROM_LOCALES_QUERY,
				{},
				0,
			);
			assertNoGraphQLErrors(context, response, 0);

			const shopLocales = response.data?.shopLocales ?? [];
			for (const locale of shopLocales) {
				const webPresences = Array.isArray(locale.marketWebPresences)
					? locale.marketWebPresences
					: [];
				for (const webPresence of webPresences) {
					const nodes = Array.isArray(webPresence.markets?.nodes)
						? webPresence.markets?.nodes
						: [];
					fallbackMarkets.push(...nodes);
				}
			}
		} catch {
			return [];
		}

		const dedupedFallbackMarkets = dedupeMarkets(fallbackMarkets);
		MARKETS_CACHE.set(cacheKey, {
			expiresAt: now + TTL_MS,
			data: dedupedFallbackMarkets,
		});

		return dedupedFallbackMarkets;
	}

	const dedupedMarkets = dedupeMarkets(markets);

	MARKETS_CACHE.set(cacheKey, {
		expiresAt: now + TTL_MS,
		data: dedupedMarkets,
	});

	return dedupedMarkets;
}

export async function getMarketOptions(
	context: ShopifyTranslationContext,
): Promise<INodePropertyOptions[]> {
	const markets = await getMarkets(context);
	return markets
		.map((market) => ({
			name: `${market.name} (${market.status})`,
			value: market.id,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
