/**
 * API Route: Sage AI Sessions
 * GET /api/admin/sage-ai/sessions - List user's sessions
 * POST /api/admin/sage-ai/sessions - Create or update a session
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  parts?: unknown[];
}

export async function GET() {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', authResult.session.user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[sage-ai/sessions] List error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(request: Request) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: { id?: string; messages: SessionMessage[]; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
  }

  const userId = authResult.session.user.id;
  const title = body.title || generateSessionTitle(body.messages);

  if (body.id) {
    const { data: existing } = await authResult.supabase
      .from('sage_ai_sessions')
      .select('id')
      .eq('id', body.id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      const { error } = await authResult.supabase
        .from('sage_ai_sessions')
        .update({
          messages: body.messages,
          title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .eq('user_id', userId);

      if (error) {
        console.error('[sage-ai/sessions] Update error:', error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
      }

      return NextResponse.json({ id: body.id, title });
    }
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_sessions')
    .insert({
      user_id: userId,
      messages: body.messages,
      title,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[sage-ai/sessions] Insert error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, title });
}

function generateSessionTitle(messages: SessionMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return 'New conversation';

  const content =
    firstUserMessage.content ||
    (firstUserMessage.parts?.find((p): p is { type: 'text'; text: string } =>
      typeof p === 'object' && p !== null && 'type' in p && (p as { type: string }).type === 'text'
    )?.text ?? '');

  if (!content) return 'New conversation';

  const truncated = content.slice(0, 60);
  return truncated.length < content.length ? `${truncated}...` : truncated;
}
