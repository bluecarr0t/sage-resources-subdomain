/**
 * API Route: Get, Update, or Delete a single report (org-wide for internal Sage users)
 * GET /api/admin/reports/[id]
 * PUT /api/admin/reports/[id]
 * DELETE /api/admin/reports/[id]
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { logAdminAudit } from '@/lib/admin-audit';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';

async function getAuthContext(request?: NextRequest) {
  const supabase = await createServerClientWithCookies();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { response: unauthorizedResponse(), status: 401 };
  }

  if (!isAllowedEmailDomain(session.user.email)) {
    return { response: forbiddenResponse(), status: 403 };
  }

  const hasAccess = await isManagedUser(session.user.id);
  if (!hasAccess) {
    return { response: forbiddenResponse(), status: 403 };
  }

  return { supabase, session, request };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if ('response' in ctx) {
    return ctx.response;
  }
  const { supabase } = ctx;

  const { data, error: fetchError } = await supabase!
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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if ('response' in ctx) return ctx.response;
  const { supabase, session } = ctx;

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
  const { data, error: updateError } = await supabase!
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
      user_id: session!.user.id,
      user_email: session!.user.email ?? undefined,
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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext(request);
  if ('response' in ctx) return ctx.response;
  const { supabase, session } = ctx;

  const { data: report } = await supabase!
    .from('reports')
    .select('study_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  const { error: deleteError } = await supabase!
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
      user_id: session!.user.id,
      user_email: session!.user.email ?? undefined,
      action: 'delete',
      resource_type: 'report',
      resource_id: id,
      study_id: report?.study_id ?? undefined,
      source: 'session',
    },
    request
  );

  return NextResponse.json({ success: true });
}
