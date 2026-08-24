import type { SupabaseClient } from '@supabase/supabase-js';
import type { OpenAI } from 'openai';
import type { PipelineCountry } from './constants';
import {
  findPipelineRegion,
  pipelineDiscoverySourceForRegion,
  type PipelineRegion,
} from './regions';
import {
  buildRegionPipelineQueries,
  type PipelineQueryTier,
} from './region-queries';
import {
  runWeeklyPipelineSync,
  type RunWeeklyPipelineSyncResult,
} from './run-weekly-sync';
import { recordRegionSweep } from './state-coverage';

export type RunRegionPipelineSyncOptions = {
  country: PipelineCountry;
  regionCode: string;
  dryRun?: boolean;
  force?: boolean;
  limitPerQuery?: number;
  tiers?: readonly PipelineQueryTier[];
  includeRv?: boolean;
};

export type RunRegionPipelineSyncResult = RunWeeklyPipelineSyncResult & {
  region: PipelineRegion | null;
};

export async function runRegionPipelineSync(
  supabase: SupabaseClient,
  openai: OpenAI,
  tavilyApiKey: string,
  options: RunRegionPipelineSyncOptions
): Promise<RunRegionPipelineSyncResult> {
  const region = findPipelineRegion(options.country, options.regionCode);
  if (!region) {
    return {
      region: null,
      error: `Unknown region ${options.country} ${options.regionCode}`,
      metrics: {
        dryRun: options.dryRun ?? false,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        articlesFound: 0,
        articlesFetched: 0,
        articlesFailed: 0,
        propertiesExtracted: 0,
        propertiesNew: 0,
        propertiesInserted: 0,
        statusUpdatesDetected: 0,
        statusUpdatesApplied: 0,
        processedUrlsCount: 0,
      },
    };
  }

  const tiers = options.tiers ?? (['A', 'B'] as const);
  const queries = buildRegionPipelineQueries(region, tiers);
  const result = await runWeeklyPipelineSync(supabase, openai, tavilyApiKey, {
    dryRun: options.dryRun,
    force: options.force,
    limitPerQuery: options.limitPerQuery,
    country: region.country,
    regionCode: region.code,
    glampingQueries: queries,
    rvQueries: null,
    segments: options.includeRv ? ['glamping', 'rv'] : ['glamping'],
    discoverySource: pipelineDiscoverySourceForRegion(region.country, region.code),
    changeSource: 'region_pipeline_sync',
  });

  await recordRegionSweep(supabase, region, result.metrics, {
    dryRun: options.dryRun ?? false,
    error: result.error,
  });

  return { ...result, region };
}
