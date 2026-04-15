/**
 * API Route: Sage AI Session by ID
 * GET /api/admin/sage-ai/sessions/[id] - Get a specific session
 * DELETE /api/admin/sage-ai/sessions/[id] - Delete a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  const { data, error } = await authResult.supabase
    .from('sage_ai_sessions')
    .select('id, title, messages, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', authResult.session.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  const { data, error } = await authResult.supabase
    .from('sage_ai_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', authResult.session.user.id)
    .select('id');

  if (error) {
    console.error('[sage-ai/sessions] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
