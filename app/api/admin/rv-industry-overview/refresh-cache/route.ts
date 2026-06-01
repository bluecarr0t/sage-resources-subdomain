import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit } from '@/lib/admin-audit';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { revalidateRvIndustryOverviewCache } from '@/lib/revalidate-rv-industry-overview-cache';
import { recomputeCampspotRvOverviewPageData } from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';
import { rvOverviewScanMetaAnyHitCap } from '@/lib/rv-industry-overview/rv-overview-scan-meta';

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
  const refreshSecret = process.env.RV_INDUSTRY_OVERVIEW_REFRESH_SECRET;
  const authHeader = request.headers.get('authorization');
  let bearerAuthorized = false;
  let auditUserId: string | null = null;
  let auditUserEmail: string | null = null;
  let auditSource: 'session' | 'internal_api' = 'internal_api';

  try {
    if (refreshSecret && authHeader?.startsWith('Bearer ')) {
      if (authHeader !== `Bearer ${refreshSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      bearerAuthorized = true;
    }

    if (!bearerAuthorized) {
      const auth = await requireAdminAuth(request);
      if (!auth.ok) return auth.response;
      auditUserId = auth.session.user.id;
      auditUserEmail = auth.session.user.email ?? null;
      auditSource = 'session';
    }

    const data = await recomputeCampspotRvOverviewPageData();
    await revalidateRvIndustryOverviewCache();

    const scanMeta = data.scanMeta;
    const hitRowCap = scanMeta ? rvOverviewScanMetaAnyHitCap(scanMeta) : false;

    await logAdminAudit(
      {
        user_id: auditUserId,
        user_email: auditUserEmail,
        action: 'edit',
        resource_type: 'study',
        resource_id: 'rv-industry-overview',
        details: {
          kind: 'rv_overview_refresh_cache',
          rowsScannedTotal: data.rowsScannedTotal,
          rowsScannedCampspot: data.rowsScannedCampspot,
          rowsScannedRoverpass: data.rowsScannedRoverpass,
          hitRowCap,
          scanMeta,
          mapError: data.byUnitFilter.rv.mapResult.error,
          auth: auditSource,
        },
        source: auditSource,
      },
      request
    );

    return NextResponse.json({
      success: true,
      rowsScanned: data.rowsScannedTotal,
      rowsScannedCampspot: data.rowsScannedCampspot,
      rowsScannedRoverpass: data.rowsScannedRoverpass,
      hitRowCap,
      scanMeta: scanMeta ?? null,
      mapError: data.byUnitFilter.rv.mapResult.error,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[rv-industry-overview/refresh-cache]', err);
    return NextResponse.json(
      {
        success: false,
        error: rvOverviewApiDisplayError(err),
      },
      { status: 500 }
    );
  }
}
