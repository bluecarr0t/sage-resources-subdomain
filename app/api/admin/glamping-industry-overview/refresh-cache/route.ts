import { NextRequest, NextResponse } from 'next/server';
import { logAdminAudit } from '@/lib/admin-audit';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { revalidateGlampingIndustryOverviewCache } from '@/lib/revalidate-glamping-industry-overview-cache';
import { recomputeGlampingIndustryOverviewPageData } from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';
import { rvOverviewScanMetaAnyHitCap } from '@/lib/rv-industry-overview/rv-overview-scan-meta';

/** Hipcamp + Sage full-table scans can exceed the default serverless limit. */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const refreshSecret = process.env.GLAMPING_INDUSTRY_OVERVIEW_REFRESH_SECRET;
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

    const data = await recomputeGlampingIndustryOverviewPageData();
    await revalidateGlampingIndustryOverviewCache();

    const scanMeta = data.scanMeta;
    const hitRowCap = scanMeta ? rvOverviewScanMetaAnyHitCap(scanMeta) : false;

    await logAdminAudit(
      {
        user_id: auditUserId,
        user_email: auditUserEmail,
        action: 'edit',
        resource_type: 'study',
        resource_id: 'glamping-industry-overview',
        details: {
          kind: 'glamping_overview_refresh_cache',
          rowsScannedTotal: data.rowsScannedTotal,
          rowsScannedHipcamp: data.rowsScannedHipcamp,
          rowsScannedSage: data.rowsScannedSage,
          hitRowCap,
          scanMeta,
          mapError: data.slice.mapResult.error,
          auth: auditSource,
        },
        source: auditSource,
      },
      request
    );

    return NextResponse.json({
      success: true,
      rowsScanned: data.rowsScannedTotal,
      rowsScannedHipcamp: data.rowsScannedHipcamp,
      rowsScannedSage: data.rowsScannedSage,
      hitRowCap,
      scanMeta: scanMeta ?? null,
      mapError: data.slice.mapResult.error,
      computedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[glamping-industry-overview/refresh-cache]', err);
    return NextResponse.json(
      {
        success: false,
        error: rvOverviewApiDisplayError(err),
      },
      { status: 500 }
    );
  }
}
