/**
 * API Route: Sage AI Saved Queries
 * GET /api/admin/sage-ai/saved-queries - List user's saved queries
 * POST /api/admin/sage-ai/saved-queries - Create a new saved query
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_saved_queries')
    .select('id, name, query, use_count, created_at')
    .eq('user_id', authResult.session.user.id)
    .order('use_count', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[sage-ai/saved-queries] List error:', error);
    return NextResponse.json({ error: 'Failed to fetch saved queries' }, { status: 500 });
  }

  return NextResponse.json({ queries: data ?? [] });
}

export async function POST(request: Request) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: { name: string; query: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_saved_queries')
    .insert({
      user_id: authResult.session.user.id,
      name: body.name.trim(),
      query: body.query.trim(),
    })
    .select('id, name, query, use_count, created_at')
    .single();

  if (error) {
    console.error('[sage-ai/saved-queries] Insert error:', error);
    return NextResponse.json({ error: 'Failed to save query' }, { status: 500 });
  }

  return NextResponse.json({ query: data });
}
