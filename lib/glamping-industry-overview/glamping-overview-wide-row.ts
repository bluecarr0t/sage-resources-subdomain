/**
 * Map Hipcamp + Sage (`all_sage_data`) rows into the RV overview wide shape
 * so existing chart fold functions apply unchanged.
 */

import type { RvOverviewWideRow } from '@/lib/rv-industry-overview/rv-overview-wide-row';
import { sageRetailRateFieldsForOverview } from '@/lib/glamping-industry-overview/sage-retail-rate-by-year';

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

/**
 * Map Hipcamp annual occupancy columns independently so 2024-only charts (size impact,
 * trends 2024) still see `occupancy_rate_2024` when 2025/2026 is also populated.
 */
function occupancyFields(row: Record<string, unknown>): {
  occupancy_rate_2025: string | null;
  occupancy_rate_2024: string | null;
} {
  const o2026 = row.occupancy_rate_2026;
  const o2025 = row.occupancy_rate_2025;
  const o2024 = row.occupancy_rate_2024;
  const occ = row.occupancy;

  const occupancy_rate_2024 =
    o2024 != null && o2024 !== '' ? String(o2024) : null;

  let occupancy_rate_2025: string | null = null;
  if (o2026 != null && o2026 !== '') {
    occupancy_rate_2025 = String(o2026);
  } else if (o2025 != null && o2025 !== '') {
    occupancy_rate_2025 = String(o2025);
  } else if (occ != null && occ !== '') {
    occupancy_rate_2025 = String(occ);
  }

  return { occupancy_rate_2025, occupancy_rate_2024 };
}

function retailRateFields(row: Record<string, unknown>): {
  avg_retail_daily_rate_2025: string | null;
  avg_retail_daily_rate_2024: string | null;
} {
  const r2025 =
    row.avg_retail_daily_rate_2025 ?? row.rate_avg_retail_daily_rate ?? row.rate_avg;
  const r2024 = row.avg_retail_daily_rate_2024;
  return {
    avg_retail_daily_rate_2025: toOverviewField(r2025),
    avg_retail_daily_rate_2024: toOverviewField(r2024),
  };
}

export function normalizeHipcampRowToGlampingOverviewWide(
  row: Record<string, unknown>
): RvOverviewWideRow {
  const occ = occupancyFields(row);
  const rates = retailRateFields(row);
  const description =
    toOverviewField(row.description) ?? toOverviewField(row.site_name);

  return {
    state: toOverviewField(row.state),
    city: toOverviewField(row.city),
    property_name: toOverviewField(row.property_name),
    unit_type: toOverviewField(row.unit_type),
    description,
    quantity_of_units: toOverviewField(row.quantity_of_units),
    property_total_sites: toOverviewField(row.property_total_sites),
    ...rates,
    ...occ,
    winter_weekday: toOverviewField(row.winter_weekday),
    winter_weekend: toOverviewField(row.winter_weekend),
    spring_weekday: toOverviewField(row.spring_weekday),
    spring_weekend: toOverviewField(row.spring_weekend),
    summer_weekday: toOverviewField(row.summer_weekday),
    summer_weekend: toOverviewField(row.summer_weekend),
    fall_weekday: toOverviewField(row.fall_weekday),
    fall_weekend: toOverviewField(row.fall_weekend),
    rv_surface_type: toOverviewField(row.rv_surface_type),
    rv_parking: toOverviewField(row.rv_parking),
    unit_hot_tub: null,
    property_hot_tub: null,
    unit_sauna: null,
    property_sauna: null,
    hot_tub_sauna: toOverviewField(row.hot_tub_sauna),
    pool: toOverviewField(row.pool),
    electrical_hook_up: toOverviewField(row.electrical_hook_up),
    sewer_hook_up: toOverviewField(row.sewer_hook_up),
    water_hookup: toOverviewField(row.water_hookup),
  };
}

export function normalizeSageRowToGlampingOverviewWide(
  row: Record<string, unknown>
): RvOverviewWideRow {
  const occ = occupancyFields(row);
  const rates = sageRetailRateFieldsForOverview(row);
  const description =
    toOverviewField(row.description) ?? toOverviewField(row.site_name);

  return {
    state: toOverviewField(row.state),
    city: toOverviewField(row.city),
    property_name: toOverviewField(row.property_name),
    unit_type: toOverviewField(row.unit_type),
    description,
    quantity_of_units: toOverviewField(row.quantity_of_units),
    property_total_sites: toOverviewField(row.property_total_sites),
    ...rates,
    ...occ,
    winter_weekday: toOverviewField(row.rate_winter_weekday ?? row.winter_weekday),
    winter_weekend: toOverviewField(row.rate_winter_weekend ?? row.winter_weekend),
    spring_weekday: toOverviewField(row.rate_spring_weekday ?? row.spring_weekday),
    spring_weekend: toOverviewField(row.rate_spring_weekend ?? row.spring_weekend),
    summer_weekday: toOverviewField(row.rate_summer_weekday ?? row.summer_weekday),
    summer_weekend: toOverviewField(row.rate_summer_weekend ?? row.summer_weekend),
    fall_weekday: toOverviewField(row.rate_fall_weekday ?? row.fall_weekday),
    fall_weekend: toOverviewField(row.rate_fall_weekend ?? row.fall_weekend),
    rv_surface_type: toOverviewField(row.rv_surface_type),
    rv_parking: toOverviewField(row.rv_parking),
    unit_hot_tub: toOverviewField(row.unit_hot_tub),
    property_hot_tub: toOverviewField(row.property_hot_tub),
    unit_sauna: toOverviewField(row.unit_sauna),
    property_sauna: toOverviewField(row.property_sauna),
    hot_tub_sauna: null,
    pool: toOverviewField(row.property_pool ?? row.pool),
    electrical_hook_up: toOverviewField(row.rv_electrical_hook_up),
    sewer_hook_up: toOverviewField(row.rv_sewer_hook_up),
    water_hookup: toOverviewField(row.rv_water_hookup),
  };
}

/** Hipcamp columns for unified overview scan (amenity names + annual fields). */
export const HIPCAMP_GLAMPING_OVERVIEW_SELECT =
  'id, state, city, property_name, site_name, country, property_type, unit_type, property_total_sites, quantity_of_units, ' +
  'description, avg_retail_daily_rate_2024, avg_retail_daily_rate_2025, ' +
  'winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, fall_weekday, fall_weekend, ' +
  'occupancy_rate_2024, occupancy_rate_2025, occupancy_rate_2026, ' +
  'rv_surface_type, rv_parking, electrical_hook_up, sewer_hook_up, water_hookup, ' +
  'pool, hot_tub_sauna';

/** Sage glamping table columns for overview scan. */
export const SAGE_GLAMPING_OVERVIEW_SELECT =
  'id, state, city, country, property_name, site_name, property_type, unit_type, property_total_sites, quantity_of_units, ' +
  'rate_avg_retail_daily_rate, rate_unit_rates_by_year, rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, ' +
  'rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, ' +
  'rv_surface_type, rv_parking, rv_electrical_hook_up, rv_sewer_hook_up, rv_water_hookup, ' +
  'unit_hot_tub, property_hot_tub, unit_sauna, property_sauna, property_pool';
