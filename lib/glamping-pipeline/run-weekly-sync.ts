import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpenAI } from 'openai';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { fetchArticleContent } from '@/lib/glamping-discovery/fetch-article';
import { getDatabasePropertyNames } from '@/lib/glamping-discovery/deduplicate';
import { searchPipelineAllSegmentsNews } from './tavily-search';
import { processPipelineArticle } from './process-article';
import type { ProcessPipelineArticleResult } from './process-article';
import {
  isPipelineRvSegmentPropertyType,
  PIPELINE_PROCESSED_URLS_TABLE,
  PIPELINE_RUNS_TABLE,
  PIPELINE_WATCH_IS_OPEN_VALUES,
  type PipelineSegment,
} from './constants';
import type {
  PipelinePropertyRef,
  PipelineSegmentMetrics,
  PipelineWeeklyRunMetrics,
} from './types';

const DEFAULT_LIMIT_PER_QUERY = 5;
const MAX_LIMIT_PER_QUERY = 10;

const SEGMENTS: PipelineSegment[] = ['glamping', 'rv'];

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


async function loadTrackedPipelineProperties(
  sb: SupabaseClient,
  segment: PipelineSegment
): Promise<PipelinePropertyRef[]> {
  const { data, error } = await sb
    .from(ALL_SAGE_DATA_TABLE)
    .select('id, slug, property_name, is_open, property_type')
    .eq('country', 'United States')
    .in('is_open', [...PIPELINE_WATCH_IS_OPEN_VALUES]);

  if (error) {
    throw new Error(`Failed to load tracked pipeline properties: ${error.message}`);
  }

  const rows = (data ?? []) as (PipelinePropertyRef & {
    property_type?: string | null;
  })[];

  return rows
    .filter((row) =>
      segment === 'rv'
        ? isPipelineRvSegmentPropertyType(row.property_type)
        : !isPipelineRvSegmentPropertyType(row.property_type)
    )
    .map(({ id, slug, property_name, is_open }) => ({
      id,
      slug,
      property_name,
      is_open,
    }));
}

async function persistRunMetrics(
  sb: SupabaseClient,
  metrics: PipelineWeeklyRunMetrics,
  error: string | null
): Promise<string | undefined> {
  try {
    const { data, error: insertError } = await sb
      .from(PIPELINE_RUNS_TABLE)
      .insert({
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
      })
      .select('id')
      .single();

    if (insertError) {
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

  const metrics = emptyMetrics(dryRun);
  let runError: string | null = null;

  const runId = !dryRun
    ? (
        await supabase
          .from(PIPELINE_RUNS_TABLE)
          .insert({
            dry_run: dryRun,
            started_at: metrics.startedAt,
          })
          .select('id')
          .single()
      ).data?.id
    : undefined;

  try {
    const processed = force ? new Set<string>() : await getProcessedUrls(supabase);
    metrics.processedUrlsCount = processed.size;

    const [dbPropertyNames, glampingTracked, rvTracked] = await Promise.all([
      getDatabasePropertyNames(supabase),
      loadTrackedPipelineProperties(supabase, 'glamping'),
      loadTrackedPipelineProperties(supabase, 'rv'),
    ]);

    const tavilyResults = await searchPipelineAllSegmentsNews(tavilyApiKey, limitPerQuery);
    metrics.articlesFound = tavilyResults.length;

    for (const { url: articleUrl } of tavilyResults) {
      if (processed.has(articleUrl)) continue;

      try {
        const content = await fetchArticleContent(articleUrl, {});
        metrics.articlesFetched++;
        processed.add(articleUrl);

        for (const segment of SEGMENTS) {
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
            markProcessed: segment === 'rv',
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
