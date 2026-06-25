/**
 * Cron: mirror Job Numbers Google Sheet rows into Supabase (`project_pipeline_jobs`).
 *
 * Schedule in vercel.json: hourly at :30 UTC (`30 * * * *`).
 *
 * Requires:
 * - GOOGLE_SERVICE_ACCOUNT_* (OAuth-only cannot run server-side)
 * - SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 * - Migration: scripts/migrations/create-project-pipeline-jobs-2026-06-23.sql
 *
 * Auth: `authorizeVercelCronRequest` (CRON_SECRET / Vercel cron headers).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import { syncAllProjectPipelineSheetsToSupabase } from '@/lib/project-pipeline/sync-to-supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  try {
    const supabase = createServerClient();
    const result = await syncAllProjectPipelineSheetsToSupabase(supabase);

    return NextResponse.json({
      ok: true,
      ...result,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/sync-project-pipeline]', message);
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
