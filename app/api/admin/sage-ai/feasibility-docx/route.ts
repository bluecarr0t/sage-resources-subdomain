/**
 * API Route: Sage AI - Download a feasibility section as .docx
 * POST /api/admin/sage-ai/feasibility-docx
 *
 * The Sage AI chat's `generate_feasibility_section` tool returns a structured
 * `FeasibilityDocxPayload`. The client renders a preview inline and POSTs the
 * same payload here when the user clicks "Download .docx". This route:
 *
 *   - Re-validates the payload with the canonical zod schema (defense in
 *     depth: never trust the client to have kept the shape intact).
 *   - Picks the rv vs glamping template based on `market_type`.
 *   - Emits a Word document that uses the template's branding and applies
 *     the strict Sage writing-style guide to every block (Calibri 11pt, 1.15
 *     line spacing, justified, bold headings, #E2EFDA table-header fill,
 *     numbered lists with bold lead-ins, no random bolding, no `~`, no
 *     en/em dashes, no inline citations).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { feasibilityDocxPayloadSchema } from '@/lib/sage-ai/feasibility-docx-payload';
import {
  assembleFeasibilitySectionDocx,
  feasibilitySectionFilename,
} from '@/lib/sage-ai/feasibility-docx-builder';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BODY_BYTES = 200_000;

const requestSchema = z.object({
  payload: feasibilityDocxPayloadSchema,
  /**
   * 'rv' | 'glamping' | 'rv_glamping'. Defaults to 'rv' when omitted; the
   * builder normalises unknown values to 'rv' too.
   */
  market_type: z.string().min(2).max(40).optional().nullable(),
});

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: 'Payload too large' },
      { status: 413 }
    );
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Payload failed schema validation',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { payload, market_type } = parsed.data;

  let buffer: Buffer;
  try {
    buffer = await assembleFeasibilitySectionDocx(payload, { marketType: market_type });
  } catch (err) {
    console.error('[sage-ai/feasibility-docx] build failed', err);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to build .docx: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }

  const filename = feasibilitySectionFilename(payload);

  console.log('[sage-ai/feasibility-docx] section downloaded', {
    user_id: auth.session.user.id,
    user_email: auth.session.user.email ?? null,
    market_type: market_type ?? null,
    block_count: payload.blocks.length,
    title: payload.title,
    filename,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'no-store',
    },
  });
});
