import { createServerClient } from '../../lib/supabase';
import { recomputeGlampingIndustryOverviewPageData } from '../../lib/glamping-industry-overview/glamping-industry-overview-page-data';
import { revalidateGlampingIndustryOverviewNextCacheRemote } from '../../lib/glamping-industry-overview/revalidate-glamping-overview-next-cache-remote';

export interface RefreshGlampingOverviewResult {
  rowsScanned: number;
  mapError: string | null;
  durationMs: number;
  nextCacheInvalidated: boolean;
  nextCacheInvalidateSkipped?: boolean;
  nextCacheInvalidateError?: string;
}

export async function refreshGlampingOverviewCache(): Promise<RefreshGlampingOverviewResult> {
  const started = Date.now();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required for glamping overview refresh'
    );
  }

  createServerClient();

  const data = await recomputeGlampingIndustryOverviewPageData();
  const revalidate = await revalidateGlampingIndustryOverviewNextCacheRemote();

  return {
    rowsScanned: data.rowsScannedTotal,
    mapError: data.slice.mapResult.error,
    durationMs: Date.now() - started,
    nextCacheInvalidated: revalidate.ok,
    nextCacheInvalidateSkipped: revalidate.skipped,
    nextCacheInvalidateError: revalidate.ok ? undefined : revalidate.error,
  };
}
