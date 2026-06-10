/**
 * Cron: flip Under Construction properties to Open when `planned_open_date` is due.
 *
 * Schedule in vercel.json: daily 08:00 UTC (`0 8 * * *`).
 *
 * Auth: `authorizeVercelCronRequest` (CRON_SECRET / Vercel cron headers).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import { flipDuePlannedOpenProperties } from '@/lib/glamping-planned-open';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  try {
    const supabase = createServerClient();
    const result = await flipDuePlannedOpenProperties(supabase);

    return NextResponse.json({
      ok: true,
      ...result,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/flip-planned-open-properties]', message);
    return NextResponse.json(
      { ok: false, error: message, elapsedMs: Date.now() - started },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
