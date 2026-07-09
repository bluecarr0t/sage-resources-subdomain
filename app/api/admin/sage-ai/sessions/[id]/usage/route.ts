import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import {
  SAGE_AI_FEATURE,
  SAGE_AI_USAGE_FETCH_LIMIT,
  SAGE_AI_USAGE_SELECT,
  summarizeSageAiSessionUsage,
} from '@/lib/sage-ai/session-usage';
import { isValidSageUuid } from '@/lib/sage-ai/route-schemas';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id: sessionId } = await params;
  if (!isValidSageUuid(sessionId)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }

  const { data: session, error: sessionError } = await authResult.supabase
    .from('sage_ai_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', authResult.session.user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Filter by session in the DB (via the request_meta JSON path) instead of
  // pulling the user's last N global events and filtering in memory — the old
  // approach under-counted threads once a user had >500 lifetime turns.
  const { data: rows, error } = await authResult.supabase
    .from('admin_ai_usage_events' as never)
    .select(SAGE_AI_USAGE_SELECT)
    .eq('feature', SAGE_AI_FEATURE)
    .eq('user_id', authResult.session.user.id)
    .eq('request_meta->>session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(SAGE_AI_USAGE_FETCH_LIMIT);

  if (error) {
    console.error('[sage-ai/sessions/usage] fetch error:', error);
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 });
  }

  const summary = summarizeSageAiSessionUsage(
    (rows ?? []) as Array<{
      model: string | null;
      input_tokens: number | null;
      output_tokens: number | null;
      total_tokens: number | null;
      created_at: string;
      request_meta: Record<string, unknown> | null;
    }>,
    sessionId
  );

  return NextResponse.json(summary);
}
