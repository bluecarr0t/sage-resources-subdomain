/**
 * Canonical wide row shape for RV Industry Overview folds (Campspot + RoverPass).
 */

import type { CampspotAmenityAdrAggRow } from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';
import type { CampspotAmenityPropertiesAggRow } from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import type { CampspotRvMapAggRow } from '@/lib/rv-industry-overview/campspot-rv-map-data';
import type { CampspotRvParkingAggRow } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import type { CampspotSeasonRatesAggRow } from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';
import type { CampspotSizeTierAggRow } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import type { CampspotSurfaceRatesAggRow } from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';
import type { CampspotTrendsAggRow } from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import type { CampspotUnitTypeAggRow } from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';

export type RvOverviewWideRow = CampspotRvMapAggRow &
  CampspotTrendsAggRow &
  CampspotSizeTierAggRow &
  CampspotUnitTypeAggRow &
  CampspotSeasonRatesAggRow &
  CampspotSurfaceRatesAggRow &
  CampspotAmenityPropertiesAggRow &
  CampspotAmenityAdrAggRow &
  CampspotRvParkingAggRow;

function toOverviewField(val: unknown): string | null {
  if (val == null || val === '') return null;
  return String(val);
}

function truthyAmenityFlag(val: unknown): boolean {
  if (val == null || val === '') return false;
  const s = String(val).trim().toLowerCase();
  if (!s || s === 'no data') return false;
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
}

function roverpassHotTubSauna(row: Record<string, unknown>): string | null {
  if (
    truthyAmenityFlag(row.property_hot_tub) ||
    truthyAmenityFlag(row.property_sauna) ||
    truthyAmenityFlag(row.unit_hot_tub) ||
    truthyAmenityFlag(row.unit_sauna) ||
    truthyAmenityFlag(row.unit_hot_tub_or_sauna)
  ) {
    return 'Yes';
  }
  return null;
}

/**
 * Map `all_roverpass_data_new` unified columns into the same wide shape as Campspot rows.
 * RoverPass has a single retail rate and occupancy (no 2024 annual pair); 2024 fields stay null.
 */
export function normalizeRoverpassRowToOverviewWide(
  row: Record<string, unknown>
): RvOverviewWideRow {
  const occYear =
    row.roverpass_occupancy_year != null ? Math.round(Number(row.roverpass_occupancy_year)) : null;
  const occ = row.roverpass_occupancy_rate;

  let occupancy_rate_2025: string | null = null;
  let occupancy_rate_2024: string | null = null;
  if (occ != null && occ !== '') {
    const occStr = String(occ);
    if (occYear === 2024) {
      // RoverPass has one occupancy snapshot; preserve 2024 for YoY gates that need annual 2024.
      occupancy_rate_2024 = occStr;
      // 2025-only charts (regional map labels, trends 2025 bucket) still need a 2025 column.
      occupancy_rate_2025 = occStr;
    } else {
      occupancy_rate_2025 = occStr;
    }
  }

  const description =
    toOverviewField(row.description) ?? toOverviewField(row.unit_description);

  return {
    state: toOverviewField(row.state),
    city: toOverviewField(row.city),
    property_name: toOverviewField(row.property_name),
    unit_type: toOverviewField(row.unit_type),
    description,
    quantity_of_units: toOverviewField(row.quantity_of_units),
    property_total_sites: toOverviewField(row.property_total_sites),
    avg_retail_daily_rate_2025: toOverviewField(row.rate_avg_retail_daily_rate),
    avg_retail_daily_rate_2024: null,
    occupancy_rate_2025,
    occupancy_rate_2024,
    winter_weekday: toOverviewField(row.rate_winter_weekday),
    winter_weekend: toOverviewField(row.rate_winter_weekend),
    spring_weekday: toOverviewField(row.rate_spring_weekday),
    spring_weekend: toOverviewField(row.rate_spring_weekend),
    summer_weekday: toOverviewField(row.rate_summer_weekday),
    summer_weekend: toOverviewField(row.rate_summer_weekend),
    fall_weekday: toOverviewField(row.rate_fall_weekday),
    fall_weekend: toOverviewField(row.rate_fall_weekend),
    rv_surface_type: toOverviewField(row.rv_surface_type),
    rv_parking: toOverviewField(row.rv_parking),
    hot_tub_sauna: roverpassHotTubSauna(row),
    pool: toOverviewField(row.property_pool),
    electrical_hook_up: toOverviewField(row.rv_electrical_hook_up),
    sewer_hook_up: toOverviewField(row.rv_sewer_hook_up),
    water_hookup: toOverviewField(row.rv_water_hookup),
  };
}

/** Columns selected from `all_roverpass_data_new` for overview normalization. */
export const ROVERPASS_RV_OVERVIEW_PAGE_SELECT =
  'state, city, property_name, unit_type, description, unit_description, quantity_of_units, property_total_sites, ' +
  'rate_avg_retail_daily_rate, roverpass_occupancy_rate, roverpass_occupancy_year, ' +
  'rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, ' +
  'rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, ' +
  'rv_surface_type, rv_parking, ' +
  'property_hot_tub, property_sauna, unit_hot_tub, unit_sauna, unit_hot_tub_or_sauna, ' +
  'property_pool, rv_electrical_hook_up, rv_sewer_hook_up, rv_water_hookup';
