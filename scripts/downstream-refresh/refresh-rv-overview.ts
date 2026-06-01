import { createServerClient } from '../../lib/supabase';
import { recomputeCampspotRvOverviewPageData } from '../../lib/rv-industry-overview/campspot-rv-overview-page-data';
import { revalidateRvIndustryOverviewNextCacheRemote } from '../../lib/rv-industry-overview/revalidate-rv-overview-next-cache-remote';

export interface RefreshRvOverviewResult {
  rowsScanned: number;
  mapError: string | null;
  durationMs: number;
  nextCacheInvalidated: boolean;
  nextCacheInvalidateSkipped?: boolean;
  nextCacheInvalidateError?: string;
}

/**
 * Re-scan `campspot` + RoverPass and upsert `campspot_rv_overview_cache`, then invalidate
 * Next.js tag `rv-industry-overview` via the deployed invalidate-next-cache API.
 *
 * Uses SUPABASE_SECRET_KEY + NEXT_PUBLIC_SUPABASE_URL (same as admin refresh API).
 * For Next.js invalidation: RV_INDUSTRY_OVERVIEW_REFRESH_SECRET + SITE_URL (or VERCEL_URL).
 */
export async function refreshRvOverviewCache(): Promise<RefreshRvOverviewResult> {
  const started = Date.now();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required for RV overview refresh'
    );
  }

  createServerClient();

  const data = await recomputeCampspotRvOverviewPageData();

  const revalidate = await revalidateRvIndustryOverviewNextCacheRemote();

  return {
    rowsScanned: data.rowsScannedTotal,
    mapError: data.byUnitFilter.rv.mapResult.error,
    durationMs: Date.now() - started,
    nextCacheInvalidated: revalidate.ok,
    nextCacheInvalidateSkipped: revalidate.skipped,
    nextCacheInvalidateError: revalidate.ok ? undefined : revalidate.error,
  };
}
