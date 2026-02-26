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

/**
 * PATCH /api/admin/reports/study/[studyId]
 * Update report fields: title, location, report_date, client_entity, market_type, total_sites
 */
export async function PATCH(
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

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.location !== undefined) {
      updates.location = body.location;
      // Parse "City, ST" or "City, ST 12345" into city, state, zip_code
      const loc = String(body.location || '').trim();
      if (loc) {
        const parts = loc.split(',').map((p: string) => p.trim());
        updates.city = parts[0] || null;
        if (parts[1]) {
          const rest = parts[1].split(/\s+/);
          updates.state = rest[0] || null;
          updates.zip_code = rest[1] || null;
        } else {
          updates.state = null;
          updates.zip_code = null;
        }
      } else {
        updates.city = null;
        updates.state = null;
        updates.zip_code = null;
      }
    }
    if (body.report_date !== undefined) updates.report_date = body.report_date || null;
    if (body.client_entity !== undefined) updates.client_entity = body.client_entity;
    if (body.market_type !== undefined) updates.market_type = body.market_type;
    if (body.service !== undefined) updates.service = body.service || null;
    if (body.unit_types !== undefined) {
      const arr = Array.isArray(body.unit_types) ? body.unit_types : [];
      updates.unit_descriptions = arr
        .filter((t: unknown) => typeof t === 'string' && t.trim())
        .map((t: string) => ({ type: t.trim(), quantity: null, description: null }));
    }
    if (body.amenities !== undefined) {
      const arr = Array.isArray(body.amenities) ? body.amenities : [];
      updates.key_amenities = arr
        .filter((a: unknown) => typeof a === 'string' && a.trim())
        .map((a: string) => a.trim());
    }
    if (body.total_sites !== undefined) {
      const num = Number(body.total_sites);
      updates.total_sites = Number.isNaN(num) ? null : num;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[reports/study] PATCH error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update report' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    console.error('[reports/study] PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
