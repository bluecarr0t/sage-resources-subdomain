/**
 * API Route: Get report detail by study ID
 * GET /api/admin/reports/study/[studyId]
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { withAdminAuth } from '@/lib/require-admin-auth';
import { logAdminAudit } from '@/lib/admin-audit';

type ParamsContext = { params: Promise<{ studyId: string }> };

export const GET = withAdminAuth<ParamsContext>(async (_request, auth, context) => {
  const { studyId } = await context!.params;

  try {
    const { data: report, error: fetchError } = await auth.supabase
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
      .order('created_at', { ascending: false })
      .limit(1)
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
});

/**
 * PATCH /api/admin/reports/study/[studyId]
 * Update report fields: title, location, report_date, client_entity, market_type, total_sites
 */
export const PATCH = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  const { studyId } = await context!.params;

  try {
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

    const { data: existing } = await auth.supabase
      .from('reports')
      .select('id')
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const { data, error } = await auth.supabase
      .from('reports')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[reports/study] PATCH error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update report' },
        { status: 500 }
      );
    }

    await logAdminAudit(
      {
        user_id: auth.session.user.id,
        user_email: auth.session.user.email ?? undefined,
        action: 'edit',
        resource_type: 'report',
        resource_id: data.id,
        study_id: studyId,
        details: { fields: Object.keys(updates) },
        source: 'session',
      },
      request
    );

    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    console.error('[reports/study] PATCH Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
