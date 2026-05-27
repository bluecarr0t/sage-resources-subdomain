/**
 * Property-type cohorts for market snapshot vs. brand rankings.
 * `/glamping-market-overview` and `/brands` rankings use Glamping only.
 * Brand detail pages may include resort and boutique outdoor types via {@link applyBrandsPagePropertyTypeFilter}.
 */

export const GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE = 'Glamping' as const;

/** Published types counted on `/brands` and brand detail pages (aligns with map glamping cohort). */
export const BRANDS_PAGE_PROPERTY_TYPES = [
  'Glamping',
  'Glamping Resort',
  'Outdoor Boutique Hotel',
] as const;

export type BrandsPagePropertyType = (typeof BRANDS_PAGE_PROPERTY_TYPES)[number];

export function isGlampingMarketSnapshotPropertyType(
  propertyType: string | null | undefined
): boolean {
  return (propertyType ?? '').trim() === GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE;
}

export function isBrandsPagePropertyType(
  propertyType: string | null | undefined
): propertyType is BrandsPagePropertyType {
  const t = (propertyType ?? '').trim();
  return (BRANDS_PAGE_PROPERTY_TYPES as readonly string[]).includes(t);
}

type PropertyTypeEqQueryable = {
  eq: (column: string, value: string) => PropertyTypeEqQueryable;
};

type PropertyTypeInQueryable = {
  in: (column: string, values: readonly string[]) => PropertyTypeInQueryable;
};

export function applyGlampingOnlyPropertyTypeFilter<T>(query: T): T {
  return (query as unknown as PropertyTypeEqQueryable).eq(
    'property_type',
    GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE
  ) as unknown as T;
}

export function applyBrandsPagePropertyTypeFilter<T>(query: T): T {
  return (query as unknown as PropertyTypeInQueryable).in(
    'property_type',
    [...BRANDS_PAGE_PROPERTY_TYPES]
  ) as unknown as T;
}
