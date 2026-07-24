/**
 * Weekly cron: outdoor hospitality contact research → public.contacts
 *
 * Schedule: Tuesdays 17:00 UTC — see vercel.json (`0 17 * * 2`).
 * Runs the shared `runContactResearch` library inside the Vercel Function
 * (Fluid Compute). Does not shell out to tsx.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *   OPENAI_API_KEY
 *   TAVILY_API_KEY
 * Optional:
 *   CRON_SECRET
 *   CONTACT_RESEARCH_CRON_LIMIT (default 12)
 *
 * Query params (manual):
 *   ?limit=N
 *   ?seed=inventory|web|all
 *   ?dryRun=1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import { runContactResearch, type SeedMode } from '@/lib/contact-research';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 25;

function parseSeedMode(raw: string | null): SeedMode {
  const value = (raw ?? 'all').toLowerCase();
  if (value === 'inventory' || value === 'web' || value === 'all') return value;
  return 'all';
}

function parseLimit(raw: string | null): number {
  const fromEnv = Number.parseInt(process.env.CONTACT_RESEARCH_CRON_LIMIT ?? '', 10);
  const fallback = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_LIMIT;
  if (!raw) return Math.min(fallback, MAX_LIMIT);
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return Math.min(fallback, MAX_LIMIT);
  return Math.min(n, MAX_LIMIT);
}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY?.trim() || null;

  if (!supabaseUrl || !secretKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }
  if (!openaiApiKey) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get('limit'));
  const mode = parseSeedMode(searchParams.get('seed'));
  const dryRun = searchParams.get('dryRun') === '1';

  // Rotate inventory offset by ISO week so cron advances through inventory over time.
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const inventoryOffset = (week * limit) % 2000;

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const startedAt = new Date().toISOString();
  const logs: string[] = [];

  try {
    const result = await runContactResearch({
      supabase,
      openai,
      tavilyApiKey,
      mode,
      limit,
      inventoryOffset,
      dryRun,
      onProgress: (message) => {
        logs.push(message);
        console.log(`[research-contacts] ${message}`);
      },
    });

    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      mode,
      limit,
      inventoryOffset,
      dryRun,
      ...result,
      logTail: logs.slice(-40),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[research-contacts] failed:', message);
    return NextResponse.json(
      {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        error: message,
        logTail: logs.slice(-40),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
