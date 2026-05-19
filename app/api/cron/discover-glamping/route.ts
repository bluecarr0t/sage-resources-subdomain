/**
 * Cron endpoint for the glamping discovery pipeline.
 *
 * Runs the discovery library directly inside the Vercel Function (Fluid Compute)
 * instead of shelling out to `npx tsx scripts/...`. The previous spawn-based
 * implementation never worked from production cron because `npx`/`tsx` are not
 * available at runtime in serverless functions, which is why
 * `glamping_discovery_runs` was only ever populated by manual triggers.
 *
 * Schedule: Weekly Mondays 15:00 UTC — see vercel.json (`0 15 * * 1`).
 * Each run processes Tavily search results and Google News RSS feeds.
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
 *   ?limit=N        — Tavily max results per query (default 1)
 *   ?rssLimit=N     — max RSS article URLs to consider (default 10)
 *   ?force=1        — bypass the processed-URLs dedup table for that run
 *   ?canada=1       — use Canada Tavily query set; default country Canada on insert
 *   ?tavilyOnly=1   — skip RSS
 *   ?rssOnly=1      — skip Tavily (no TAVILY_API_KEY required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import {
  fetchArticleContent,
  getDatabasePropertyNames,
  getRssArticleTasks,
  processDiscoveryArticle,
  searchGlampingNews,
} from '@/lib/glamping-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RUNS_TABLE = 'glamping_discovery_runs';
const PROCESSED_URLS_TABLE = 'glamping_discovery_processed_urls';
const DEFAULT_TAVILY_LIMIT = 1;
const DEFAULT_RSS_LIMIT = 10;
const MAX_TAVILY_LIMIT = 10;
const MAX_RSS_LIMIT = 50;

type DiscoveryMode = 'tavily' | 'rss';

interface CronMetrics {
  mode: DiscoveryMode;
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

interface ArticleTask {
  content: string;
  url: string;
  discoverySource: string;
}

function emptyMetrics(mode: DiscoveryMode): CronMetrics {
  return {
    mode,
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

function parsePositiveLimit(
  raw: string | null,
  defaultValue: number,
  max: number
): number {
  const n = raw ? parseInt(raw, 10) : defaultValue;
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return Math.min(n, max);
}

async function processArticleTasks(
  supabase: SupabaseClient,
  openai: OpenAI,
  articleTasks: ArticleTask[],
  metrics: CronMetrics,
  insertDefaults?: { defaultCountry: 'Canada' }
): Promise<void> {
  if (articleTasks.length === 0) return;

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

async function runTavilyPass(
  supabase: SupabaseClient,
  openai: OpenAI,
  tavilyKey: string,
  processed: Set<string>,
  limit: number,
  canada: boolean,
  metrics: CronMetrics
): Promise<string | null> {
  try {
    const tavilyResults = await searchGlampingNews(
      tavilyKey,
      limit,
      canada ? 'canada' : 'default'
    );
    metrics.articlesFound = tavilyResults.length;

    const toProcess = tavilyResults.filter((r) => !processed.has(r.url));
    const articleTasks: ArticleTask[] = [];

    for (const { url: articleUrl } of toProcess) {
      try {
        const content = await fetchArticleContent(articleUrl, {});
        articleTasks.push({
          content,
          url: articleUrl,
          discoverySource: canada ? 'Tavily Search (Canada)' : 'Tavily Search',
        });
        metrics.articlesFetched++;
        processed.add(articleUrl);
      } catch (err) {
        metrics.articlesFailed++;
        console.warn(
          `[cron/discover-glamping] Tavily fetch failed for ${articleUrl}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const insertDefaults = canada ? { defaultCountry: 'Canada' as const } : undefined;
    await processArticleTasks(supabase, openai, articleTasks, metrics, insertDefaults);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/discover-glamping] Tavily pass error:', message);
    return message;
  }
}

async function runRssPass(
  supabase: SupabaseClient,
  openai: OpenAI,
  processed: Set<string>,
  rssLimit: number,
  canada: boolean,
  metrics: CronMetrics
): Promise<string | null> {
  try {
    const rssTasks = await getRssArticleTasks(rssLimit);
    metrics.articlesFound = rssTasks.length;

    const toProcess = rssTasks.filter((r) => !processed.has(r.url));
    const articleTasks: ArticleTask[] = [];

    for (const { url: articleUrl, discoverySource, rssFallbackText } of toProcess) {
      try {
        const content = await fetchArticleContent(articleUrl, {
          ...(rssFallbackText ? { rssFallbackText } : {}),
        });
        const sourceLabel = canada ? `${discoverySource} (Canada)` : discoverySource;
        articleTasks.push({
          content,
          url: articleUrl,
          discoverySource: sourceLabel,
        });
        metrics.articlesFetched++;
        processed.add(articleUrl);
      } catch (err) {
        metrics.articlesFailed++;
        console.warn(
          `[cron/discover-glamping] RSS fetch failed for ${articleUrl}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const insertDefaults = canada ? { defaultCountry: 'Canada' as const } : undefined;
    await processArticleTasks(supabase, openai, articleTasks, metrics, insertDefaults);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/discover-glamping] RSS pass error:', message);
    return message;
  }
}

async function runDiscovery(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const tavilyOnly = url.searchParams.get('tavilyOnly') === '1';
  const rssOnly = url.searchParams.get('rssOnly') === '1';
  const runTavily = !rssOnly;
  const runRss = !tavilyOnly;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!secretKey) missing.push('SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY');
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');
  if (runTavily && !tavilyKey) missing.push('TAVILY_API_KEY');
  if (missing.length > 0) {
    const message = `Missing required env vars: ${missing.join(', ')}`;
    console.error('[cron/discover-glamping]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey! });

  const tavilyLimit = parsePositiveLimit(
    url.searchParams.get('limit'),
    DEFAULT_TAVILY_LIMIT,
    MAX_TAVILY_LIMIT
  );
  const rssLimit = parsePositiveLimit(
    url.searchParams.get('rssLimit'),
    DEFAULT_RSS_LIMIT,
    MAX_RSS_LIMIT
  );
  const force = url.searchParams.get('force') === '1';
  const canada = url.searchParams.get('canada') === '1';

  const tavilyMetrics = emptyMetrics('tavily');
  const rssMetrics = emptyMetrics('rss');
  const passErrors: string[] = [];

  const processed = force ? new Set<string>() : await getProcessedUrls(supabase);
  tavilyMetrics.processedUrlsCount = processed.size;
  rssMetrics.processedUrlsCount = processed.size;

  if (runTavily) {
    const tavilyError = await runTavilyPass(
      supabase,
      openai,
      tavilyKey!,
      processed,
      tavilyLimit,
      canada,
      tavilyMetrics
    );
    tavilyMetrics.completedAt = new Date().toISOString();
    await persistRunMetrics(supabase, tavilyMetrics, tavilyError);
    if (tavilyError) passErrors.push(`tavily: ${tavilyError}`);
  }

  if (runRss) {
    const rssError = await runRssPass(
      supabase,
      openai,
      processed,
      rssLimit,
      canada,
      rssMetrics
    );
    rssMetrics.completedAt = new Date().toISOString();
    await persistRunMetrics(supabase, rssMetrics, rssError);
    if (rssError) passErrors.push(`rss: ${rssError}`);
  }

  const modesRun = [runTavily && 'Tavily', runRss && 'RSS'].filter(Boolean).join(' + ');
  const responseMetrics = {
    ...(runTavily ? { tavily: tavilyMetrics } : {}),
    ...(runRss ? { rss: rssMetrics } : {}),
  };

  if (passErrors.length > 0 && (runTavily && runRss ? passErrors.length === 2 : true)) {
    return NextResponse.json(
      {
        success: false,
        error: passErrors.join('; '),
        metrics: responseMetrics,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Discovery run complete (${modesRun}, Tavily limit ${tavilyLimit}, RSS limit ${rssLimit}${force ? ', force' : ''})`,
    metrics: responseMetrics,
    ...(passErrors.length > 0 ? { warnings: passErrors } : {}),
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
