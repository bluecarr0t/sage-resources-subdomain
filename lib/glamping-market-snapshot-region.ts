/**
 * Geography scope for `/glamping-market-overview` aggregates (national + unit types).
 * Matches common `all_glamping_properties.country` spellings for the United States and Canada.
 */
export const GLAMPING_MARKET_SNAPSHOT_COUNTRY_IN = [
  'United States',
  'US',
  'USA',
  'United States of America',
  'Canada',
  'CA',
] as const;

/** Subset for queries that should return United States rows only (e.g. US state map). */
export const GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN = [
  'United States',
  'US',
  'USA',
  'United States of America',
] as const;

/** Subset for queries that should return Canada rows only. */
export const GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN = ['Canada', 'CA'] as const;

export type GlampingMarketSnapshotMarket = 'us' | 'ca';

export function parseGlampingMarketSnapshotMarket(
  raw: string | string[] | undefined
): GlampingMarketSnapshotMarket {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s?.toLowerCase() === 'ca' ? 'ca' : 'us';
}

export function countryValuesForGlampingMarketSnapshot(
  market: GlampingMarketSnapshotMarket
): readonly string[] {
  return market === 'ca'
    ? GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN
    : GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN;
}
