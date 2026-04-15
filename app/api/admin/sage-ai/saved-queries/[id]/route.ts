/**
 * API Route: Sage AI Saved Query by ID
 * POST /api/admin/sage-ai/saved-queries/[id] - Increment use count (when used)
 * DELETE /api/admin/sage-ai/saved-queries/[id] - Delete a saved query
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;

  const { data, error } = await authResult.supabase.rpc('increment_saved_query_use_count', {
    query_id: id,
    owner_id: authResult.session.user.id,
  });

  if (error) {
    const { error: fallbackError } = await authResult.supabase
      .from('sage_ai_saved_queries')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', authResult.session.user.id);

    if (fallbackError) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ success: true });
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
    .from('sage_ai_saved_queries')
    .delete()
    .eq('id', id)
    .eq('user_id', authResult.session.user.id)
    .select('id');

  if (error) {
    console.error('[sage-ai/saved-queries] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete saved query' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Saved query not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
