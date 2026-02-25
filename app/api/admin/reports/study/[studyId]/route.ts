/**
 * API Route: Get report detail by study ID
 * GET /api/admin/reports/study/[studyId]
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const { studyId } = await params;

  try {
    const supabase = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

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

    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select(`
        *,
        clients (
          id,
          name,
          company
        )
      `)
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError) {
      console.error('[reports/study] Fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        client_name: client?.name ?? null,
        client_company: client?.company ?? null,
      },
    });
  } catch (error) {
    console.error('[reports/study] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
