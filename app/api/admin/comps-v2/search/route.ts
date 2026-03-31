import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import type { AdminAuthContext } from '@/lib/require-admin-auth';
import { executeCompsV2Search } from '@/lib/comps-v2/execute-comps-v2-search';
import type { CompsV2SearchStreamEvent } from '@/lib/comps-v2/search-stream-events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * Discovery can exceed default serverless limits; set to your platform max (e.g. Vercel Pro 300).
 * With `stream: true`, the client receives NDJSON (`meta` correlation id first, then phases, `web_progress`, `result`).
 * `X-Discovery-Correlation-Id` matches `meta` and the JSON `correlationId` field for support logs; a future job store could add GET polling by that id.
 */
export const maxDuration = 300;

export const POST = withAdminAuth(async (request: NextRequest, auth: AdminAuthContext) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const wantsStream = body.stream === true;
    const correlationId = randomUUID();

    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (ev: CompsV2SearchStreamEvent) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
          };
          try {
            send({ type: 'meta', correlationId });
            const out = await executeCompsV2Search(body, auth, send, { correlationId });
            if (out.ok) {
              send({ type: 'result', success: true, ...out.payload });
            } else {
              send({ type: 'error', success: false, message: out.message, status: out.status });
            }
          } catch (e) {
            send({
              type: 'error',
              success: false,
              message: e instanceof Error ? e.message : 'Search failed',
              status: 500,
            });
          } finally {
            controller.close();
          }
        },
      });
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Discovery-Correlation-Id': correlationId,
        },
      });
    }

    const out = await executeCompsV2Search(body, auth, undefined, { correlationId });
    if (!out.ok) {
      return NextResponse.json({ success: false, message: out.message }, { status: out.status });
    }
    return NextResponse.json(
      { success: true, ...out.payload },
      { headers: { 'X-Discovery-Correlation-Id': correlationId } }
    );
  } catch (e) {
    console.error('[comps-v2/search]', e);
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Search failed' },
      { status: 500 }
    );
  }
});
