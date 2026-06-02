import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { revalidateGlampingIndustryOverviewCache } from '@/lib/revalidate-glamping-industry-overview-cache';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';

export async function POST(request: NextRequest) {
  try {
    const refreshSecret = process.env.GLAMPING_INDUSTRY_OVERVIEW_REFRESH_SECRET;
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

    await revalidateGlampingIndustryOverviewCache();

    return NextResponse.json({
      success: true,
      tag: 'glamping-industry-overview',
      invalidatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[glamping-industry-overview/invalidate-next-cache]', err);
    return NextResponse.json(
      {
        success: false,
        error: rvOverviewApiDisplayError(err),
      },
      { status: 500 }
    );
  }
}
