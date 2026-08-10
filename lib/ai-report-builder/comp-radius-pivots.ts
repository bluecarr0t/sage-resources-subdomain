/**
 * Radius pivot summaries from market tables (Sage / Hipcamp / Campspot / RoverPass).
 * Used by Supply & Competition / Rate / Occupancy draft sections.
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

export const COMP_PIVOT_RADII_MILES = [50, 100, 150] as const;

export interface CompRadiusUnitTypePivot {
  unit_type: string;
  property_count: number;
  avg_adr: number | null;
  avg_occupancy: number | null;
}

export interface CompRadiusPivotBucket {
  radius_miles: number;
  property_count: number;
  avg_adr: number | null;
  avg_occupancy: number | null;
  sources: string[];
  /** ADR / occupancy broken out by unit type within this radius */
  by_unit_type: CompRadiusUnitTypePivot[];
}

export interface CompRadiusPivotsResult {
  buckets: CompRadiusPivotBucket[];
  fetched_at: string;
}

function normOcc(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v > 1 ? v / 100 : v;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function unitTypeKey(c: ComparableProperty): string {
  return (c.unit_type || 'Unknown').trim() || 'Unknown';
}

function pivotByUnitType(inRadius: ComparableProperty[]): CompRadiusUnitTypePivot[] {
  const groups = new Map<string, ComparableProperty[]>();
  for (const c of inRadius) {
    const key = unitTypeKey(c);
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([unit_type, rows]) => {
      const adrs = rows
        .map((c) => c.avg_retail_daily_rate)
        .filter((n): n is number => n != null && n > 0);
      const occs = rows
        .map(
          (c) =>
            normOcc(c.market_occupancy_rate) ??
            normOcc(
              c.low_occupancy != null && c.peak_occupancy != null
                ? (c.low_occupancy + c.peak_occupancy) / 2
                : null
            )
        )
        .filter((n): n is number => n != null && n > 0);
      return {
        unit_type,
        property_count: rows.length,
        avg_adr: avg(adrs) != null ? Math.round(avg(adrs)! * 100) / 100 : null,
        avg_occupancy: avg(occs) != null ? Math.round(avg(occs)! * 1000) / 1000 : null,
      };
    })
    .sort((a, b) => b.property_count - a.property_count);
}

function pivotFromComps(comps: ComparableProperty[], radiusMiles: number): CompRadiusPivotBucket {
  const inRadius = comps.filter(
    (c) => c.distance_miles != null && c.distance_miles <= radiusMiles
  );
  const adrs = inRadius
    .map((c) => c.avg_retail_daily_rate)
    .filter((n): n is number => n != null && n > 0);
  const occs = inRadius
    .map((c) => normOcc(c.market_occupancy_rate) ?? normOcc(c.low_occupancy != null && c.peak_occupancy != null
      ? (c.low_occupancy + c.peak_occupancy) / 2
      : null))
    .filter((n): n is number => n != null && n > 0);
  const sources = [...new Set(inRadius.map((c) => c.source_table))];
  return {
    radius_miles: radiusMiles,
    property_count: inRadius.length,
    avg_adr: avg(adrs) != null ? Math.round(avg(adrs)! * 100) / 100 : null,
    avg_occupancy: avg(occs) != null ? Math.round(avg(occs)! * 1000) / 1000 : null,
    sources,
    by_unit_type: pivotByUnitType(inRadius),
  };
}

/**
 * Fetch market comps out to max radius and summarize at 50 / 100 / 150 mi.
 */
export async function fetchCompRadiusPivots(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateInput: string,
  marketType?: string | null,
): Promise<CompRadiusPivotsResult> {
  const stateAbbr = stateInput.trim().toUpperCase().slice(0, 2);
  const stateFullName = resolveStateName(stateInput);
  const maxRadius = COMP_PIVOT_RADII_MILES[COMP_PIVOT_RADII_MILES.length - 1];
  const rowLimit = 400;
  const isGlamping = (marketType ?? '').toLowerCase().includes('glamping');

  const metas = isGlamping
    ? (
        await Promise.all([
          fetchGlampingPropsNumeric(supabase, lat, lng, stateAbbr, maxRadius, rowLimit),
          fetchHipcampComps(supabase, lat, lng, stateFullName, stateAbbr, maxRadius, rowLimit),
        ])
      ).flat()
    : (
        await Promise.all([
          fetchRoverpassComps(supabase, lat, lng, stateFullName, maxRadius, rowLimit),
          fetchCampspotComps(supabase, lat, lng, stateFullName, stateAbbr, maxRadius, rowLimit),
          // Mixed portfolios still benefit from sage/hipcamp lodging
          fetchGlampingPropsNumeric(supabase, lat, lng, stateAbbr, maxRadius, Math.floor(rowLimit / 2)),
          fetchHipcampComps(supabase, lat, lng, stateFullName, stateAbbr, maxRadius, Math.floor(rowLimit / 2)),
        ])
      ).flat();

  const comps = metas.map((m) => m.comp);
  const buckets = COMP_PIVOT_RADII_MILES.map((r) => pivotFromComps(comps, r));

  return {
    buckets,
    fetched_at: new Date().toISOString(),
  };
}

/** Format pivots for LLM prompts */
export function formatCompRadiusPivotsForPrompt(pivots: CompRadiusPivotsResult | undefined): string {
  if (!pivots?.buckets?.length) return '';
  const lines = pivots.buckets.map((b) => {
    const adr = b.avg_adr != null ? `$${Math.round(b.avg_adr)}` : 'n/a';
    const occ = b.avg_occupancy != null ? `${(b.avg_occupancy * 100).toFixed(0)}%` : 'n/a';
    const byType =
      b.by_unit_type?.length > 0
        ? `; by type: ${b.by_unit_type
            .slice(0, 5)
            .map((t) => {
              const tAdr = t.avg_adr != null ? `$${Math.round(t.avg_adr)}` : 'n/a';
              return `${t.unit_type}×${t.property_count}@${tAdr}`;
            })
            .join(', ')}`
        : '';
    return `${b.radius_miles} mi: ${b.property_count} properties, avg ADR ${adr}, avg occ ${occ} (sources: ${b.sources.join(', ') || 'none'})${byType}`;
  });
  return `Market supply pivots (Sage/Hipcamp/Campspot/RoverPass):\n${lines.join('\n')}`;
}
