/**
 * Cron endpoint for the glamping discovery pipeline.
 *
 * Runs the discovery library directly inside the Vercel Function (Fluid Compute)
 * instead of shelling out to `npx tsx scripts/...`. The previous spawn-based
 * implementation never worked from production cron because `npx`/`tsx` are not
 * available at runtime in serverless functions, which is why
 * `glamping_discovery_runs` was only ever populated by manual triggers.
 *
 * Schedule: Daily at 15:00 UTC — see vercel.json (`0 15 * * *`).
 * Vercel Cron invokes this route with HTTP GET; POST is supported for manual triggers.
 *
 * Required env vars on Vercel (Production):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *   OPENAI_API_KEY
 *   TAVILY_API_KEY
 * Optional:
 *   CRON_SECRET — when set, require `Authorization: Bearer <CRON_SECRET>` or a
 *   Vercel cron invocation (`x-vercel-cron` / `vercel-cron` user-agent) if the
 *   bearer header is missing.
 *
 * Query params (manual triggers):
 *   ?limit=N      — fetch up to N Tavily results per query (default 1)
 *   ?force=1      — bypass the processed-URLs dedup table for that run
 *   ?canada=1     — use Canada Tavily query set; default country Canada on insert
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import {
  fetchArticleContent,
  getDatabasePropertyNames,
  processDiscoveryArticle,
  searchGlampingNews,
} from '@/lib/glamping-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RUNS_TABLE = 'glamping_discovery_runs';
const PROCESSED_URLS_TABLE = 'glamping_discovery_processed_urls';
const DEFAULT_TAVILY_LIMIT = 1;
const MAX_TAVILY_LIMIT = 10;

interface CronMetrics {
  mode: 'tavily';
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  articlesFound: number;
  articlesFetched: number;
  articlesFailed: number;
  propertiesExtracted: number;
  propertiesNew: number;
  propertiesInserted: number;
  processedUrlsCount: number;
}

function emptyMetrics(): CronMetrics {
  return {
    mode: 'tavily',
    dryRun: false,
    startedAt: new Date().toISOString(),
    completedAt: '',
    articlesFound: 0,
    articlesFetched: 0,
    articlesFailed: 0,
    propertiesExtracted: 0,
    propertiesNew: 0,
    propertiesInserted: 0,
    processedUrlsCount: 0,
  };
}

async function persistRunMetrics(
  sb: SupabaseClient,
  m: CronMetrics,
  error: string | null
): Promise<void> {
  try {
    const { error: insertError } = await sb.from(RUNS_TABLE).insert({
      mode: m.mode,
      dry_run: m.dryRun,
      started_at: m.startedAt,
      completed_at: m.completedAt || new Date().toISOString(),
      articles_found: m.articlesFound,
      articles_fetched: m.articlesFetched,
      articles_failed: m.articlesFailed,
      properties_extracted: m.propertiesExtracted,
      properties_new: m.propertiesNew,
      properties_inserted: m.propertiesInserted,
      processed_urls_count: m.processedUrlsCount,
      error,
    });
    if (insertError && insertError.code !== '42P01') {
      console.warn(
        '[cron/discover-glamping] Could not persist run metrics:',
        insertError.message
      );
    }
  } catch (err) {
    console.warn(
      '[cron/discover-glamping] persistRunMetrics threw:',
      err instanceof Error ? err.message : err
    );
  }
}

async function getProcessedUrls(sb: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await sb.from(PROCESSED_URLS_TABLE).select('url');
  if (error) {
    if (error.code !== '42P01') {
      console.warn(
        '[cron/discover-glamping] Could not fetch processed URLs:',
        error.message
      );
    }
    return new Set();
  }
  return new Set((data || []).map((r: { url: string }) => r.url));
}

function parseLimit(raw: string | null): number {
  const n = raw ? parseInt(raw, 10) : DEFAULT_TAVILY_LIMIT;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TAVILY_LIMIT;
  return Math.min(n, MAX_TAVILY_LIMIT);
}

async function runDiscovery(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    console.error('[cron/discover-glamping]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey! });

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));
  const force = url.searchParams.get('force') === '1';
  const canada = url.searchParams.get('canada') === '1';
  const insertDefaults = canada ? { defaultCountry: 'Canada' as const } : undefined;

  const metrics = emptyMetrics();
  let runError: string | null = null;

  try {
    const tavilyResults = await searchGlampingNews(
      tavilyKey!,
      limit,
      canada ? 'canada' : 'default'
    );
    metrics.articlesFound = tavilyResults.length;

    const processed = force ? new Set<string>() : await getProcessedUrls(supabase);
    metrics.processedUrlsCount = processed.size;

    const toProcess = tavilyResults.filter((r) => !processed.has(r.url));

    const articleTasks: {
      content: string;
      url: string;
      discoverySource: 'Tavily Search' | 'Tavily Search (Canada)';
    }[] = [];
    for (const { url: articleUrl } of toProcess) {
      try {
        const content = await fetchArticleContent(articleUrl, {});
        articleTasks.push({
          content,
          url: articleUrl,
          discoverySource: canada ? 'Tavily Search (Canada)' : 'Tavily Search',
        });
        metrics.articlesFetched++;
      } catch (err) {
        metrics.articlesFailed++;
        console.warn(
          `[cron/discover-glamping] fetch failed for ${articleUrl}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    if (articleTasks.length > 0) {
      const dbProperties = await getDatabasePropertyNames(supabase);
      for (const { content, url: articleUrl, discoverySource } of articleTasks) {
        const result = await processDiscoveryArticle({
          content,
          articleUrl,
          discoverySource,
          dryRun: false,
          openai,
          supabase,
          dbPropertyNames: dbProperties,
          insertDefaults,
        });
        metrics.propertiesExtracted += result.propertiesExtracted;
        metrics.propertiesNew += result.propertiesNew;
        metrics.propertiesInserted += result.propertiesInserted;
      }
    }
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
    console.error('[cron/discover-glamping] error:', runError);
  } finally {
    metrics.completedAt = new Date().toISOString();
    await persistRunMetrics(supabase, metrics, runError);
  }

  if (runError) {
    return NextResponse.json(
      { success: false, error: runError, metrics },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Discovery run complete (Tavily, limit ${limit}${force ? ', force' : ''})`,
    metrics,
  });
}

/** Vercel Cron uses GET */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return runDiscovery(request);
}

/** Manual / integration triggers */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return runDiscovery(request);
}
