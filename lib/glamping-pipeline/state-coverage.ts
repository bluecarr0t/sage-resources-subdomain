/**
 * Pipeline coverage: sweep metadata in glamping_pipeline_state_coverage
 * plus live Proposed / UC / Cancelled counts from all_sage_data.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import {
  GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN,
  GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN,
} from '@/lib/glamping-market-snapshot-region';
import { normalizeCaProvinceToCode } from '@/lib/normalize-ca-province-key';
import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';
import {
  PIPELINE_STATE_COVERAGE_TABLE,
  PIPELINE_SWEEP_STATUSES,
  PIPELINE_WATCH_IS_OPEN_VALUES,
  type PipelineCountry,
  type PipelineSweepStatus,
} from './constants';
import type { PipelineWeeklyRunMetrics } from './types';
import {
  ALL_PIPELINE_REGIONS,
  findPipelineRegion,
  parsePipelineCountry,
  pipelineRegionKey,
  type PipelineRegion,
} from './regions';

const PAGE_SIZE = 1000;

export type PipelineLiveCounts = {
  proposed: number;
  underConstruction: number;
  cancelled: number;
};

export type PipelineCoverageRow = {
  regionCode: string;
  country: PipelineCountry;
  name: string;
  priority: number;
  archiveSlug: string;
  sweepStatus: PipelineSweepStatus;
  lastResearchedAt: string | null;
  lastRunId: string | null;
  lastArticlesFound: number;
  lastPropertiesInserted: number;
  notes: string | null;
  live: PipelineLiveCounts;
};

type CoverageDbRow = {
  region_code: string;
  country: string;
  sweep_status: string;
  last_researched_at: string | null;
  last_run_id: string | null;
  last_articles_found: number | null;
  last_properties_inserted: number | null;
  notes: string | null;
  priority: number | null;
};

type SagePipelineCountRow = {
  property_name: string | null;
  state: string | null;
  country: string | null;
  is_open: string | null;
};

function emptyLive(): PipelineLiveCounts {
  return { proposed: 0, underConstruction: 0, cancelled: 0 };
}

function isSweepStatus(raw: string): raw is PipelineSweepStatus {
  return (PIPELINE_SWEEP_STATUSES as readonly string[]).includes(raw);
}

function sweepStatusAfterRun(
  previous: PipelineSweepStatus,
  metrics: PipelineWeeklyRunMetrics,
  runError: string | null
): PipelineSweepStatus {
  if (runError) return previous === 'pending' ? 'in_progress' : previous;
  if (metrics.articlesFetched === 0 && metrics.propertiesInserted === 0) {
    return 'no_projects_found';
  }
  if (metrics.propertiesInserted === 0 && metrics.propertiesExtracted === 0) {
    return 'no_projects_found';
  }
  return 'complete';
}

function normalizeRegionCodeForLive(
  country: PipelineCountry,
  rawState: string | null
): string | null {
  if (country === 'Canada') {
    return normalizeCaProvinceToCode(rawState);
  }
  return normalizeDbStateToUspsAbbr(rawState);
}

/** Deduped property-name counts per region. */
export async function loadLivePipelineCountsByProperty(
  sb: SupabaseClient
): Promise<Map<string, PipelineLiveCounts>> {
  const proposed = new Map<string, Set<string>>();
  const uc = new Map<string, Set<string>>();
  const cancelled = new Map<string, Set<string>>();

  const countryIn = [
    ...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN,
    ...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN,
  ];

  let offset = 0;
  for (;;) {
    const { data, error } = await sb
      .from(ALL_SAGE_DATA_TABLE)
      .select('property_name, state, country, is_open')
      .eq('is_glamping_property', 'Yes')
      .in('country', countryIn)
      .in('is_open', [...PIPELINE_WATCH_IS_OPEN_VALUES])
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load pipeline inventory: ${error.message}`);
    }

    const batch = (data ?? []) as SagePipelineCountRow[];
    for (const row of batch) {
      const country = parsePipelineCountry(row.country);
      if (!country) continue;
      const code = normalizeRegionCodeForLive(country, row.state);
      if (!code) continue;
      const key = pipelineRegionKey(country, code);
      const name = (row.property_name ?? '').trim() || `__anon_${key}_${offset}`;
      const status = (row.is_open ?? '').trim();
      if (status === 'Proposed Development') {
        if (!proposed.has(key)) proposed.set(key, new Set());
        proposed.get(key)!.add(name);
      } else if (status === 'Under Construction') {
        if (!uc.has(key)) uc.set(key, new Set());
        uc.get(key)!.add(name);
      } else if (status === 'Cancelled') {
        if (!cancelled.has(key)) cancelled.set(key, new Set());
        cancelled.get(key)!.add(name);
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const out = new Map<string, PipelineLiveCounts>();
  for (const region of ALL_PIPELINE_REGIONS) {
    const key = pipelineRegionKey(region.country, region.code);
    out.set(key, {
      proposed: proposed.get(key)?.size ?? 0,
      underConstruction: uc.get(key)?.size ?? 0,
      cancelled: cancelled.get(key)?.size ?? 0,
    });
  }
  return out;
}

export async function loadCoverageMetadata(
  sb: SupabaseClient
): Promise<Map<string, CoverageDbRow>> {
  const map = new Map<string, CoverageDbRow>();
  const { data, error } = await sb.from(PIPELINE_STATE_COVERAGE_TABLE).select(
    'region_code, country, sweep_status, last_researched_at, last_run_id, last_articles_found, last_properties_inserted, notes, priority'
  );

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[glamping-pipeline] coverage table:', error.message);
    }
    return map;
  }

  for (const row of (data ?? []) as CoverageDbRow[]) {
    const country = parsePipelineCountry(row.country);
    if (!country) continue;
    map.set(pipelineRegionKey(country, row.region_code), row);
  }
  return map;
}

export async function fetchPipelineCoverageSnapshot(
  sb: SupabaseClient
): Promise<PipelineCoverageRow[]> {
  const [live, meta] = await Promise.all([
    loadLivePipelineCountsByProperty(sb),
    loadCoverageMetadata(sb),
  ]);

  return ALL_PIPELINE_REGIONS.map((region) => {
    const key = pipelineRegionKey(region.country, region.code);
    const db = meta.get(key);
    const sweepRaw = db?.sweep_status ?? 'pending';
    const sweepStatus: PipelineSweepStatus = isSweepStatus(sweepRaw)
      ? sweepRaw
      : 'pending';
    return {
      regionCode: region.code,
      country: region.country,
      name: region.name,
      priority: db?.priority ?? region.priority,
      archiveSlug: region.archiveSlug,
      sweepStatus,
      lastResearchedAt: db?.last_researched_at ?? null,
      lastRunId: db?.last_run_id ?? null,
      lastArticlesFound: db?.last_articles_found ?? 0,
      lastPropertiesInserted: db?.last_properties_inserted ?? 0,
      notes: db?.notes ?? null,
      live: live.get(key) ?? emptyLive(),
    };
  });
}

export async function recordRegionSweep(
  sb: SupabaseClient,
  region: PipelineRegion,
  metrics: PipelineWeeklyRunMetrics,
  opts: { dryRun: boolean; error: string | null }
): Promise<void> {
  if (opts.dryRun) return;

  const previous = await loadCoverageMetadata(sb);
  const key = pipelineRegionKey(region.country, region.code);
  const prevStatusRaw = previous.get(key)?.sweep_status ?? 'pending';
  const prevStatus: PipelineSweepStatus = isSweepStatus(prevStatusRaw)
    ? prevStatusRaw
    : 'pending';
  const sweepStatus = sweepStatusAfterRun(prevStatus, metrics, opts.error);

  const payload = {
    region_code: region.code,
    country: region.country,
    sweep_status: sweepStatus,
    last_researched_at: new Date().toISOString(),
    last_run_id: metrics.runId ?? null,
    last_articles_found: metrics.articlesFound,
    last_properties_inserted: metrics.propertiesInserted,
    priority: region.priority,
    notes: opts.error
      ? `Last run error: ${opts.error}`
      : previous.get(key)?.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from(PIPELINE_STATE_COVERAGE_TABLE).upsert(payload, {
    onConflict: 'region_code,country',
  });

  if (error && error.code !== '42P01') {
    console.warn('[glamping-pipeline] Could not record region sweep:', error.message);
  }
}

export async function listPendingRegionsForRotation(
  sb: SupabaseClient,
  limit: number
): Promise<PipelineRegion[]> {
  const snapshot = await fetchPipelineCoverageSnapshot(sb);
  const pending = snapshot
    .filter((row) => row.sweepStatus === 'pending')
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.country !== b.country) {
        return a.country === 'United States' ? -1 : 1;
      }
      return a.regionCode.localeCompare(b.regionCode);
    })
    .slice(0, Math.max(1, limit));

  return pending
    .map((row) => findPipelineRegion(row.country, row.regionCode))
    .filter((r): r is PipelineRegion => r != null);
}

export function sageDataEditorHrefForRegion(
  country: PipelineCountry,
  regionCode: string
): string {
  const params = new URLSearchParams({
    country,
    state: regionCode,
    research_status: 'in_progress',
  });
  return `/admin/sage-data/editor?${params.toString()}`;
}
