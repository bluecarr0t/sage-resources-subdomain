/**
 * API Route: Sage AI Feedback
 *
 * POST /api/admin/sage-ai/feedback
 *   Upsert a thumbs up (+1) / down (-1) vote on an assistant message in a
 *   given session. A rating of 0 clears the vote.
 *
 * GET /api/admin/sage-ai/feedback?sessionId=<uuid>
 *   List the current user's feedback rows for a session (used by the client
 *   to restore button state after reload).
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

type FeedbackBody = {
  sessionId?: string;
  messageId?: string;
  rating?: number;
  comment?: string;
  model?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, messageId } = body;
  const rating = body.rating;
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1_000) : null;
  const model = typeof body.model === 'string' ? body.model.slice(0, 200) : null;

  if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
  }
  if (typeof messageId !== 'string' || messageId.length === 0 || messageId.length > 256) {
    return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
  }
  if (typeof rating !== 'number' || ![-1, 0, 1].includes(rating)) {
    return NextResponse.json({ error: 'Rating must be -1, 0, or 1' }, { status: 400 });
  }

  const userId = authResult.session.user.id;

  // Verify the session actually belongs to the calling user before recording
  // (or clearing) any feedback. Without this check, an authenticated admin
  // could attach votes to other users' sessions by guessing/leaking the
  // session UUID, polluting the per-session quality signal.
  const { data: ownedSession, error: ownerErr } = await authResult.supabase
    .from('sage_ai_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ownerErr) {
    console.error('[sage-ai/feedback] session lookup error:', ownerErr);
    return NextResponse.json({ error: 'Failed to verify session ownership' }, { status: 500 });
  }
  if (!ownedSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (rating === 0) {
    const { error } = await authResult.supabase
      .from('sage_ai_feedback')
      .delete()
      .match({ session_id: sessionId, message_id: messageId, user_id: userId });

    if (error) {
      console.error('[sage-ai/feedback] delete error:', error);
      return NextResponse.json({ error: 'Failed to clear feedback' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, rating: 0 });
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_feedback')
    .upsert(
      {
        session_id: sessionId,
        message_id: messageId,
        user_id: userId,
        rating,
        comment,
        model,
      },
      { onConflict: 'session_id,message_id,user_id' }
    )
    .select('id, rating, comment, created_at, updated_at')
    .single();

  if (error) {
    console.error('[sage-ai/feedback] upsert error:', error);
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, feedback: data });
}

export async function GET(request: Request) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
  }

  const { data, error } = await authResult.supabase
    .from('sage_ai_feedback')
    .select('message_id, rating, comment, updated_at')
    .eq('session_id', sessionId)
    .eq('user_id', authResult.session.user.id);

  if (error) {
    console.error('[sage-ai/feedback] list error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }

  return NextResponse.json({ feedback: data ?? [] });
}
