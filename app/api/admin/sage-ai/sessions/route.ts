/**
 * API Route: Sage AI Sessions
 * GET /api/admin/sage-ai/sessions - List user's sessions
 * POST /api/admin/sage-ai/sessions - Create or update a session
 *
 * Messages are persisted in the `sage_ai_messages` child table (one row per
 * turn). The legacy `sage_ai_sessions.messages` JSONB column is removed by
 * `sage-ai-drop-legacy-messages.sql`; sessions now only track metadata.
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

interface SessionMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
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

/** Hard cap on persisted messages. Matches the 800k default body limit and prevents
 *  a runaway client from filling sage_ai_messages with unbounded payloads. */
const MAX_MESSAGES_PER_SESSION = 200;
const MAX_TITLE_LENGTH = 200;

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
  if (body.messages.length > MAX_MESSAGES_PER_SESSION) {
    return NextResponse.json(
      {
        error: `messages exceeds limit of ${MAX_MESSAGES_PER_SESSION}`,
      },
      { status: 413 }
    );
  }
  if (body.title != null && (typeof body.title !== 'string' || body.title.length > MAX_TITLE_LENGTH)) {
    return NextResponse.json({ error: 'title must be a string up to 200 chars' }, { status: 400 });
  }

  const userId = authResult.session.user.id;
  const title = (body.title || generateSessionTitle(body.messages)).slice(0, MAX_TITLE_LENGTH);

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
          title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .eq('user_id', userId);

      if (error) {
        console.error('[sage-ai/sessions] Update error:', error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
      }

      try {
        await syncMessages(authResult.supabase, body.id, userId, body.messages);
      } catch (err) {
        console.error('[sage-ai/sessions] sync error during update:', err);
        return NextResponse.json(
          { error: 'Failed to persist messages' },
          { status: 500 }
        );
      }

      return NextResponse.json({ id: body.id, title });
    }
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_sessions')
    .insert({
      user_id: userId,
      title,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[sage-ai/sessions] Insert error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  try {
    await syncMessages(authResult.supabase, data.id, userId, body.messages);
  } catch (err) {
    console.error('[sage-ai/sessions] sync error during insert:', err);
    return NextResponse.json(
      { error: 'Failed to persist messages' },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, title });
}

/**
 * Diff-upsert messages into the sage_ai_messages child table. Rows with
 * ordinals >= messages.length are deleted so truncations (e.g. edit-and-resend
 * in PR 3) are reflected.
 *
 * Throws on any DB error so the caller surfaces a 500 to the client. Returning
 * silently here previously let the UI believe a save had succeeded when it
 * had not (the next reload would lose the conversation).
 */
async function syncMessages(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string,
  messages: SessionMessage[]
): Promise<void> {
  if (messages.length === 0) {
    const { error } = await supabase
      .from('sage_ai_messages')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);
    if (error) {
      throw new Error(`sage_ai_messages delete failed: ${error.message}`);
    }
    return;
  }

  const rows = messages.map((m, idx) => ({
    session_id: sessionId,
    user_id: userId,
    ordinal: idx,
    role: m.role,
    parts:
      m.parts ?? (m.content ? [{ type: 'text', text: m.content }] : []),
  }));

  const { error: upsertError } = await supabase
    .from('sage_ai_messages')
    .upsert(rows, { onConflict: 'session_id,ordinal' });
  if (upsertError) {
    throw new Error(`sage_ai_messages upsert failed: ${upsertError.message}`);
  }

  const { error: trimError } = await supabase
    .from('sage_ai_messages')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .gte('ordinal', messages.length);
  if (trimError) {
    throw new Error(`sage_ai_messages trim failed: ${trimError.message}`);
  }
}

function generateSessionTitle(messages: SessionMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return SESSION_TITLE_FALLBACK;

  const content =
    firstUserMessage.content ||
    (firstUserMessage.parts?.find((p): p is { type: 'text'; text: string } =>
      typeof p === 'object' && p !== null && 'type' in p && (p as { type: string }).type === 'text'
    )?.text ?? '');

  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) return SESSION_TITLE_FALLBACK;

  const truncated = cleaned.slice(0, 60);
  return truncated.length < cleaned.length ? `${truncated}…` : truncated;
}

/** Keep this aligned with messages/en.json → sageAi.sessionTitleFallback. */
const SESSION_TITLE_FALLBACK = 'New chat';

/**
 * DELETE /api/admin/sage-ai/sessions — remove every Sage AI session for the
 * signed-in admin. Child rows in `sage_ai_messages` and `sage_ai_feedback`
 * cascade on session delete.
 */
export async function DELETE() {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;
  const { error } = await authResult.supabase
    .from('sage_ai_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[sage-ai/sessions] Delete all error:', error);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
