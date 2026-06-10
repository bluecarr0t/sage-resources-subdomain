import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeAnchorPointInsights, type ComputeInsightsParams } from './index';
import { areaFilterCacheKeyPart } from './area-filter';
import { CACHE_TTL_SECONDS } from './constants';

function bandsKeyFromParams(params: ComputeInsightsParams): string {
  const t = params.distanceBandThresholds;
  return t && t.length > 0 ? t.join(',') : 'default';
}

function buildUnstableCacheKeyParts(params: ComputeInsightsParams): string[] {
  const { stateFilter, anchorType, anchorId, anchorSlug, propertyTypeFilter = 'glamping', areaFilter } = params;
  return [
    'anchor-point-insights-compute',
    anchorType,
    stateFilter ?? 'all',
    anchorId != null ? `id:${anchorId}` : anchorSlug ? `slug:${anchorSlug}` : 'all',
    bandsKeyFromParams(params),
    propertyTypeFilter,
    areaFilterCacheKeyPart(areaFilter),
  ];
}

/**
 * Next.js data cache for the heavy Supabase aggregation pipeline.
 * Complements Redis in the API route: helps when Redis is unavailable and
 * warms faster across instances than Redis alone on some hosts.
 */
export function computeAnchorPointInsightsCached(
  supabase: SupabaseClient,
  params: ComputeInsightsParams
): Promise<Awaited<ReturnType<typeof computeAnchorPointInsights>>> {
  const keyParts = buildUnstableCacheKeyParts(params);
  return unstable_cache(
    () => computeAnchorPointInsights(supabase, params),
    keyParts,
    { revalidate: CACHE_TTL_SECONDS }
  )();
}
