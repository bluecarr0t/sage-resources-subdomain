/**
 * Regional mean ADR and occupancy (2025 columns). Used by map fold types and tests.
 * Production data uses unified page scan in `campspot-rv-overview-page-data.ts`.
 */

import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  meanRounded,
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import {
  type RvIndustryRegionId,
  RV_INDUSTRY_REGION_IDS,
  getRvIndustryRegionForStateAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';

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
    if (
      adr == null ||
      occ == null ||
      !passesStandardCampspotRetailRateUsd(adr) ||
      !passesStandardCampspotOccupancyPercent(occ)
    )
      continue;

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
