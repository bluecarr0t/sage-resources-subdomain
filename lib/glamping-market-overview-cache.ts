/**
 * Next.js cache tag + TTL for `/glamping-market-overview` aggregate fetches.
 * Also tagged with `properties` so `revalidatePropertiesCache()` invalidates them.
 */

export const GLAMPING_MARKET_OVERVIEW_CACHE_TAG = 'glamping-market-overview';

/** 30 minutes — same ballpark as public map property counts. */
export const GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS = 1800;

export const GLAMPING_MARKET_OVERVIEW_CACHE_TAGS = [
  GLAMPING_MARKET_OVERVIEW_CACHE_TAG,
  'properties',
] as const;
