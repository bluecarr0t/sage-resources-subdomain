import {
  buildMarketReportCohortCacheKey,
  cacheGetOrFetch,
  CACHE_TTL_MS,
  clearCache,
  getCacheStats,
  marketReportCohortCacheTtlMs,
  roundTo,
} from '@/lib/market-report/cache';

describe('market-report cache', () => {
  beforeEach(() => {
    clearCache();
  });

  it('runs the fetcher exactly once on a cache miss + hit sequence', async () => {
    const fetcher = jest.fn(async () => ({ payload: 'value-1' }));
    const a = await cacheGetOrFetch('k1', 60_000, fetcher);
    const b = await cacheGetOrFetch('k1', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a.cached).toBe(false);
    expect(a.cachedAt).not.toBeNull();
    expect(b.cached).toBe(true);
    expect(b.value).toEqual({ payload: 'value-1' });
    // cachedAt on the hit must reference the same write timestamp as the miss.
    expect(b.cachedAt).toBe(a.cachedAt);
  });

  it('re-runs the fetcher when force=true (and writes the fresh value)', async () => {
    const fetcher = jest.fn(async () => ({ ts: Date.now() }));
    await cacheGetOrFetch('k2', 60_000, fetcher);
    const forced = await cacheGetOrFetch('k2', 60_000, fetcher, { force: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(forced.cached).toBe(false);
    // Subsequent unforced read should hit the just-written value.
    const followup = await cacheGetOrFetch('k2', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(followup.cached).toBe(true);
  });

  it('treats expired entries as misses', async () => {
    let n = 0;
    const fetcher = jest.fn(async () => ({ n: ++n }));
    await cacheGetOrFetch('k3', 5, fetcher);
    await new Promise((r) => setTimeout(r, 10));
    const second = await cacheGetOrFetch('k3', 5, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(second.cached).toBe(false);
    expect(second.value).toEqual({ n: 2 });
  });

  it('isolates entries by cache key', async () => {
    const f1 = jest.fn(async () => 'a');
    const f2 = jest.fn(async () => 'b');
    const a = await cacheGetOrFetch('alpha', 60_000, f1);
    const b = await cacheGetOrFetch('beta', 60_000, f2);
    expect(a.value).toBe('a');
    expect(b.value).toBe('b');
    expect(f1).toHaveBeenCalledTimes(1);
    expect(f2).toHaveBeenCalledTimes(1);
  });

  it('records hit/miss stats', async () => {
    const fetcher = jest.fn(async () => 1);
    await cacheGetOrFetch('s1', 60_000, fetcher); // miss
    await cacheGetOrFetch('s1', 60_000, fetcher); // hit
    await cacheGetOrFetch('s1', 60_000, fetcher); // hit
    const stats = getCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(2);
  });

  it('roundTo collapses near-duplicate floats', () => {
    expect(roundTo(42.123456, 4)).toBe(42.1235);
    expect(roundTo(-87.654321, 3)).toBe(-87.654);
  });

  it('exposes sane TTLs (ordering: county >= drivers >= national >= local)', () => {
    expect(CACHE_TTL_MS.COUNTY_METRICS).toBeGreaterThanOrEqual(CACHE_TTL_MS.DEMAND_DRIVERS);
    expect(CACHE_TTL_MS.DEMAND_DRIVERS).toBeGreaterThanOrEqual(CACHE_TTL_MS.NATIONAL_COHORT);
    expect(CACHE_TTL_MS.NATIONAL_COHORT).toBeGreaterThanOrEqual(CACHE_TTL_MS.LOCAL_COHORT);
  });

  it('buildMarketReportCohortCacheKey appends rvNat only for national RV', () => {
    const base = {
      anchorLat: 40.1,
      anchorLng: -105.2,
      radiusMiles: 50,
      stateAbbr: 'CO',
      adrMin: 10,
      adrMax: 200,
      minSiteUnitCount: 3,
    };
    const glampNat = buildMarketReportCohortCacheKey({ ...base, segment: 'glamping', scope: 'national' });
    expect(glampNat).not.toContain('rvNat');
    const rvNat = buildMarketReportCohortCacheKey({ ...base, segment: 'rv_resort', scope: 'national' });
    expect(rvNat).toContain('rvNat=paged-v1');
  });

  it('buildMarketReportCohortCacheKey varies with minSiteUnitCount', () => {
    const base = {
      segment: 'glamping' as const,
      scope: 'local' as const,
      anchorLat: 44.0,
      anchorLng: -121.3,
      radiusMiles: 100,
      stateAbbr: 'OR',
      adrMin: null as number | null,
      adrMax: null as number | null,
    };
    const a = buildMarketReportCohortCacheKey({ ...base, minSiteUnitCount: 3 });
    const b = buildMarketReportCohortCacheKey({ ...base, minSiteUnitCount: 10 });
    expect(a).toContain('minSu=3');
    expect(b).toContain('minSu=10');
    expect(a).not.toBe(b);
  });

  it('marketReportCohortCacheTtlMs uses longer TTL for national RV', () => {
    expect(marketReportCohortCacheTtlMs('rv_resort', 'national')).toBe(CACHE_TTL_MS.NATIONAL_RV_COHORT);
    expect(marketReportCohortCacheTtlMs('glamping', 'national')).toBe(CACHE_TTL_MS.NATIONAL_COHORT);
    expect(marketReportCohortCacheTtlMs('rv_resort', 'local')).toBe(CACHE_TTL_MS.LOCAL_COHORT);
  });
});
