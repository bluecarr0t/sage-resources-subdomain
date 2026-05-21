import { NextResponse } from 'next/server';
import { buildSeoInstrumentationReport } from '@/lib/seo-instrumentation';

export const dynamic = 'force-dynamic';

/**
 * Read-only SEO instrumentation health (Phase 0).
 * Does not expose env secret values.
 */
export async function GET() {
  try {
    const report = await buildSeoInstrumentationReport();
    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('[seo/instrumentation]', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Instrumentation check failed',
      },
      { status: 500 }
    );
  }
}
