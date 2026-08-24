import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpenAI } from 'openai';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { fetchArticleContent } from '@/lib/glamping-discovery/fetch-article';
import { getDatabasePropertyNames } from '@/lib/glamping-discovery/deduplicate';
import {
  GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN,
  GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN,
} from '@/lib/glamping-market-snapshot-region';
import {
  searchPipelineAllSegmentsNews,
  searchPipelineCustomNews,
} from './tavily-search';
import { processPipelineArticle } from './process-article';
import type { ProcessPipelineArticleResult } from './process-article';
import {
  isPipelineRvSegmentPropertyType,
  PIPELINE_DISCOVERY_SOURCE,
  PIPELINE_PROCESSED_URLS_TABLE,
  PIPELINE_RUNS_TABLE,
  PIPELINE_RV_DISCOVERY_SOURCE,
  PIPELINE_WATCH_IS_OPEN_VALUES,
  type PipelineCountry,
  type PipelineSegment,
  type PipelineStatusChangeSource,
} from './constants';
import type {
  PipelinePropertyRef,
  PipelineSegmentMetrics,
  PipelineWeeklyRunMetrics,
} from './types';
import { extractedStateMatchesRegion } from './regions';

const DEFAULT_LIMIT_PER_QUERY = 5;
const MAX_LIMIT_PER_QUERY = 10;
const TRACKED_PAGE_SIZE = 1000;

const DEFAULT_SEGMENTS: PipelineSegment[] = ['glamping', 'rv'];

function emptySegmentMetrics(): PipelineSegmentMetrics {
  return {
    propertiesExtracted: 0,
    propertiesNew: 0,
    propertiesInserted: 0,
    statusUpdatesDetected: 0,
    statusUpdatesApplied: 0,
  };
}

function emptyMetrics(dryRun: boolean): PipelineWeeklyRunMetrics {
  return {
    dryRun,
    startedAt: new Date().toISOString(),
    completedAt: '',
    articlesFound: 0,
    articlesFetched: 0,
    articlesFailed: 0,
    propertiesExtracted: 0,
    propertiesNew: 0,
    propertiesInserted: 0,
    statusUpdatesDetected: 0,
    statusUpdatesApplied: 0,
    processedUrlsCount: 0,
    glamping: emptySegmentMetrics(),
    rv: emptySegmentMetrics(),
  };
}

function addSegmentResult(
  segmentMetrics: PipelineSegmentMetrics,
  result: ProcessPipelineArticleResult
): void {
  segmentMetrics.propertiesExtracted += result.propertiesExtracted;
  segmentMetrics.propertiesNew += result.propertiesNew;
  segmentMetrics.propertiesInserted += result.propertiesInserted;
  segmentMetrics.statusUpdatesDetected += result.statusUpdatesDetected;
  segmentMetrics.statusUpdatesApplied += result.statusUpdatesApplied;
}

function rollupTotals(metrics: PipelineWeeklyRunMetrics): void {
  const glamping = metrics.glamping ?? emptySegmentMetrics();
  const rv = metrics.rv ?? emptySegmentMetrics();
  metrics.propertiesExtracted = glamping.propertiesExtracted + rv.propertiesExtracted;
  metrics.propertiesNew = glamping.propertiesNew + rv.propertiesNew;
  metrics.propertiesInserted = glamping.propertiesInserted + rv.propertiesInserted;
  metrics.statusUpdatesDetected =
    glamping.statusUpdatesDetected + rv.statusUpdatesDetected;
  metrics.statusUpdatesApplied =
    glamping.statusUpdatesApplied + rv.statusUpdatesApplied;
}

async function getProcessedUrls(sb: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await sb.from(PIPELINE_PROCESSED_URLS_TABLE).select('url');
  if (error) {
    if (error.code !== '42P01') {
      console.warn('[glamping-pipeline] Could not load processed URLs:', error.message);
    }
    return new Set();
  }
  return new Set((data ?? []).map((r: { url: string }) => r.url));
}

type TrackedRow = PipelinePropertyRef & {
  property_type?: string | null;
  state?: string | null;
};

async function loadTrackedPipelineProperties(
  sb: SupabaseClient,
  segment: PipelineSegment,
  country: PipelineCountry,
  regionCode?: string | null
): Promise<PipelinePropertyRef[]> {
  const countryIn =
    country === 'Canada'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const collected: TrackedRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb
      .from(ALL_SAGE_DATA_TABLE)
      .select('id, slug, property_name, is_open, property_type, state')
      .in('country', countryIn)
      .in('is_open', [...PIPELINE_WATCH_IS_OPEN_VALUES])
      .order('id', { ascending: true })
      .range(offset, offset + TRACKED_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load tracked pipeline properties: ${error.message}`);
    }

    const batch = (data ?? []) as TrackedRow[];
    collected.push(...batch);
    if (batch.length < TRACKED_PAGE_SIZE) break;
    offset += TRACKED_PAGE_SIZE;
  }

  return collected
    .filter((row) =>
      segment === 'rv'
        ? isPipelineRvSegmentPropertyType(row.property_type)
        : !isPipelineRvSegmentPropertyType(row.property_type)
    )
    .filter((row) =>
      regionCode
        ? extractedStateMatchesRegion(row.state, country, regionCode)
        : true
    )
    .map(({ id, slug, property_name, is_open }) => ({
      id,
      slug,
      property_name,
      is_open,
    }));
}

type PersistRunPayload = {
  dry_run: boolean;
  started_at: string;
  completed_at?: string;
  articles_found?: number;
  articles_fetched?: number;
  articles_failed?: number;
  properties_extracted?: number;
  properties_new?: number;
  properties_inserted?: number;
  status_updates_detected?: number;
  status_updates_applied?: number;
  processed_urls_count?: number;
  error?: string | null;
  region_code?: string | null;
  country?: string | null;
};

async function persistRunMetrics(
  sb: SupabaseClient,
  metrics: PipelineWeeklyRunMetrics,
  error: string | null
): Promise<string | undefined> {
  const payload: PersistRunPayload = {
    dry_run: metrics.dryRun,
    started_at: metrics.startedAt,
    completed_at: metrics.completedAt || new Date().toISOString(),
    articles_found: metrics.articlesFound,
    articles_fetched: metrics.articlesFetched,
    articles_failed: metrics.articlesFailed,
    properties_extracted: metrics.propertiesExtracted,
    properties_new: metrics.propertiesNew,
    properties_inserted: metrics.propertiesInserted,
    status_updates_detected: metrics.statusUpdatesDetected,
    status_updates_applied: metrics.statusUpdatesApplied,
    processed_urls_count: metrics.processedUrlsCount,
    error,
    region_code: metrics.regionCode ?? null,
    country: metrics.country ?? null,
  };

  try {
    const { data, error: insertError } = await sb
      .from(PIPELINE_RUNS_TABLE)
      .insert(payload)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '42703') {
        delete payload.region_code;
        delete payload.country;
        const retry = await sb.from(PIPELINE_RUNS_TABLE).insert(payload).select('id').single();
        if (retry.error && retry.error.code !== '42P01') {
          console.warn(
            '[glamping-pipeline] Could not persist run metrics:',
            retry.error.message
          );
        }
        return retry.data?.id as string | undefined;
      }
      if (insertError.code !== '42P01') {
        console.warn('[glamping-pipeline] Could not persist run metrics:', insertError.message);
      }
      return undefined;
    }

    return data?.id as string | undefined;
  } catch (err) {
    console.warn(
      '[glamping-pipeline] persistRunMetrics threw:',
      err instanceof Error ? err.message : err
    );
    return undefined;
  }
}

export type RunWeeklyPipelineSyncOptions = {
  dryRun?: boolean;
  limitPerQuery?: number;
  force?: boolean;
  country?: PipelineCountry;
  regionCode?: string | null;
  /** Override Tavily queries (glamping). When set, RV queries are skipped unless rvQueries is provided. */
  glampingQueries?: readonly string[];
  rvQueries?: readonly string[] | null;
  segments?: readonly PipelineSegment[];
  discoverySource?: string;
  rvDiscoverySource?: string;
  changeSource?: PipelineStatusChangeSource;
};

export type RunWeeklyPipelineSyncResult = {
  metrics: PipelineWeeklyRunMetrics;
  error: string | null;
};

export async function runWeeklyPipelineSync(
  supabase: SupabaseClient,
  openai: OpenAI,
  tavilyApiKey: string,
  options: RunWeeklyPipelineSyncOptions = {}
): Promise<RunWeeklyPipelineSyncResult> {
  const dryRun = options.dryRun ?? false;
  const limitPerQuery = Math.min(
    Math.max(options.limitPerQuery ?? DEFAULT_LIMIT_PER_QUERY, 1),
    MAX_LIMIT_PER_QUERY
  );
  const force = options.force ?? false;
  const country: PipelineCountry = options.country ?? 'United States';
  const regionCode = options.regionCode ?? null;
  const segments: readonly PipelineSegment[] =
    options.segments ??
    (options.glampingQueries && options.rvQueries == null
      ? ['glamping']
      : DEFAULT_SEGMENTS);
  const changeSource: PipelineStatusChangeSource =
    options.changeSource ??
    (regionCode ? 'region_pipeline_sync' : 'weekly_pipeline_sync');
  const glampingDiscoverySource =
    options.discoverySource ?? PIPELINE_DISCOVERY_SOURCE;
  const rvDiscoverySource =
    options.rvDiscoverySource ?? PIPELINE_RV_DISCOVERY_SOURCE;

  const metrics = emptyMetrics(dryRun);
  metrics.country = country;
  metrics.regionCode = regionCode ?? undefined;
  let runError: string | null = null;

  const startPayload: PersistRunPayload = {
    dry_run: dryRun,
    started_at: metrics.startedAt,
    region_code: regionCode,
    country,
  };

  const runId = !dryRun
    ? (
        await supabase
          .from(PIPELINE_RUNS_TABLE)
          .insert(startPayload)
          .select('id')
          .single()
      ).data?.id
    : undefined;

  try {
    const processed = force ? new Set<string>() : await getProcessedUrls(supabase);
    metrics.processedUrlsCount = processed.size;

    const includeRv = segments.includes('rv');
    const [dbPropertyNames, glampingTracked, rvTracked] = await Promise.all([
      getDatabasePropertyNames(supabase),
      loadTrackedPipelineProperties(supabase, 'glamping', country, regionCode),
      includeRv
        ? loadTrackedPipelineProperties(supabase, 'rv', country, regionCode)
        : Promise.resolve([] as PipelinePropertyRef[]),
    ]);

    const tavilyResults = options.glampingQueries
      ? await searchPipelineCustomNews(
          tavilyApiKey,
          options.glampingQueries,
          limitPerQuery,
          regionCode ? `region:${regionCode}` : 'glamping'
        ).then(async (glamping) => {
          if (!includeRv || options.rvQueries == null || options.rvQueries.length === 0) {
            return glamping;
          }
          const rv = await searchPipelineCustomNews(
            tavilyApiKey,
            options.rvQueries,
            limitPerQuery,
            'rv'
          );
          const seen = new Set(glamping.map((a) => a.url));
          return [...glamping, ...rv.filter((a) => !seen.has(a.url))];
        })
      : await searchPipelineAllSegmentsNews(tavilyApiKey, limitPerQuery);

    metrics.articlesFound = tavilyResults.length;

    for (const { url: articleUrl } of tavilyResults) {
      if (processed.has(articleUrl)) continue;

      try {
        const content = await fetchArticleContent(articleUrl, {});
        metrics.articlesFetched++;
        processed.add(articleUrl);

        for (const segment of segments) {
          const result = await processPipelineArticle({
            content,
            articleUrl,
            dryRun,
            openai,
            supabase,
            dbPropertyNames,
            trackedProperties: segment === 'rv' ? rvTracked : glampingTracked,
            runId,
            segment,
            markProcessed: segment === segments[segments.length - 1],
            country,
            regionCode,
            discoverySource:
              segment === 'rv' ? rvDiscoverySource : glampingDiscoverySource,
            changeSource,
          });

          const segmentMetrics =
            segment === 'rv' ? metrics.rv! : metrics.glamping!;
          addSegmentResult(segmentMetrics, result);
        }
      } catch (err) {
        metrics.articlesFailed++;
        console.warn(
          `[glamping-pipeline] Article failed ${articleUrl}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    rollupTotals(metrics);
    metrics.processedUrlsCount = processed.size;
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err);
  }

  metrics.completedAt = new Date().toISOString();

  if (dryRun) {
    await persistRunMetrics(supabase, metrics, runError);
  } else if (runId) {
    await supabase
      .from(PIPELINE_RUNS_TABLE)
      .update({
        completed_at: metrics.completedAt,
        articles_found: metrics.articlesFound,
        articles_fetched: metrics.articlesFetched,
        articles_failed: metrics.articlesFailed,
        properties_extracted: metrics.propertiesExtracted,
        properties_new: metrics.propertiesNew,
        properties_inserted: metrics.propertiesInserted,
        status_updates_detected: metrics.statusUpdatesDetected,
        status_updates_applied: metrics.statusUpdatesApplied,
        processed_urls_count: metrics.processedUrlsCount,
        error: runError,
      })
      .eq('id', runId);
    metrics.runId = runId;
  } else {
    await persistRunMetrics(supabase, metrics, runError);
  }

  return { metrics, error: runError };
}
