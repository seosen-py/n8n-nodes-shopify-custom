import type { ShopifyMetafieldOwnerType, ShopifyResourceValue } from '../../config/resources';

const OWNER_TYPE_BY_RESOURCE: Partial<Record<ShopifyResourceValue, ShopifyMetafieldOwnerType>> = {
	product: 'PRODUCT',
	productVariant: 'PRODUCTVARIANT',
	collection: 'COLLECTION',
	article: 'ARTICLE',
	blog: 'BLOG',
	customer: 'CUSTOMER',
	order: 'ORDER',
	draftOrder: 'DRAFTORDER',
};

export function getOwnerTypeFromResource(
	resource: ShopifyResourceValue,
): ShopifyMetafieldOwnerType | undefined {
	return OWNER_TYPE_BY_RESOURCE[resource];
}

export function isResourceWithMetafields(resource: ShopifyResourceValue): boolean {
	return OWNER_TYPE_BY_RESOURCE[resource] !== undefined;
}
