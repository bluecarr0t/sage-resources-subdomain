/**
 * Unified comps-v2 discovery: market tables + optional past reports, filters, stable ids.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComparableProperty } from '@/lib/ai-report-builder/types';
import { resolveStateName } from '@/lib/comps-v2/geo';
import {
  fetchCampspotComps,
  fetchGlampingPropsNumeric,
  fetchHipcampComps,
  fetchRoverpassComps,
  type MarketRowMeta,
} from '@/lib/comps-v2/market-fetch';
import { fetchPastReportCompsNearAnchor } from '@/lib/comps-v2/past-reports-nearby';
import {
  adrToQualityTier,
  passesAdrRange,
  passesQualityTiers,
  qualityScoreToTier,
  effectiveAdr,
} from '@/lib/comps-v2/filters';
import { rowMatchesPropertyKinds } from '@/lib/comps-v2/kind-matcher';
import { stableCandidateId } from '@/lib/comps-v2/stable-id';
import { finalizeGlampingUniqueProperties } from '@/lib/comps-v2/unique-properties';
import type {
  CompsV2Candidate,
  CompsV2PropertyKind,
  QualityTier,
  SourceToggles,
} from '@/lib/comps-v2/types';
import { ALL_SOURCES_DISABLED } from '@/lib/comps-v2/types';

export interface DiscoverCompsV2Params {
  lat: number;
  lng: number;
  stateInput: string;
  radiusMiles: number;
  maxResults: number;
  propertyKinds: CompsV2PropertyKind[];
  minAdr?: number | null;
  maxAdr?: number | null;
  qualityTiers?: QualityTier[] | null;
  sources?: Partial<SourceToggles>;
  rowLimitPerTable?: number;
  maxPastReportGeocodes?: number;
}

function metaToCandidate(meta: MarketRowMeta): CompsV2Candidate {
  const { comp, source_row_id, property_type } = meta;
  const stable_id = stableCandidateId(comp.source_table, source_row_id, comp.property_name);
  const adr = effectiveAdr(comp);
  const adr_quality_tier =
    comp.source_table === 'past_reports'
      ? qualityScoreToTier(comp.quality_score ?? null)
      : adrToQualityTier(adr);

  return {
    ...comp,
    stable_id,
    source_row_id,
    property_type,
    adr_quality_tier,
  };
}

function pastRowToCandidate(row: ComparableProperty, rowKey: string): CompsV2Candidate {
  const stable_id = stableCandidateId('past_reports', rowKey, row.property_name);
  const adr_quality_tier = qualityScoreToTier(row.quality_score ?? null);
  return {
    ...row,
    stable_id,
    source_row_id: rowKey,
    property_type: null,
    adr_quality_tier,
  };
}

export type DiscoverCompsV2Result = {
  candidates: CompsV2Candidate[];
  counts: Record<string, number>;
  /** Wall-clock ms per enabled source (parallel tasks overlap; use for support/tuning, not sum-of-total). */
  sourceTimingsMs: Record<string, number>;
};

function trackTiming<T>(timings: Record<string, number>, key: string, promise: Promise<T>): Promise<T> {
  const t0 = performance.now();
  return promise.finally(() => {
    timings[key] = Math.round(performance.now() - t0);
  });
}

export async function discoverCompsV2(
  supabase: SupabaseClient,
  params: DiscoverCompsV2Params
): Promise<DiscoverCompsV2Result> {
  const {
    lat,
    lng,
    stateInput,
    radiusMiles,
    maxResults,
    propertyKinds,
    minAdr = null,
    maxAdr = null,
    qualityTiers = null,
    sources = {},
    rowLimitPerTable = 400,
    maxPastReportGeocodes = 25,
  } = params;

  const src: SourceToggles = { ...ALL_SOURCES_DISABLED, ...sources };
  const glampingStrict =
    propertyKinds.includes('glamping') &&
    !propertyKinds.includes('rv') &&
    !propertyKinds.includes('campground');
  if (glampingStrict) {
    src.all_roverpass_data_new = false;
    src.campspot = false;
  }
  const stateAbbr = stateInput.trim().toUpperCase().slice(0, 2);
  const stateFullName = resolveStateName(stateInput);

  const counts: Record<string, number> = {};
  const sourceTimingsMs: Record<string, number> = {};
  const metas: MarketRowMeta[] = [];

  const tasks: Promise<void>[] = [];

  if (src.all_glamping_properties) {
    tasks.push(
      trackTiming(sourceTimingsMs, 'all_glamping_properties', fetchGlampingPropsNumeric(
        supabase,
        lat,
        lng,
        stateAbbr,
        radiusMiles,
        rowLimitPerTable
      )).then((rows) => {
        counts.all_glamping_properties = rows.length;
        metas.push(...rows);
      })
    );
  }
  if (src.hipcamp) {
    tasks.push(
      trackTiming(
        sourceTimingsMs,
        'hipcamp',
        fetchHipcampComps(
          supabase,
          lat,
          lng,
          stateFullName,
          stateAbbr,
          radiusMiles,
          rowLimitPerTable
        )
      ).then((rows) => {
        counts.hipcamp = rows.length;
        metas.push(...rows);
      })
    );
  }
  if (src.all_roverpass_data_new) {
    tasks.push(
      trackTiming(
        sourceTimingsMs,
        'all_roverpass_data_new',
        fetchRoverpassComps(supabase, lat, lng, stateFullName, radiusMiles, rowLimitPerTable)
      ).then((rows) => {
        counts.all_roverpass_data_new = rows.length;
        metas.push(...rows);
      })
    );
  }
  if (src.campspot) {
    tasks.push(
      trackTiming(
        sourceTimingsMs,
        'campspot',
        fetchCampspotComps(
          supabase,
          lat,
          lng,
          stateFullName,
          stateAbbr,
          radiusMiles,
          rowLimitPerTable
        )
      ).then((rows) => {
        counts.campspot = rows.length;
        metas.push(...rows);
      })
    );
  }

  await Promise.all(tasks);

  let candidates: CompsV2Candidate[] = metas.map(metaToCandidate);

  if (src.pastReports) {
    const past = await trackTiming(
      sourceTimingsMs,
      'past_reports',
      fetchPastReportCompsNearAnchor(
        supabase,
        lat,
        lng,
        stateInput,
        radiusMiles,
        maxPastReportGeocodes
      )
    );
    counts.past_reports = past.length;
    const pastCandidates = past.map((p) =>
      pastRowToCandidate(
        p,
        `${p.past_report_study_id ?? 'unknown'}:${p.property_name}:${p.unit_type ?? 'property'}`
      )
    );
    candidates = [...candidates, ...pastCandidates];
  }

  const seen = new Set<string>();
  candidates = candidates.filter((c) => {
    if (!rowMatchesPropertyKinds(c, propertyKinds, c.property_type ?? null)) return false;
    if (!passesAdrRange(c, minAdr ?? null, maxAdr ?? null)) return false;
    if (!passesQualityTiers(c, qualityTiers)) return false;
    if (seen.has(c.stable_id)) return false;
    seen.add(c.stable_id);
    return true;
  });

  candidates.sort(compareCompsV2Candidates);

  candidates = finalizeGlampingUniqueProperties(candidates, glampingStrict);
  candidates.sort(compareCompsV2Candidates);

  return {
    candidates: candidates.slice(0, Math.max(1, Math.min(maxResults, 2000))),
    counts,
    sourceTimingsMs,
  };
}

/** Sort key for merged discovery + web rows (DB first, then past, then web). */
export function compareCompsV2Candidates(a: CompsV2Candidate, b: CompsV2Candidate): number {
  const so = (s: string) => {
    if (s === 'past_reports') return 1;
    if (s === 'tavily_web_research' || s === 'tavily_gap_fill' || s === 'firecrawl_gap_fill') return 2;
    return 0;
  };
  const od = so(a.source_table) - so(b.source_table);
  if (od !== 0) return od;
  if (a.source_table === 'past_reports') {
    return (b.quality_score ?? 0) - (a.quality_score ?? 0);
  }
  return (a.distance_miles ?? 999) - (b.distance_miles ?? 999);
}
