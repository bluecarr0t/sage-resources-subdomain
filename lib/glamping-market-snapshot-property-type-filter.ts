/**
 * Property-type cohorts for market snapshot and `/brands` rankings (Glamping only).
 * Public `/brand/[slug]` detail pages include all published `property_type` values.
 */

export const GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE = 'Glamping' as const;

export function isGlampingMarketSnapshotPropertyType(
  propertyType: string | null | undefined
): boolean {
  return (propertyType ?? '').trim() === GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE;
}

type PropertyTypeEqQueryable = {
  eq: (column: string, value: string) => PropertyTypeEqQueryable;
};

export function applyGlampingOnlyPropertyTypeFilter<T>(query: T): T {
  return (query as unknown as PropertyTypeEqQueryable).eq(
    'property_type',
    GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE
  ) as unknown as T;
}
