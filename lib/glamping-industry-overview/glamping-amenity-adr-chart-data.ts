/**
 * Mean 2025 ARDR by qualifying glamping site row, split with vs without each amenity.
 * Uses the same amenity keys as Amenities by Property (Glamping).
 */

import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { meanRounded } from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  parseCampspotAdr2025FromAnnualColumn,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import { campspotTruthyAmenity } from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';
import {
  GLAMPING_AMENITY_PROPERTY_CHART_KEYS,
  rowPassesGlampingAmenityCohort,
  type GlampingAmenityPropertiesAggRow,
  type GlampingAmenityPropertyChartKey,
} from '@/lib/glamping-industry-overview/glamping-amenity-properties-chart-data';

export {
  GLAMPING_AMENITY_PROPERTY_CHART_KEYS as GLAMPING_AMENITY_ADR_CHART_KEYS,
  GLAMPING_AMENITY_PROPERTY_CHART_KEYS_SAGE as GLAMPING_AMENITY_ADR_CHART_KEYS_SAGE,
} from '@/lib/glamping-industry-overview/glamping-amenity-properties-chart-data';

export type GlampingAmenityAdrAggRow = GlampingAmenityPropertiesAggRow;

export type GlampingAmenityAdrChartRow = {
  amenityKey: GlampingAmenityPropertyChartKey;
  avgWithout: number | null;
  avgWith: number | null;
  nWithout: number;
  nWith: number;
  diffRounded: number | null;
};

export type GlampingAmenityAdrChartResult = {
  rows: GlampingAmenityAdrChartRow[];
  rowsScanned: number;
  error: string | null;
};

type PairBuckets = { with: number[]; without: number[] };

function emptyPairBuckets(): Record<GlampingAmenityPropertyChartKey, PairBuckets> {
  return {
    unit_hot_tub: { with: [], without: [] },
    property_hot_tub: { with: [], without: [] },
    unit_sauna: { with: [], without: [] },
    property_sauna: { with: [], without: [] },
    pool: { with: [], without: [] },
    hot_tub_sauna: { with: [], without: [] },
  };
}

function adr2025ForRow(row: GlampingAmenityAdrAggRow): number | null {
  return parseCampspotAdr2025FromAnnualColumn(row);
}

function amenityPresent(row: GlampingAmenityAdrAggRow, key: GlampingAmenityPropertyChartKey): boolean {
  return campspotTruthyAmenity(row[key]);
}

export function rowContributesToGlampingAmenityAdr(row: GlampingAmenityAdrAggRow): boolean {
  if (!rowPassesGlampingAmenityCohort(row)) return false;
  const stateAbbr = normalizeState(row.state);
  if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) return false;
  const adr = adr2025ForRow(row);
  return adr != null && passesStandardCampspotRetailRateUsd(adr);
}

export function createGlampingAmenityAdrFoldState(): Record<
  GlampingAmenityPropertyChartKey,
  PairBuckets
> {
  return emptyPairBuckets();
}

export function foldGlampingAmenityAdrRows(
  buckets: Record<GlampingAmenityPropertyChartKey, PairBuckets>,
  rows: GlampingAmenityAdrAggRow[]
): void {
  for (const row of rows) {
    if (!rowContributesToGlampingAmenityAdr(row)) continue;

    const adr = adr2025ForRow(row)!;

    for (const key of GLAMPING_AMENITY_PROPERTY_CHART_KEYS) {
      const b = buckets[key];
      if (amenityPresent(row, key)) {
        b.with.push(adr);
      } else {
        b.without.push(adr);
      }
    }
  }
}

function bucketsToRows(
  buckets: Record<GlampingAmenityPropertyChartKey, PairBuckets>
): GlampingAmenityAdrChartRow[] {
  return GLAMPING_AMENITY_PROPERTY_CHART_KEYS.map((amenityKey) => {
    const b = buckets[amenityKey];
    const avgWithout = meanRounded(b.without);
    const avgWith = meanRounded(b.with);
    let diffRounded: number | null = null;
    if (avgWithout != null && avgWith != null) {
      diffRounded = Math.round(avgWith - avgWithout);
    }
    return {
      amenityKey,
      avgWithout,
      avgWith,
      nWithout: b.without.length,
      nWith: b.with.length,
      diffRounded,
    };
  });
}

export function finalizeGlampingAmenityAdrFoldState(
  buckets: Record<GlampingAmenityPropertyChartKey, PairBuckets>
): GlampingAmenityAdrChartRow[] {
  return bucketsToRows(buckets);
}

export function aggregateGlampingRowsToAmenityAdrChart(
  rows: GlampingAmenityAdrAggRow[]
): GlampingAmenityAdrChartRow[] {
  const buckets = emptyPairBuckets();
  foldGlampingAmenityAdrRows(buckets, rows);
  return bucketsToRows(buckets);
}
