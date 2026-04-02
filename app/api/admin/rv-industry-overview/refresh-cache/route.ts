import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import {
  recomputeCampspotRvOverviewPageData,
  RV_INDUSTRY_OVERVIEW_CACHE_TAG,
} from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';

/**
 * Re-scan `campspot`, rebuild aggregates in Node, upsert `campspot_rv_overview_cache`,
 * and invalidate Next.js data tag `rv-industry-overview`.
 *
 * Auth (either):
 * - Logged-in admin (session + managed_users), or
 * - Authorization: Bearer <RV_INDUSTRY_OVERVIEW_REFRESH_SECRET> when that env var is set.
 *
 * Call from Campspot ETL or cron after data loads.
 */
export async function POST(request: NextRequest) {
  try {
    const refreshSecret = process.env.RV_INDUSTRY_OVERVIEW_REFRESH_SECRET;
    const authHeader = request.headers.get('authorization');
    let authorized = false;

    if (refreshSecret && authHeader?.startsWith('Bearer ')) {
      if (authHeader !== `Bearer ${refreshSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      authorized = true;
    }

    if (!authorized) {
      const auth = await requireAdminAuth(request);
      if (!auth.ok) return auth.response;
    }

    const data = await recomputeCampspotRvOverviewPageData();
    revalidateTag(RV_INDUSTRY_OVERVIEW_CACHE_TAG);

    return NextResponse.json({
      success: true,
      rowsScanned: data.mapResult.rowsScanned,
      mapError: data.mapResult.error,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[rv-industry-overview/refresh-cache]', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
