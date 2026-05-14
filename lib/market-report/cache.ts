/**
 * Tiny in-process TTL + LRU cache for market-report fetches. The hot paths
 * (national cohorts, demand-driver lookups against ski/wineries) pull
 * thousands of rows on every request; with this layer the second-to-Nth
 * call inside an analyst session is effectively free.
 *
 * Trade-offs:
 *   - Per-instance only (will not span Vercel function invocations / cold starts).
 *   - Stale window equal to the per-namespace TTL; UI exposes a "Force refresh"
 *     toggle that bypasses the cache.
 *   - Cap at MAX_ENTRIES with LRU eviction so memory usage stays bounded
 *     even if every key is unique.
 *
 * Stored across HMR reloads via globalThis so dev iteration doesn't blow
 * away the cache on every save.
 */

const MAX_ENTRIES = 64;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  /** ms since epoch when the value was last written; surfaced as cachedAt. */
  storedAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

interface CacheStore {
  map: Map<string, CacheEntry<unknown>>;
  stats: CacheStats;
}

const GLOBAL_KEY = '__sage_market_report_cache_v1__';

function getStore(): CacheStore {
  const g = globalThis as unknown as Record<string, CacheStore | undefined>;
  let store = g[GLOBAL_KEY];
  if (!store) {
    store = { map: new Map(), stats: { hits: 0, misses: 0, evictions: 0 } };
    g[GLOBAL_KEY] = store;
  }
  return store;
}

function evictExpired(now: number): void {
  const store = getStore();
  for (const [k, v] of store.map) {
    if (v.expiresAt <= now) store.map.delete(k);
  }
}

function evictLruIfNeeded(): void {
  const store = getStore();
  while (store.map.size > MAX_ENTRIES) {
    // Map iteration order is insertion order; oldest is .keys().next()
    const oldestKey = store.map.keys().next().value;
    if (oldestKey === undefined) break;
    store.map.delete(oldestKey);
    store.stats.evictions += 1;
  }
}

export interface CacheLookup<T> {
  value: T;
  /** True when served from cache (vs fresh fetch). */
  cached: boolean;
  /** ms since epoch when the cached value was written; null on miss. */
  cachedAt: number | null;
}

/**
 * Get-or-fetch with TTL. On hit: returns cached value with storedAt timestamp.
 * On miss (or expired): runs `fetcher`, stores the result, returns it.
 *
 * Pass `force=true` (e.g. from a "refresh" UI toggle) to bypass the cache
 * read but still write the fresh value back for subsequent callers.
 */
export async function cacheGetOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  opts: { force?: boolean } = {}
): Promise<CacheLookup<T>> {
  const store = getStore();
  const now = Date.now();

  if (!opts.force) {
    const hit = store.map.get(key);
    if (hit && hit.expiresAt > now) {
      // LRU bump: re-insert to mark as most recently used.
      store.map.delete(key);
      store.map.set(key, hit);
      store.stats.hits += 1;
      return { value: hit.value as T, cached: true, cachedAt: hit.storedAt };
    }
  }

  store.stats.misses += 1;
  // Evict expired entries opportunistically while we're already iterating
  // through the cache lifecycle on a miss.
  evictExpired(now);

  const value = await fetcher();
  store.map.set(key, { value, expiresAt: now + ttlMs, storedAt: now });
  evictLruIfNeeded();
  return { value, cached: false, cachedAt: now };
}

export function getCacheStats(): CacheStats & { size: number } {
  const store = getStore();
  return { ...store.stats, size: store.map.size };
}

/** Clear the entire cache. Useful for tests and a future admin "Clear cache" button. */
export function clearCache(): void {
  const store = getStore();
  store.map.clear();
  store.stats = { hits: 0, misses: 0, evictions: 0 };
}

/** Round to N decimals — used for normalizing lat/lng into stable cache keys. */
export function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/** TTL constants — tune in one place. */
export const CACHE_TTL_MS = {
  /** National RV cohort: full-table pagination is expensive — cache longer. */
  NATIONAL_RV_COHORT: 6 * 60 * 60 * 1000, // 6 hours
  /** National cohort: largest payload, source data changes slowly. */
  NATIONAL_COHORT: 60 * 60 * 1000, // 1 hour
  /** Local cohort: medium payload, source data updated more frequently. */
  LOCAL_COHORT: 30 * 60 * 1000, // 30 minutes
  /** External reference tables (parks/ski/wineries) — change rarely. */
  DEMAND_DRIVERS: 6 * 60 * 60 * 1000, // 6 hours
  /** Census / BEA county data — basically static between annual updates. */
  COUNTY_METRICS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Stable cache key for `loadMarketReportCohort` — shared by the JSON report
 * route and the cohort CSV export so a full national RV pagination run is
 * reused instead of re-hitting Supabase.
 */
export function buildMarketReportCohortCacheKey(input: {
  segment: 'glamping' | 'rv_resort';
  scope: 'local' | 'national';
  anchorLat: number;
  anchorLng: number;
  radiusMiles: number;
  stateAbbr: string;
  adrMin: number | null | undefined;
  adrMax: number | null | undefined;
  minSiteUnitCount: number | null | undefined;
}): string {
  const { segment, scope, anchorLat, anchorLng, radiusMiles, stateAbbr, adrMin, adrMax, minSiteUnitCount } = input;
  const parts = [
    'cohort',
    segment,
    scope,
    scope === 'local' ? `${roundTo(anchorLat, 4)},${roundTo(anchorLng, 4)}` : 'us',
    scope === 'local' ? `r=${radiusMiles}` : 'rNA',
    `state=${stateAbbr || 'NA'}`,
    `adr=${adrMin ?? 'NA'}-${adrMax ?? 'NA'}`,
    `minSu=${minSiteUnitCount ?? 'NA'}`,
  ];
  if (scope === 'national' && segment === 'rv_resort') {
    parts.push('rvNat=paged-v1');
  }
  return parts.join('|');
}

/** TTL for a cohort cache entry (matches `/api/admin/market-report` semantics). */
export function marketReportCohortCacheTtlMs(
  segment: 'glamping' | 'rv_resort',
  scope: 'local' | 'national'
): number {
  if (scope === 'national' && segment === 'rv_resort') return CACHE_TTL_MS.NATIONAL_RV_COHORT;
  if (scope === 'national') return CACHE_TTL_MS.NATIONAL_COHORT;
  return CACHE_TTL_MS.LOCAL_COHORT;
}
