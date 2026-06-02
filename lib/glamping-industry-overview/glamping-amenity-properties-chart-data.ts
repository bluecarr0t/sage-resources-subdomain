/**
 * % of distinct glamping properties with each amenity (Sage unit vs property flags + Hipcamp combined).
 */

import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';
import { parseCampspotOccupancyPercent } from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  parseCampspotAdr2025FromAnnualColumn,
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import {
  campspotTruthyAmenity,
  type CampspotAmenityPropertiesAggRow,
} from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';

/** Hipcamp needs paired 2025 occ + ARDR; Sage may contribute with ARDR only. */
export function rowPassesGlampingAmenityCohort(row: GlampingAmenityPropertiesAggRow): boolean {
  const adr = parseCampspotAdr2025FromAnnualColumn(row);
  if (adr == null || !passesStandardCampspotRetailRateUsd(adr)) return false;
  const occ = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
  if (occ == null) return true;
  return passesStandardCampspotOccupancyPercent(occ);
}

export const GLAMPING_AMENITY_PROPERTY_CHART_KEYS = [
  'unit_hot_tub',
  'property_hot_tub',
  'unit_sauna',
  'property_sauna',
  'pool',
  /** Hipcamp `hot_tub_sauna` column only — not used for Sage rows. */
  'hot_tub_sauna',
] as const;

/** Sage + pool view: omit Hipcamp-only combined hot tub / sauna bar. */
export const GLAMPING_AMENITY_PROPERTY_CHART_KEYS_SAGE = [
  'unit_hot_tub',
  'property_hot_tub',
  'unit_sauna',
  'property_sauna',
  'pool',
] as const;

export type GlampingAmenityPropertyChartKey = (typeof GLAMPING_AMENITY_PROPERTY_CHART_KEYS)[number];

/** Same wide-row amenity fields as RV overview (`unit_hot_tub`, etc. optional on Campspot). */
export type GlampingAmenityPropertiesAggRow = CampspotAmenityPropertiesAggRow;

export type GlampingAmenityPropertyPctRow = {
  amenityKey: GlampingAmenityPropertyChartKey;
  pct: number | null;
  nProperties: number;
  nWithAmenity: number;
};

export type GlampingAmenityPropertiesChartResult = {
  rows: GlampingAmenityPropertyPctRow[];
  rowsScanned: number;
  error: string | null;
};

type PropFlags = Record<GlampingAmenityPropertyChartKey, boolean>;

function propertyGroupKey(row: GlampingAmenityPropertiesAggRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

function emptyFlags(): PropFlags {
  return {
    unit_hot_tub: false,
    property_hot_tub: false,
    unit_sauna: false,
    property_sauna: false,
    pool: false,
    hot_tub_sauna: false,
  };
}

export function createGlampingAmenityPropertiesFoldState(): Map<string, PropFlags> {
  return new Map();
}

export function foldGlampingAmenityPropertyRows(
  byProp: Map<string, PropFlags>,
  rows: GlampingAmenityPropertiesAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    if (!rowPassesGlampingAmenityCohort(row)) continue;

    const pk = propertyGroupKey(row);
    if (!pk) continue;

    let f = byProp.get(pk);
    if (!f) {
      f = emptyFlags();
      byProp.set(pk, f);
    }

    f.unit_hot_tub = f.unit_hot_tub || campspotTruthyAmenity(row.unit_hot_tub);
    f.property_hot_tub = f.property_hot_tub || campspotTruthyAmenity(row.property_hot_tub);
    f.unit_sauna = f.unit_sauna || campspotTruthyAmenity(row.unit_sauna);
    f.property_sauna = f.property_sauna || campspotTruthyAmenity(row.property_sauna);
    f.pool = f.pool || campspotTruthyAmenity(row.pool);
    f.hot_tub_sauna = f.hot_tub_sauna || campspotTruthyAmenity(row.hot_tub_sauna);
  }
}

function pctOneDecimal(nWith: number, nTotal: number): number | null {
  if (nTotal <= 0) return null;
  return Math.round((1000 * nWith) / nTotal) / 10;
}

export function finalizeGlampingAmenityPropertiesFoldState(
  byProp: Map<string, PropFlags>
): GlampingAmenityPropertyPctRow[] {
  const nProperties = byProp.size;
  if (nProperties === 0) {
    return GLAMPING_AMENITY_PROPERTY_CHART_KEYS.map((amenityKey) => ({
      amenityKey,
      pct: null,
      nProperties: 0,
      nWithAmenity: 0,
    }));
  }

  const nWith: Record<GlampingAmenityPropertyChartKey, number> = {
    unit_hot_tub: 0,
    property_hot_tub: 0,
    unit_sauna: 0,
    property_sauna: 0,
    pool: 0,
    hot_tub_sauna: 0,
  };

  for (const f of byProp.values()) {
    for (const key of GLAMPING_AMENITY_PROPERTY_CHART_KEYS) {
      if (f[key]) nWith[key] += 1;
    }
  }

  return GLAMPING_AMENITY_PROPERTY_CHART_KEYS.map((amenityKey) => ({
    amenityKey,
    pct: pctOneDecimal(nWith[amenityKey], nProperties),
    nProperties,
    nWithAmenity: nWith[amenityKey],
  }));
}
