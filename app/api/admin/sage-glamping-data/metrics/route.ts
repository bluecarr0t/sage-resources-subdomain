/**
 * API Route: Get glamping data metrics for admin dashboard
 * GET /api/admin/sage-glamping-data/metrics
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('get_glamping_metrics');

    if (error) {
      console.error('[api/admin/sage-glamping-data/metrics] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      metrics: {
        usaPropertyCount: Number(data?.usa_property_count ?? 0),
        usaUnitCount: Number(data?.usa_unit_count ?? 0),
        totalPropertyCount: Number(data?.total_property_count ?? 0),
        totalUnitCount: Number(data?.total_unit_count ?? 0),
        researchStatusNew: Number(data?.research_status_new ?? 0),
        researchStatusInProgress: Number(data?.research_status_in_progress ?? 0),
        researchStatusPublished: Number(data?.research_status_published ?? 0),
      },
    });
  } catch (err) {
    console.error('[api/admin/sage-glamping-data/metrics] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
