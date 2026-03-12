/**
 * Fetch Campspot ADR and occupancy benchmarks by pull-thru vs back-in.
 * Queries the Supabase campspot table.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CampspotPremiumsResult {
  pullThru: { adr: number; occupancy: number; count: number };
  backIn: { adr: number; occupancy: number; count: number };
}

function isPullThru(siteName: string | null): boolean {
  if (!siteName?.trim()) return false;
  const lower = siteName.toLowerCase();
  return (
    lower.includes('pull') ||
    lower.includes('pull-thru') ||
    lower.includes('pullthrough') ||
    lower.includes('pull-thru')
  );
}

function parseNum(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
}

export async function fetchCampspotPremiums(
  supabase: SupabaseClient,
  stateFilter?: string | null
): Promise<CampspotPremiumsResult | null> {
  let query = supabase
    .from('campspot')
    .select('site_name, avg_retail_daily_rate_2025, occupancy_rate_2025, unit_type')
    .not('avg_retail_daily_rate_2025', 'is', null)
    .not('occupancy_rate_2025', 'is', null);

  if (stateFilter?.trim()) {
    query = query.eq('state', stateFilter.trim().toUpperCase());
  }

  const { data: rows, error } = await query.limit(5000);

  if (error) {
    console.error('[campspot-premiums] Query error:', error);
    return null;
  }

  if (!rows?.length) return null;

  const pullThruRates: number[] = [];
  const pullThruOcc: number[] = [];
  const backInRates: number[] = [];
  const backInOcc: number[] = [];

  for (const row of rows) {
    const unitType = String(row.unit_type || '').toLowerCase();
    if (!unitType.includes('rv')) continue;

    const adr = parseNum(row.avg_retail_daily_rate_2025);
    const occ = parseNum(row.occupancy_rate_2025);
    if (adr == null || adr <= 0 || occ == null || occ < 0) continue;

    if (isPullThru(row.site_name)) {
      pullThruRates.push(adr);
      pullThruOcc.push(occ);
    } else {
      backInRates.push(adr);
      backInOcc.push(occ);
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    pullThru: {
      adr: Math.round(avg(pullThruRates) * 100) / 100,
      occupancy: Math.round(avg(pullThruOcc) * 100) / 100,
      count: pullThruRates.length,
    },
    backIn: {
      adr: Math.round(avg(backInRates) * 100) / 100,
      occupancy: Math.round(avg(backInOcc) * 100) / 100,
      count: backInRates.length,
    },
  };
}
