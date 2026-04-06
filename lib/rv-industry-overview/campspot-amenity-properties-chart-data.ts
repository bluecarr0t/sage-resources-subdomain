/**
 * % of distinct properties (by name/state/city) that have each amenity, Campspot rows in U.S. RV regions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { createServerClient } from '@/lib/supabase';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';
import { rowPassesStandardCampspot2025Quality } from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';

const PAGE_SIZE = 1000;

export const AMENITY_PROPERTY_CHART_KEYS = [
  'hot_tub_sauna',
  'pool',
  'fifty_amp_electrical',
  'sewer_hook_up',
  'water_hookup',
] as const;

export type AmenityPropertyChartKey = (typeof AMENITY_PROPERTY_CHART_KEYS)[number];

export type CampspotAmenityPropertiesAggRow = {
  property_name: string | null;
  city: string | null;
  state: string | null;
  occupancy_rate_2025: string | null;
  avg_retail_daily_rate_2025: string | null;
  hot_tub_sauna: string | null;
  pool: string | null;
  electrical_hook_up: string | null;
  sewer_hook_up: string | null;
  water_hookup: string | null;
};

export type AmenityPropertyPctRow = {
  amenityKey: AmenityPropertyChartKey;
  /** One decimal, e.g. 16.9 */
  pct: number | null;
  nProperties: number;
  nWithAmenity: number;
};

export type CampspotAmenityPropertiesChartResult = {
  rows: AmenityPropertyPctRow[];
  rowsScanned: number;
  error: string | null;
};

type PropFlags = Record<AmenityPropertyChartKey, boolean>;

function campspotTruthyAmenity(val: unknown): boolean {
  if (val == null || val === '') return false;
  const s = String(val).trim().toLowerCase();
  if (!s || s === 'no data') return false;
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
}

/** 50 amp from `electrical_hook_up` text or standard yes-style flags. */
export function campspotFiftyAmpPresent(val: unknown): boolean {
  if (campspotTruthyAmenity(val)) return true;
  const s = String(val ?? '').toLowerCase();
  return /\b50\s*-?\s*amp\b/.test(s) || /\b50\s*amp\b/.test(s);
}

function propertyGroupKey(row: CampspotAmenityPropertiesAggRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

function emptyFlags(): PropFlags {
  return {
    hot_tub_sauna: false,
    pool: false,
    fifty_amp_electrical: false,
    sewer_hook_up: false,
    water_hookup: false,
  };
}

export function createAmenityPropertiesFoldState(): Map<string, PropFlags> {
  return new Map();
}

export function foldAmenityPropertyRows(
  byProp: Map<string, PropFlags>,
  rows: CampspotAmenityPropertiesAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    if (!rowPassesStandardCampspot2025Quality(row)) continue;

    const pk = propertyGroupKey(row);
    if (!pk) continue;

    let f = byProp.get(pk);
    if (!f) {
      f = emptyFlags();
      byProp.set(pk, f);
    }

    f.hot_tub_sauna = f.hot_tub_sauna || campspotTruthyAmenity(row.hot_tub_sauna);
    f.pool = f.pool || campspotTruthyAmenity(row.pool);
    f.fifty_amp_electrical = f.fifty_amp_electrical || campspotFiftyAmpPresent(row.electrical_hook_up);
    f.sewer_hook_up = f.sewer_hook_up || campspotTruthyAmenity(row.sewer_hook_up);
    f.water_hookup = f.water_hookup || campspotTruthyAmenity(row.water_hookup);
  }
}

function pctOneDecimal(nWith: number, nTotal: number): number | null {
  if (nTotal <= 0) return null;
  return Math.round((1000 * nWith) / nTotal) / 10;
}

export function finalizeAmenityPropertiesFoldState(
  byProp: Map<string, PropFlags>
): AmenityPropertyPctRow[] {
  return countsToRows(byProp);
}

function countsToRows(byProp: Map<string, PropFlags>): AmenityPropertyPctRow[] {
  const nProperties = byProp.size;
  if (nProperties === 0) {
    return AMENITY_PROPERTY_CHART_KEYS.map((amenityKey) => ({
      amenityKey,
      pct: null,
      nProperties: 0,
      nWithAmenity: 0,
    }));
  }

  const nWith: Record<AmenityPropertyChartKey, number> = {
    hot_tub_sauna: 0,
    pool: 0,
    fifty_amp_electrical: 0,
    sewer_hook_up: 0,
    water_hookup: 0,
  };

  for (const f of byProp.values()) {
    for (const key of AMENITY_PROPERTY_CHART_KEYS) {
      if (f[key]) nWith[key] += 1;
    }
  }

  return AMENITY_PROPERTY_CHART_KEYS.map((amenityKey) => ({
    amenityKey,
    pct: pctOneDecimal(nWith[amenityKey], nProperties),
    nProperties,
    nWithAmenity: nWith[amenityKey],
  }));
}

export function aggregateCampspotRowsToAmenityPropertyPcts(
  rows: CampspotAmenityPropertiesAggRow[]
): AmenityPropertyPctRow[] {
  const byProp = new Map<string, PropFlags>();
  foldAmenityPropertyRows(byProp, rows);
  return countsToRows(byProp);
}

const SELECT_FIELDS =
  'property_name, city, state, occupancy_rate_2025, avg_retail_daily_rate_2025, ' +
  'hot_tub_sauna, pool, electrical_hook_up, sewer_hook_up, water_hookup';

export async function fetchCampspotAmenityPropertiesChartData(
  supabase: SupabaseClient
): Promise<CampspotAmenityPropertiesChartResult> {
  const byProp = new Map<string, PropFlags>();
  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select(SELECT_FIELDS)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return {
        rows: countsToRows(new Map()),
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldAmenityPropertyRows(byProp, data as unknown as CampspotAmenityPropertiesAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return { rows: countsToRows(byProp), rowsScanned, error: null };
}

export async function getCampspotAmenityPropertiesChartData(): Promise<CampspotAmenityPropertiesChartResult> {
  return fetchCampspotAmenityPropertiesChartData(createServerClient());
}
