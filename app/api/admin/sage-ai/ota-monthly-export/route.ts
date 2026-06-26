import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { exportOtaPropertyMonthlyByRadius } from '@/lib/ota-monthly-radius-export';
import { otaMonthlyExportParamsSchema } from '@/lib/sage-ai/ota-monthly-export-params';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST full OTA monthly export rows for CSV/Excel download (not sent to the LLM). */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.ok) {
    return authResult.response;
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

    return NextResponse.json({
      location_label: result.location_label,
      zip: result.zip,
      city: result.city,
      state: result.state,
      radius_miles: result.radius_miles,
      years: result.years,
      sources: result.sources,
      total_row_count: result.total_row_count,
      data: result.data,
      export_sheets: result.export_sheets,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to export OTA monthly property rates.',
      },
      { status: 500 },
    );
  }
}
