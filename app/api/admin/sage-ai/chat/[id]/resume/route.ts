/**
 * API Route: Sage AI Chat Stream Resume
 * GET /api/admin/sage-ai/chat/[id]/resume
 *
 * Used by the AI SDK `useChat` client when reconnecting to an interrupted
 * stream. We track an "active stream" marker in Redis under
 * `sage_ai:stream:{chatId}`:
 *
 *   - If the marker exists AND belongs to the caller, return 200 with a
 *     short message indicating the stream is still in flight. A future
 *     iteration can replay cached chunks here once we wire up
 *     `createResumableStream` / equivalent persistence.
 *   - Otherwise return 204 No Content so the client treats it as "nothing to
 *     resume" and falls back to the normal load path.
 *
 * This endpoint is intentionally idempotent and cheap so the client can poll
 * it on mount without worry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { getRedis } from '@/lib/upstash';

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
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return new NextResponse(null, { status: 204 });
  }

  let raw: string | null = null;
  try {
    raw = await redis.get<string>(`sage_ai:stream:${id}`);
  } catch (err) {
    console.warn('[sage-ai/chat/resume] redis.get failed', err);
    return new NextResponse(null, { status: 204 });
  }

  if (!raw) {
    return new NextResponse(null, { status: 204 });
  }

  let marker: { userId?: string; correlationId?: string; startedAt?: number } = {};
  try {
    marker = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof marker);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // Require an explicit owner on the marker. Older markers without `userId`
  // would otherwise let any authenticated admin claim resume rights for any
  // active stream id, leaking partial responses across users. Markers are
  // always written with a userId by the chat route below; missing field means
  // either a corrupt entry or a forged key, so we treat both as "no resume".
  if (!marker.userId || marker.userId !== authResult.session.user.id) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(
    {
      resumable: true,
      correlationId: marker.correlationId ?? null,
      startedAt: marker.startedAt ?? null,
    },
    { status: 200 }
  );
}
