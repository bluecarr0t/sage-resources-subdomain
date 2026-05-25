/**
 * `/glamping-market-overview` and `/brands` include only rows with `property_type` = Glamping.
 */

export const GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE = 'Glamping' as const;

export function isGlampingMarketSnapshotPropertyType(
  propertyType: string | null | undefined
): boolean {
  return (propertyType ?? '').trim() === GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE;
}

type PropertyTypeQueryable = {
  eq: (column: string, value: string) => PropertyTypeQueryable;
};

export function applyGlampingOnlyPropertyTypeFilter<T>(query: T): T {
  return (query as unknown as PropertyTypeQueryable).eq(
    'property_type',
    GLAMPING_MARKET_SNAPSHOT_PROPERTY_TYPE
  ) as unknown as T;
}
