/**
 * Regional mean ADR and occupancy from campspot (2025 columns only).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  meanRounded,
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import {
  type RvIndustryRegionId,
  RV_INDUSTRY_REGION_IDS,
  getRvIndustryRegionForStateAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';

const PAGE_SIZE = 1000;

export type RegionalAggregateRow = {
  regionId: RvIndustryRegionId;
  meanAdr: number | null;
  meanOccupancyPct: number | null;
  siteCount: number;
};

export type CampspotRegionalAggregatesResult = {
  byRegion: Record<RvIndustryRegionId, RegionalAggregateRow>;
  rowsScanned: number;
  error: string | null;
};

export type CampspotAggRow = {
  state: string | null;
  avg_retail_daily_rate_2025: string | null;
  occupancy_rate_2025: string | null;
};

function emptyAccum(): Record<RvIndustryRegionId, { adr: number[]; occ: number[] }> {
  return {
    west: { adr: [], occ: [] },
    southwest: { adr: [], occ: [] },
    midwest: { adr: [], occ: [] },
    southeast: { adr: [], occ: [] },
    northeast: { adr: [], occ: [] },
  };
}

function foldCampspotRows(
  accum: Record<RvIndustryRegionId, { adr: number[]; occ: number[] }>,
  rows: CampspotAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr) continue;

    const regionId = getRvIndustryRegionForStateAbbr(stateAbbr);
    if (!regionId) continue;

    const adr = parseCampspotNumber(row.avg_retail_daily_rate_2025);
    const occ = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
    if (adr == null || adr <= 0 || occ == null) continue;

    const bucket = accum[regionId];
    bucket.adr.push(adr);
    bucket.occ.push(occ);
  }
}

function accumToByRegion(
  accum: Record<RvIndustryRegionId, { adr: number[]; occ: number[] }>
): Record<RvIndustryRegionId, RegionalAggregateRow> {
  const byRegion = {} as Record<RvIndustryRegionId, RegionalAggregateRow>;
  for (const id of RV_INDUSTRY_REGION_IDS) {
    const { adr, occ } = accum[id];
    const n = adr.length;
    byRegion[id] = {
      regionId: id,
      meanAdr: meanRounded(adr),
      meanOccupancyPct: meanRounded(occ),
      siteCount: n,
    };
  }
  return byRegion;
}

/** Pure aggregation for tests and reuse */
export function aggregateCampspotRowsToRegions(
  rows: CampspotAggRow[]
): Record<RvIndustryRegionId, RegionalAggregateRow> {
  const accum = emptyAccum();
  foldCampspotRows(accum, rows);
  return accumToByRegion(accum);
}

export async function fetchCampspotRegionalAggregates(
  supabase: SupabaseClient
): Promise<CampspotRegionalAggregatesResult> {
  const accum = emptyAccum();
  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select('state, avg_retail_daily_rate_2025, occupancy_rate_2025')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return {
        byRegion: emptyByRegion(),
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldCampspotRows(accum, data as CampspotAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return { byRegion: accumToByRegion(accum), rowsScanned, error: null };
}

function emptyByRegion(): Record<RvIndustryRegionId, RegionalAggregateRow> {
  return RV_INDUSTRY_REGION_IDS.reduce(
    (acc, id) => {
      acc[id] = {
        regionId: id,
        meanAdr: null,
        meanOccupancyPct: null,
        siteCount: 0,
      };
      return acc;
    },
    {} as Record<RvIndustryRegionId, RegionalAggregateRow>
  );
}

/** Convenience for Server Components */
export async function getCampspotRegionalAggregates(): Promise<CampspotRegionalAggregatesResult> {
  return fetchCampspotRegionalAggregates(createServerClient());
}
