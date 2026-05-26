import { createServerClient } from '../../lib/supabase';
import { recomputeCampspotRvOverviewPageData } from '../../lib/rv-industry-overview/campspot-rv-overview-page-data';

export interface RefreshRvOverviewResult {
  rowsScanned: number;
  mapError: string | null;
  durationMs: number;
}

/**
 * Re-scan public.campspot and upsert campspot_rv_overview_cache (Postgres snapshot).
 * Uses SUPABASE_SECRET_KEY + NEXT_PUBLIC_SUPABASE_URL (same as admin refresh API).
 */
export async function refreshRvOverviewCache(): Promise<RefreshRvOverviewResult> {
  const started = Date.now();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required for RV overview refresh'
    );
  }

  // Ensure client is constructible before a long campspot scan.
  createServerClient();

  const data = await recomputeCampspotRvOverviewPageData();

  return {
    rowsScanned: data.rowsScannedTotal,
    mapError: data.byUnitFilter.rv.mapResult.error,
    durationMs: Date.now() - started,
  };
}
