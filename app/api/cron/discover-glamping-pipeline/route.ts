/**
 * Cron endpoint for the weekly USA outdoor-hospitality pipeline sync (combined run).
 *
 * Segments: glamping resorts + RV parks / resorts / RV-primary campgrounds.
 * Discovers new Proposed Development / Under Construction rows and applies
 * high-confidence status changes (including Cancelled). Records dated `is_open`
 * stints in `glamping_pipeline_status_history`.
 *
 * Schedule: Weekly Mondays 16:00 UTC — see vercel.json (`0 16 * * 1`).
 * Runs one hour after general glamping discovery.
 *
 * Query params (manual triggers):
 *   ?limit=N     — Tavily max results per query (default 5, max 10)
 *   ?force=1     — bypass processed-URLs dedup for that run
 *   ?dryRun=1    — extract and match only; no inserts or status writes
 *   ?state=TX    — run a single-state (or province) sweep instead of national
 *   ?country=Canada — used with ?state= (default United States)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import { runWeeklyPipelineSync } from '@/lib/glamping-pipeline';
import { parsePipelineCountry } from '@/lib/glamping-pipeline/regions';
import { runRegionPipelineSync } from '@/lib/glamping-pipeline/run-region-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

function parseLimit(raw: string | null): number {
  const n = raw ? parseInt(raw, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitPerQuery = parseLimit(url.searchParams.get('limit'));
  const force = url.searchParams.get('force') === '1';
  const dryRun = url.searchParams.get('dryRun') === '1';
  const state = url.searchParams.get('state')?.trim().toUpperCase() || null;
  const country = parsePipelineCountry(url.searchParams.get('country')) ?? 'United States';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!secretKey) missing.push('SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY');
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');
  if (!tavilyKey) missing.push('TAVILY_API_KEY');
  if (missing.length > 0) {
    const message = `Missing required env vars: ${missing.join(', ')}`;
    console.error('[cron/discover-glamping-pipeline]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey! });

  if (state) {
    const { metrics, error, region } = await runRegionPipelineSync(
      supabase,
      openai,
      tavilyKey!,
      { country, regionCode: state, dryRun, force, limitPerQuery }
    );
    if (error) {
      return NextResponse.json(
        { success: false, error, metrics, region },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: `Pipeline region sync complete for ${region?.code ?? state}${dryRun ? ' (dry run)' : ''}`,
      metrics,
      region,
    });
  }

  const { metrics, error } = await runWeeklyPipelineSync(
    supabase,
    openai,
    tavilyKey!,
    { dryRun, limitPerQuery, force }
  );

  if (error) {
    return NextResponse.json(
      { success: false, error, metrics },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Pipeline sync complete${dryRun ? ' (dry run)' : ''}${force ? ' (force)' : ''}`,
    metrics,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return run(request);
}
