import { COMPS_UNIFIED_FACETS_CACHE_KEYS } from '../../lib/comps-unified/facets-cache-keys';
import { getRedis } from '../../lib/upstash';

export { COMPS_UNIFIED_FACETS_CACHE_KEYS };

export interface InvalidateFacetsCacheResult {
  invalidated: boolean;
  keys: string[];
}

/**
 * Clear Upstash facet dropdown cache so the next /admin/comps load reflects
 * the refreshed unified_comps matview.
 */
export async function invalidateCompsUnifiedFacetsCache(): Promise<InvalidateFacetsCacheResult> {
  const redis = getRedis();
  const keys = [...COMPS_UNIFIED_FACETS_CACHE_KEYS];

  if (!redis) {
    console.warn('  Upstash not configured — skipping facets cache invalidation.');
    return { invalidated: false, keys };
  }

  await Promise.all(keys.map((key) => redis.del(key)));
  return { invalidated: true, keys };
}
