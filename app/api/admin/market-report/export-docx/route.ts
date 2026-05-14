import { NextRequest, NextResponse } from 'next/server';
import {
  asMarketReportMapPins,
  asMarketReportMeta,
  asMarketReportSections,
  marketReportExportBodySchema,
} from '@/lib/market-report/export-market-report-body-schema';
import { assembleMarketReportDocx, marketReportDocxFilename } from '@/lib/market-report/export-market-report-docx';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 2_500_000;

export const POST = withAdminAuth(async (request: NextRequest, _auth) => {
  const userId = _auth.session.user.id;
  const rlKey = `market-report-export:${userId}:${getRateLimitKey(request)}`;
  const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED', message: 'Too many export requests.' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, message: 'Payload too large' }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, message: 'Payload too large' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = marketReportExportBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Invalid export payload', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { meta: metaIn, sections: sectionsIn, mapPins: pinsIn } = parsed.data;
  const meta = asMarketReportMeta(metaIn);
  const sections = asMarketReportSections(sectionsIn);
  const mapPins = asMarketReportMapPins(pinsIn);

  let buffer: Buffer;
  try {
    buffer = assembleMarketReportDocx(meta, sections, mapPins);
  } catch (err) {
    console.error('[market-report/export-docx]', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }

  const filename = marketReportDocxFilename(meta);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
