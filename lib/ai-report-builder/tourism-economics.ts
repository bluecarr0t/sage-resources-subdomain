/**
 * Tourism economics cache reader (state / county / year).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { STATE_ABBR_TO_NAME } from '@/lib/comps-v2/geo';

export interface TourismEconomicsRow {
  geo_level: 'state' | 'county';
  state: string;
  county: string | null;
  year: number;
  lodging_spend: number | null;
  total_spend: number | null;
  employment: number | null;
  source: string | null;
}

export interface TourismEconomicsResult {
  rows: TourismEconomicsRow[];
  fetched_at: string;
  source: string;
}

export async function fetchTourismEconomics(
  supabase: SupabaseClient,
  opts: { stateAbbr: string; countyName?: string | null }
): Promise<TourismEconomicsResult | null> {
  const stateAbbr = opts.stateAbbr.toUpperCase().slice(0, 2);
  const stateName = STATE_ABBR_TO_NAME[stateAbbr] ?? stateAbbr;

  try {
    let query = supabase
      .from('tourism_economics')
      .select(
        'geo_level, state, county, year, lodging_spend, total_spend, employment, source'
      )
      .or(`state.eq.${stateAbbr},state.ilike.${stateName}`)
      .order('year', { ascending: false })
      .limit(20);

    const { data, error } = await query;
    if (error) {
      // Table may not exist yet
      console.warn('[tourism] fetch skipped:', error.message);
      return null;
    }
    if (!data?.length) return null;

    let rows = data as unknown as TourismEconomicsRow[];
    const countyHint = opts.countyName?.trim();
    if (countyHint) {
      const token = countyHint.toLowerCase().replace(/\b(county|parish)\b/g, '').trim();
      const countyRows = rows.filter(
        (r) =>
          r.geo_level === 'county' &&
          r.county &&
          r.county.toLowerCase().includes(token)
      );
      if (countyRows.length) {
        rows = [...countyRows, ...rows.filter((r) => r.geo_level === 'state')].slice(0, 10);
      }
    }

    return {
      rows,
      fetched_at: new Date().toISOString(),
      source: 'tourism_economics',
    };
  } catch (err) {
    console.warn('[tourism] fetch failed:', err);
    return null;
  }
}

export function formatTourismForPrompt(t: TourismEconomicsResult | undefined | null): string {
  if (!t?.rows?.length) return '';
  const lines = t.rows.slice(0, 5).map((r) => {
    const geo =
      r.geo_level === 'county' && r.county
        ? `${r.county}, ${r.state}`
        : r.state;
    const lodging =
      r.lodging_spend != null ? `$${Math.round(r.lodging_spend).toLocaleString()} lodging` : null;
    const total =
      r.total_spend != null ? `$${Math.round(r.total_spend).toLocaleString()} total` : null;
    const emp = r.employment != null ? `${r.employment.toLocaleString()} jobs` : null;
    return `  ${geo} (${r.year}): ${[lodging, total, emp].filter(Boolean).join(', ') || 'n/a'}${r.source ? ` [${r.source}]` : ''}`;
  });
  return `Tourism economics:\n${lines.join('\n')}`;
}
