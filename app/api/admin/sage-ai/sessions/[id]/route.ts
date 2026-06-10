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

  const { data: session, error } = await authResult.supabase
    .from('sage_ai_sessions')
    .select('id, title, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', authResult.session.user.id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: messageRows, error: msgError } = await authResult.supabase
    .from('sage_ai_messages')
    .select('id, ordinal, role, parts')
    .eq('session_id', id)
    .eq('user_id', authResult.session.user.id)
    .order('ordinal', { ascending: true });

  if (msgError) {
    console.error('[sage-ai/sessions] messages fetch error:', msgError);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }

  // useChat (`@ai-sdk/react`) requires every UIMessage to carry an `id` —
  // React uses it as the list key and the SDK uses it for diffing during
  // edit/regenerate. Without it, setMessages([...]) silently renders nothing
  // and the user sees the empty welcome state. Backfill from the row's UUID,
  // and synthesize a stable id from (session, ordinal) for any legacy row
  // that somehow lacks one.
  const messages = (messageRows ?? []).map((r) => ({
    id:
      typeof r.id === 'string' && r.id.length > 0
        ? r.id
        : `legacy-${id}-${r.ordinal}`,
    role: r.role,
    parts: Array.isArray(r.parts) ? r.parts : [],
  }));

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      created_at: session.created_at,
      updated_at: session.updated_at,
      messages,
    },
  });
}

const MAX_TITLE_LENGTH = 200;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await params;
  let body: { title?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `title must be at most ${MAX_TITLE_LENGTH} characters` },
      { status: 400 }
    );
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', authResult.session.user.id)
    .select('id, title, created_at, updated_at')
    .maybeSingle();

  if (error) {
    console.error('[sage-ai/sessions] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }

  if (!data) {
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
