/**
 * API Route: Get, Update, or Delete a single report (org-wide for internal Sage users)
 * GET /api/admin/reports/[id]
 * PUT /api/admin/reports/[id]
 * DELETE /api/admin/reports/[id]
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { logAdminAudit } from '@/lib/admin-audit';

type ParamsContext = { params: Promise<{ id: string }> };

export const GET = withAdminAuth<ParamsContext>(async (_request, auth, context) => {
  const { id } = await context!.params;
  const { data, error: fetchError } = await auth.supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (fetchError || !data) {
    return NextResponse.json(
      { success: false, error: 'Report not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, report: data });
});

export const PUT = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const allowedFields = [
    'title', 'property_name', 'location', 'market_type', 'total_sites',
    'status', 'dropbox_url', 'address_1', 'address_2', 'city', 'state', 'zip_code', 'country',
    'client_id', 'service'
  ];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updateData[key] = body[key];
  }
  const { data, error: updateError } = await auth.supabase
    .from('reports')
    .update(updateData)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 400 }
    );
  }

  await logAdminAudit(
    {
      user_id: auth.session.user.id,
      user_email: auth.session.user.email ?? undefined,
      action: 'edit',
      resource_type: 'report',
      resource_id: id,
      study_id: data?.study_id ?? undefined,
      details: { fields: Object.keys(updateData) },
      source: 'session',
    },
    request
  );

  return NextResponse.json({ success: true, report: data });
});

export const DELETE = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  const { id } = await context!.params;
  const { data: report } = await auth.supabase
    .from('reports')
    .select('study_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  const { error: deleteError } = await auth.supabase
    .from('reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (deleteError) {
    return NextResponse.json(
      { success: false, error: deleteError.message },
      { status: 400 }
    );
  }

  await logAdminAudit(
    {
      user_id: auth.session.user.id,
      user_email: auth.session.user.email ?? undefined,
      action: 'delete',
      resource_type: 'report',
      resource_id: id,
      study_id: report?.study_id ?? undefined,
      source: 'session',
    },
    request
  );

  return NextResponse.json({ success: true });
});
