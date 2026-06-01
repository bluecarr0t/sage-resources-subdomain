import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { revalidateRvIndustryOverviewCache } from '@/lib/revalidate-rv-industry-overview-cache';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';

/**
 * Invalidate Next.js data tag `rv-industry-overview` only (no Campspot/RoverPass re-scan).
 *
 * Auth (either):
 * - Logged-in admin session, or
 * - Authorization: Bearer <RV_INDUSTRY_OVERVIEW_REFRESH_SECRET>
 *
 * Used after `refresh:rv-overview` / downstream ETL updates Postgres snapshot.
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

    await revalidateRvIndustryOverviewCache();

    return NextResponse.json({
      success: true,
      tag: 'rv-industry-overview',
      invalidatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[rv-industry-overview/invalidate-next-cache]', err);
    return NextResponse.json(
      {
        success: false,
        error: rvOverviewApiDisplayError(err),
      },
      { status: 500 }
    );
  }
}
