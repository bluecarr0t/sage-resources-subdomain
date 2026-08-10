/**
 * STVR / market occupancy indicators from Hipcamp/Campspot/RoverPass (always on),
 * with optional AirDNA when AIRDNA_API_KEY is set.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveStateName } from '@/lib/comps-v2/geo';
import {
  fetchCampspotComps,
  fetchHipcampComps,
  fetchRoverpassComps,
} from '@/lib/comps-v2/market-fetch';
import { fetchAirdnaMarketSnapshot } from './airdna';

export interface StvrIndicators {
  radius_miles: number;
  sample_count: number;
  avg_occupancy: number | null;
  avg_adr: number | null;
  sources: string[];
  /** Present when AirDNA connector returned data */
  airdna?: {
    listing_count: number | null;
    occupancy: number | null;
    adr: number | null;
    market_name: string | null;
  } | null;
  fetched_at: string;
}

function normOcc(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v > 1 ? v / 100 : v;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Aggregate Hipcamp / Campspot / RoverPass occupancy within radiusMiles.
 */
export async function fetchMarketOccupancyIndicators(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateInput: string,
  radiusMiles = 50,
): Promise<StvrIndicators> {
  const stateAbbr = stateInput.trim().toUpperCase().slice(0, 2);
  const stateFull = resolveStateName(stateInput);
  const rowLimit = 200;

  const [hipcamp, campspot, roverpass] = await Promise.all([
    fetchHipcampComps(supabase, lat, lng, stateFull, stateAbbr, radiusMiles, rowLimit),
    fetchCampspotComps(supabase, lat, lng, stateFull, stateAbbr, radiusMiles, rowLimit),
    fetchRoverpassComps(supabase, lat, lng, stateFull, radiusMiles, rowLimit),
  ]);

  const all = [...hipcamp, ...campspot, ...roverpass].map((m) => m.comp);
  const occs = all
    .map((c) => normOcc(c.market_occupancy_rate ?? null))
    .filter((n): n is number => n != null && n > 0 && n <= 1);
  const adrs = all
    .map((c) => c.avg_retail_daily_rate)
    .filter((n): n is number => n != null && n > 0);

  let airdna: StvrIndicators['airdna'] = null;
  try {
    const snap = await fetchAirdnaMarketSnapshot(lat, lng, supabase);
    if (snap) {
      airdna = {
        listing_count: snap.listing_count,
        occupancy: snap.occupancy,
        adr: snap.adr,
        market_name: snap.market_name,
      };
    }
  } catch (err) {
    console.warn('[stvr] AirDNA fetch failed:', err instanceof Error ? err.message : err);
  }

  return {
    radius_miles: radiusMiles,
    sample_count: all.length,
    avg_occupancy: avg(occs) != null ? Math.round(avg(occs)! * 1000) / 1000 : null,
    avg_adr: avg(adrs) != null ? Math.round(avg(adrs)! * 100) / 100 : null,
    sources: [...new Set(all.map((c) => c.source_table))],
    airdna,
    fetched_at: new Date().toISOString(),
  };
}

export function formatStvrForPrompt(stvr: StvrIndicators | undefined): string {
  if (!stvr) return '';
  const lines = [
    `Market occupancy indicators within ${stvr.radius_miles} mi (${stvr.sample_count} properties from ${stvr.sources.join(', ') || 'n/a'}):`,
    `  Avg occupancy: ${stvr.avg_occupancy != null ? `${(stvr.avg_occupancy * 100).toFixed(0)}%` : 'n/a'}`,
    `  Avg ADR: ${stvr.avg_adr != null ? `$${Math.round(stvr.avg_adr)}` : 'n/a'}`,
  ];
  if (stvr.airdna) {
    lines.push(
      `  AirDNA: listings=${stvr.airdna.listing_count ?? 'n/a'}, occ=${stvr.airdna.occupancy != null ? `${(stvr.airdna.occupancy * 100).toFixed(0)}%` : 'n/a'}, ADR=${stvr.airdna.adr != null ? `$${Math.round(stvr.airdna.adr)}` : 'n/a'}${stvr.airdna.market_name ? ` (${stvr.airdna.market_name})` : ''}`
    );
  }
  return lines.join('\n');
}
