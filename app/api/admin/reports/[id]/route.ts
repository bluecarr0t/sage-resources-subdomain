/**
 * API Route: Get, Update, or Delete a single report
 * GET /api/admin/reports/[id]
 * PUT /api/admin/reports/[id]
 * DELETE /api/admin/reports/[id]
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

async function getAuthContext() {
  const supabase = await createServerClientWithCookies();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { error: 'Authentication required', status: 401 };
  }

  if (!isAllowedEmailDomain(session.user.email)) {
    return { error: 'Access denied', status: 403 };
  }

  const hasAccess = await isManagedUser(session.user.id);
  if (!hasAccess) {
    return { error: 'Access denied', status: 403 };
  }

  return { supabase, userId: session.user.id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, userId, error, status } = await getAuthContext();

  if (error) {
    return NextResponse.json({ success: false, error }, { status: status! });
  }

  const { data, error: fetchError } = await supabase!
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId!)
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
  const { supabase, userId, error, status } = await getAuthContext();

  if (error) {
    return NextResponse.json({ success: false, error }, { status: status! });
  }

  const body = await request.json();
  const allowedFields = [
    'title', 'property_name', 'location', 'market_type', 'total_sites',
    'status', 'dropbox_url', 'address_1', 'address_2', 'city', 'state', 'zip_code', 'country',
    'client_id'
  ];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updateData[key] = body[key];
  }
  const { data, error: updateError } = await supabase!
    .from('reports')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId!)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, report: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, userId, error, status } = await getAuthContext();

  if (error) {
    return NextResponse.json({ success: false, error }, { status: status! });
  }

  const { error: deleteError } = await supabase!
    .from('reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId!);

  if (deleteError) {
    return NextResponse.json(
      { success: false, error: deleteError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
