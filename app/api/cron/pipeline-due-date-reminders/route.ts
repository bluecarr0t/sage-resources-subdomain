/**
 * Cron: send due-date reminder emails (upcoming, due today, overdue cadence).
 *
 * Schedule in vercel.json: daily at 13:00 UTC (~8:00 AM US Eastern).
 *
 * Requires:
 * - PIPELINE_DUE_DATE_REMINDERS_ENABLED=true (off by default)
 * - PIPELINE_EMAIL_ENABLED=true and RESEND_API_KEY
 * - Migration: scripts/migrations/add-project-pipeline-due-reminder-sent-2026-06-26.sql
 *
 * Auth: authorizeVercelCronRequest (CRON_SECRET / Vercel cron headers).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import { runPipelineDueDateReminders } from '@/lib/project-pipeline/due-date-reminders/run-reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  try {
    const supabase = createServerClient();
    const result = await runPipelineDueDateReminders(supabase);

    return NextResponse.json({
      ok: true,
      ...result,
      elapsedMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/pipeline-due-date-reminders]', message);
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
