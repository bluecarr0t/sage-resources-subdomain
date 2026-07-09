import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { exportOtaPropertyMonthlyByRadius } from '@/lib/ota-monthly-radius-export';
import { otaMonthlyExportParamsSchema } from '@/lib/sage-ai/ota-monthly-export-params';
import { limit as redisLimit } from '@/lib/upstash';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Hard cap on rows returned in a single export. Radius exports can fan out to
 * tens of thousands of monthly rows; without a cap a wide radius + many years
 * ships an unbounded JSON payload (memory + bandwidth). The response flags
 * truncation so the UI can prompt the user to narrow the search.
 */
const MAX_EXPORT_ROWS = Number(process.env.SAGE_AI_OTA_EXPORT_MAX_ROWS ?? 50_000);

/** These expensive warehouse queries are limited more tightly than chat. */
const EXPORT_RATE_LIMIT = Number(process.env.SAGE_AI_OTA_EXPORT_RATE_LIMIT ?? 10);
const EXPORT_RATE_WINDOW = (process.env.SAGE_AI_OTA_EXPORT_RATE_WINDOW ?? '5 m') as `${number} ${'s' | 'm' | 'h' | 'd'}`;

function capSheet(rows: Array<Record<string, string>>): Array<Record<string, string>> {
  return rows.length > MAX_EXPORT_ROWS ? rows.slice(0, MAX_EXPORT_ROWS) : rows;
}

/** POST full OTA monthly export rows for CSV/Excel download (not sent to the LLM). */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const rl = await redisLimit(
    'ota_export',
    authResult.session.user.id,
    EXPORT_RATE_LIMIT,
    EXPORT_RATE_WINDOW
  );
  if (!rl.success) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too many exports. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset': String(rl.reset),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = otaMonthlyExportParamsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid export parameters' },
      { status: 400 },
    );
  }

  const { zip, city, state, radius_miles, years, sources } = parsed.data;

  try {
    const result = await exportOtaPropertyMonthlyByRadius({
      zip,
      city,
      state,
      radiusMiles: radius_miles,
      years,
      sources,
    });

    const truncated = result.total_row_count > MAX_EXPORT_ROWS;

    return NextResponse.json({
      location_label: result.location_label,
      zip: result.zip,
      city: result.city,
      state: result.state,
      radius_miles: result.radius_miles,
      years: result.years,
      sources: result.sources,
      total_row_count: result.total_row_count,
      truncated,
      max_rows: MAX_EXPORT_ROWS,
      data: capSheet(result.data),
      export_sheets: result.export_sheets.map((sheet) => ({
        name: sheet.name,
        data: capSheet(sheet.data),
      })),
    });
  } catch (err) {
    // Log the full error server-side; return a generic message so warehouse
    // hostnames / query internals never reach the client.
    console.error('[sage-ai/ota-monthly-export] export failed', err);
    return NextResponse.json(
      { error: 'Failed to export OTA monthly property rates.' },
      { status: 500 },
    );
  }
}
