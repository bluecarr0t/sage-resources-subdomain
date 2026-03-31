/**
 * Fetch comparable properties from Supabase by proximity.
 *
 * Glamping: all_glamping_properties + hipcamp
 * RV:      all_roverpass_data_new + campspot
 *
 * Uses Haversine distance, filtered by bounding box for performance.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComparableProperty } from './types';
import { resolveStateName } from '@/lib/comps-v2/geo';
import {
  fetchCampspotComps,
  fetchGlampingPropsNumeric,
  fetchHipcampComps,
  fetchRoverpassComps,
} from '@/lib/comps-v2/market-fetch';
import { rowMatchesPropertyKinds } from '@/lib/comps-v2/kind-matcher';
import type { CompsV2PropertyKind } from '@/lib/comps-v2/types';

const DEFAULT_RADIUS_MILES = 150;
const DEFAULT_MAX_COMPS = 10;
const DEFAULT_ROW_LIMIT = 200;

export interface FetchCompsOptions {
  /** Include past Sage report comps (feasibility_comparables) */
  pastReportComps?: ComparableProperty[];
  /** Include Tavily web-researched comps */
  tavilyComps?: ComparableProperty[];
  /** Override search radius (comps-v2 uses 100–250+). */
  radiusMiles?: number;
  /** Max merged results after dedupe. */
  maxResults?: number;
  /**
   * When set (e.g. comps-v2), queries all relevant market tables and filters by kind.
   * When unset, uses legacy glamping vs non-glamping split from `marketType`.
   */
  propertyKinds?: CompsV2PropertyKind[];
}

/**
 * Fetch and merge comparables from all available sources:
 * 1. Supabase market tables (hipcamp, all_glamping_properties, campspot, all_roverpass_data_new)
 * 2. Past Sage reports (feasibility_comparables + feasibility_comp_units)
 * 3. Tavily web research
 *
 * Results are deduplicated and sorted by distance (DB comps first, then past reports, then web).
 */
export async function fetchNearbyComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateInput: string,
  marketType?: string | null,
  options?: FetchCompsOptions
): Promise<ComparableProperty[]> {
  const stateAbbr = stateInput.trim().toUpperCase().slice(0, 2);
  const stateFullName = resolveStateName(stateInput);
  const radiusMiles = options?.radiusMiles ?? DEFAULT_RADIUS_MILES;
  const maxComps = options?.maxResults ?? DEFAULT_MAX_COMPS;
  const rowLimit = DEFAULT_ROW_LIMIT;
  const kinds = options?.propertyKinds;

  let dbComps: ComparableProperty[];

  if (kinds && kinds.length > 0) {
    const [glampingProps, hipcampProps, roverpassProps, campspotProps] = await Promise.all([
      fetchGlampingPropsNumeric(supabase, lat, lng, stateAbbr, radiusMiles, rowLimit),
      fetchHipcampComps(supabase, lat, lng, stateFullName, stateAbbr, radiusMiles, rowLimit),
      fetchRoverpassComps(supabase, lat, lng, stateFullName, radiusMiles, rowLimit),
      fetchCampspotComps(supabase, lat, lng, stateFullName, stateAbbr, radiusMiles, rowLimit),
    ]);
    const merged = [...glampingProps, ...hipcampProps, ...roverpassProps, ...campspotProps];
    dbComps = merged
      .filter((m) => rowMatchesPropertyKinds(m.comp, kinds, m.property_type))
      .map((m) => m.comp);
  } else {
    const isGlamping = (marketType ?? '').toLowerCase().includes('glamping');
    if (isGlamping) {
      const [glampingProps, hipcampProps] = await Promise.all([
        fetchGlampingPropsNumeric(supabase, lat, lng, stateAbbr, radiusMiles, rowLimit),
        fetchHipcampComps(supabase, lat, lng, stateFullName, stateAbbr, radiusMiles, rowLimit),
      ]);
      dbComps = [...glampingProps.map((m) => m.comp), ...hipcampProps.map((m) => m.comp)];
    } else {
      const [roverpassProps, campspotProps] = await Promise.all([
        fetchRoverpassComps(supabase, lat, lng, stateFullName, radiusMiles, rowLimit),
        fetchCampspotComps(supabase, lat, lng, stateFullName, stateAbbr, radiusMiles, rowLimit),
      ]);
      dbComps = [...roverpassProps.map((m) => m.comp), ...campspotProps.map((m) => m.comp)];
    }
  }

  const allComps = [
    ...dbComps,
    ...(options?.pastReportComps ?? []),
    ...(options?.tavilyComps ?? []),
  ];

  const seen = new Set<string>();
  const deduped = allComps.filter((c) => {
    const key = `${c.property_name.toLowerCase().trim()}-${c.unit_type?.toLowerCase() ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => {
    const sourceOrder = (s: string) => {
      if (s === 'past_reports') return 1;
      if (s === 'tavily_web_research' || s === 'tavily_gap_fill' || s === 'firecrawl_gap_fill') return 2;
      return 0;
    };
    const orderDiff = sourceOrder(a.source_table) - sourceOrder(b.source_table);
    if (orderDiff !== 0) return orderDiff;
    if (a.source_table === 'past_reports') {
      return (b.quality_score ?? 0) - (a.quality_score ?? 0);
    }
    if (
      a.distance_miles != null &&
      b.distance_miles != null &&
      a.distance_miles >= 0 &&
      b.distance_miles >= 0
    ) {
      return a.distance_miles - b.distance_miles;
    }
    return 0;
  });

  return deduped.slice(0, maxComps);
}
