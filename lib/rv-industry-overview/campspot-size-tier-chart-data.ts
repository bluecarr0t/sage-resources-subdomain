/**
 * Resort size tiers vs occupancy & ADR (Campspot). 2024 full-year fields;
 * 2025 uses full-year avg_retail_daily_rate_2025 and occupancy_rate_2025 (not YTD rate).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import {
  meanRounded,
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';

const PAGE_SIZE = 1000;

export const SIZE_TIER_KEYS = ['large', 'medium', 'small'] as const;
export type SizeTierKey = (typeof SIZE_TIER_KEYS)[number];

export type SizeTierChartRow = {
  tierKey: SizeTierKey;
  occ2024: number | null;
  occ2025: number | null;
  adr2024: number | null;
  adr2025: number | null;
  n2024: number;
  n2025: number;
};

export type CampspotSizeTierChartResult = {
  rows: SizeTierChartRow[];
  rowsScanned: number;
  error: string | null;
};

export type CampspotSizeTierAggRow = {
  property_total_sites: string | null;
  quantity_of_units: string | null;
  occupancy_rate_2024: string | null;
  avg_retail_daily_rate_2024: string | null;
  occupancy_rate_2025: string | null;
  avg_retail_daily_rate_2025: string | null;
};

type Bucket = {
  occ2024: number[];
  adr2024: number[];
  occ2025: number[];
  adr2025: number[];
};

function parseSiteCount(propertyTotal: unknown, quantity: unknown): number | null {
  const a = parseCampspotNumber(propertyTotal);
  if (a != null && a >= 1) return Math.round(a);
  const b = parseCampspotNumber(quantity);
  if (b != null && b >= 1) return Math.round(b);
  return null;
}

/** Assign tier for chart buckets (exclusive ranges per reference chart). */
export function siteCountToSizeTier(sites: number): SizeTierKey | null {
  if (sites >= 100) return 'large';
  if (sites >= 50 && sites <= 99) return 'medium';
  if (sites >= 25 && sites <= 49) return 'small';
  return null;
}

function emptyBuckets(): Record<SizeTierKey, Bucket> {
  const b = (): Bucket => ({
    occ2024: [],
    adr2024: [],
    occ2025: [],
    adr2025: [],
  });
  return { large: b(), medium: b(), small: b() };
}

export function createSizeTierFoldState(): Record<SizeTierKey, Bucket> {
  return emptyBuckets();
}

export function foldSizeTierRows(buckets: Record<SizeTierKey, Bucket>, rows: CampspotSizeTierAggRow[]): void {
  for (const row of rows) {
    const nSites = parseSiteCount(row.property_total_sites, row.quantity_of_units);
    if (nSites == null) continue;
    const tier = siteCountToSizeTier(nSites);
    if (!tier) continue;

    const b = buckets[tier];

    const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
    const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
    if (
      o4 != null &&
      a4 != null &&
      passesStandardCampspotOccupancyPercent(o4) &&
      passesStandardCampspotRetailRateUsd(a4)
    ) {
      b.occ2024.push(o4);
      b.adr2024.push(a4);
    }

    const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
    const a5 = parseCampspotNumber(row.avg_retail_daily_rate_2025);
    if (
      o5 != null &&
      a5 != null &&
      passesStandardCampspotOccupancyPercent(o5) &&
      passesStandardCampspotRetailRateUsd(a5)
    ) {
      b.occ2025.push(o5);
      b.adr2025.push(a5);
    }
  }
}

export function finalizeSizeTierFoldState(buckets: Record<SizeTierKey, Bucket>): SizeTierChartRow[] {
  return bucketsToRows(buckets);
}

function bucketsToRows(buckets: Record<SizeTierKey, Bucket>): SizeTierChartRow[] {
  return SIZE_TIER_KEYS.map((tierKey) => {
    const b = buckets[tierKey];
    return {
      tierKey,
      occ2024: meanRounded(b.occ2024),
      occ2025: meanRounded(b.occ2025),
      adr2024: meanRounded(b.adr2024),
      adr2025: meanRounded(b.adr2025),
      n2024: b.occ2024.length,
      n2025: b.occ2025.length,
    };
  });
}

export function aggregateCampspotRowsToSizeTierChart(
  rows: CampspotSizeTierAggRow[]
): SizeTierChartRow[] {
  const buckets = emptyBuckets();
  foldSizeTierRows(buckets, rows);
  return bucketsToRows(buckets);
}

export async function fetchCampspotSizeTierChartData(
  supabase: SupabaseClient
): Promise<CampspotSizeTierChartResult> {
  const buckets = emptyBuckets();
  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select(
        'property_total_sites, quantity_of_units, ' +
          'occupancy_rate_2024, avg_retail_daily_rate_2024, ' +
          'occupancy_rate_2025, avg_retail_daily_rate_2025'
      )
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return {
        rows: bucketsToRows(emptyBuckets()),
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldSizeTierRows(buckets, data as unknown as CampspotSizeTierAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return { rows: bucketsToRows(buckets), rowsScanned, error: null };
}

export async function getCampspotSizeTierChartData(): Promise<CampspotSizeTierChartResult> {
  return fetchCampspotSizeTierChartData(createServerClient());
}
