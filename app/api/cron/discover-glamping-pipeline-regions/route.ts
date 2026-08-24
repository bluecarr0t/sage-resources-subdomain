/**
 * Cron: rotate 5 pending US/Canada regions through the state-scoped pipeline.
 *
 * Schedule: Weekly Tuesdays 18:00 UTC — see vercel.json (`0 18 * * 2`).
 *
 * Query params:
 *   ?limit=N     — Tavily max results per query (default 5, max 10)
 *   ?count=N     — how many pending regions to process (default 5, max 8)
 *   ?force=1     — bypass processed-URLs dedup
 *   ?dryRun=1    — extract only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import { listPendingRegionsForRotation } from '@/lib/glamping-pipeline/state-coverage';
import { runRegionPipelineSync } from '@/lib/glamping-pipeline/run-region-sync';
import { regionsAtPriority } from '@/lib/glamping-pipeline/regions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const DEFAULT_COUNT = 5;
const MAX_COUNT = 8;

function parsePositive(raw: string | null, fallback: number, max: number): number {
  const n = raw ? parseInt(raw, 10) : fallback;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitPerQuery = parsePositive(url.searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const count = parsePositive(url.searchParams.get('count'), DEFAULT_COUNT, MAX_COUNT);
  const force = url.searchParams.get('force') === '1';
  const dryRun = url.searchParams.get('dryRun') === '1';

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
    console.error('[cron/discover-glamping-pipeline-regions]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey! });

  let regions = await listPendingRegionsForRotation(supabase, count);
  if (regions.length === 0) {
    regions = regionsAtPriority('United States', 0).slice(0, count);
  }

  const results = [];
  let failed = 0;
  for (const region of regions) {
    const { metrics, error } = await runRegionPipelineSync(supabase, openai, tavilyKey!, {
      country: region.country,
      regionCode: region.code,
      dryRun,
      force,
      limitPerQuery,
    });
    results.push({
      region: { code: region.code, country: region.country, name: region.name },
      metrics,
      error,
    });
    if (error) failed += 1;
  }

  return NextResponse.json(
    {
      success: failed === 0,
      message: `Processed ${results.length} region(s); ${failed} failed`,
      results,
    },
    { status: failed === 0 ? 200 : 500 }
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return run(request);
}
