/**
 * Fetch and normalize properties from Hipcamp and all_sage_data
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedProperty } from './types';
import { MAX_PER_TABLE } from './constants';
import { parseNum, parseCoord, normalizeState, fetchAllRows } from './utils';
import {
  buildSeasonClosedFlags,
  parseSeasonRateNumeric,
  type SeasonRateKey,
} from '@/lib/glamping-seasonal-rate';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';

const EMPTY_SEASON_CLOSED = {} as const;

function sageSeasonRates(r: Record<string, unknown>): {
  season_closed: ReturnType<typeof buildSeasonClosedFlags>;
  rates: Record<SeasonRateKey, number | null>;
} {
  const season_closed = buildSeasonClosedFlags(r, 'rate_');
  const rates = {
    winter_weekday: parseSeasonRateNumeric(r.rate_winter_weekday),
    winter_weekend: parseSeasonRateNumeric(r.rate_winter_weekend),
    spring_weekday: parseSeasonRateNumeric(r.rate_spring_weekday),
    spring_weekend: parseSeasonRateNumeric(r.rate_spring_weekend),
    summer_weekday: parseSeasonRateNumeric(r.rate_summer_weekday),
    summer_weekend: parseSeasonRateNumeric(r.rate_summer_weekend),
    fall_weekday: parseSeasonRateNumeric(r.rate_fall_weekday),
    fall_weekend: parseSeasonRateNumeric(r.rate_fall_weekend),
  };
  return { season_closed, rates };
}

export async function fetchAndNormalizeProperties(
  supabase: SupabaseClient,
  stateFilter: string | null
): Promise<NormalizedProperty[]> {
  const [hipcampRows, glampingRows] = await Promise.all([
    fetchAllRows<Record<string, unknown>>(
      supabase,
      'hipcamp',
      'id, property_name, lat, lon, state, unit_type, property_type, property_total_sites, quantity_of_units, winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, fall_weekday, fall_weekend, occupancy_rate_2024, occupancy_rate_2025, occupancy_rate_2026, avg_retail_daily_rate_2024, avg_retail_daily_rate_2025',
      { notNull: ['lat', 'lon'] },
      MAX_PER_TABLE
    ),
    fetchAllRows<Record<string, unknown>>(
      supabase,
      'all_sage_data',
      'id, property_name, lat, lon, state, property_type, property_total_sites, quantity_of_units, unit_type, is_glamping_property, rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, roverpass_occupancy_rate, roverpass_occupancy_year',
      {
        notNull: ['lat', 'lon'],
        neq: [
          { col: 'is_open', val: 'Closed' },
          { col: 'is_open', val: 'Temporarily closed' },
          { col: 'is_open', val: 'Under Construction' },
          { col: 'is_open', val: 'Proposed Development' },
        ],
        or: PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR,
      },
      MAX_PER_TABLE
    ),
  ]);

  const normalized: NormalizedProperty[] = [];

  for (const r of hipcampRows) {
    const lat = parseCoord(r.lat);
    const lon = parseCoord(r.lon);
    if (lat === null || lon === null) continue;
    if (stateFilter && normalizeState(r.state as string | null | undefined) !== stateFilter) continue;
    const hipcampId = parseNum(r.id);
    if (hipcampId == null) continue;
    normalized.push({
      source: 'hipcamp',
      source_row_id: hipcampId,
      property_name: String(r.property_name || '').trim() || 'Unknown',
      state: r.state ? String(r.state).trim() : null,
      lat,
      lon,
      property_type: r.property_type ? String(r.property_type).trim() : null,
      property_total_sites: parseNum(r.property_total_sites),
      quantity_of_units: parseNum(r.quantity_of_units),
      unit_type: r.unit_type ? String(r.unit_type).trim() : null,
      winter_weekday: parseNum(r.winter_weekday),
      winter_weekend: parseNum(r.winter_weekend),
      spring_weekday: parseNum(r.spring_weekday),
      spring_weekend: parseNum(r.spring_weekend),
      summer_weekday: parseNum(r.summer_weekday),
      summer_weekend: parseNum(r.summer_weekend),
      fall_weekday: parseNum(r.fall_weekday),
      fall_weekend: parseNum(r.fall_weekend),
      season_closed: EMPTY_SEASON_CLOSED,
      occupancy_2024: parseNum(r.occupancy_rate_2024),
      occupancy_2025: parseNum(r.occupancy_rate_2025),
      occupancy_2026: parseNum(r.occupancy_rate_2026),
      avg_rate_2024: parseNum(r.avg_retail_daily_rate_2024),
      avg_rate_2025: parseNum(r.avg_retail_daily_rate_2025),
      avg_rate_2026: null,
    });
  }

  for (const r of glampingRows) {
    const lat = parseCoord(r.lat);
    const lon = parseCoord(r.lon);
    if (lat === null || lon === null) continue;
    if (stateFilter && normalizeState(r.state as string | null | undefined) !== stateFilter) continue;
    const occ = parseNum(r.roverpass_occupancy_rate);
    const occYear = r.roverpass_occupancy_year != null ? Math.round(Number(r.roverpass_occupancy_year)) : null;
    // Use occupancy only for the year it applies; avoid misleading YoY trends when same value used for all years
    const occ2024 = occYear === 2024 || occYear == null ? occ : null;
    const occ2025 = occYear === 2025 ? occ : null;
    const occ2026 = occYear === 2026 ? occ : null;
    const glampingId = parseNum(r.id);
    if (glampingId == null) continue;
    const { season_closed, rates } = sageSeasonRates(r);
    normalized.push({
      source: 'sage_glamping',
      source_row_id: glampingId,
      property_name: String(r.property_name || '').trim() || 'Unknown',
      state: r.state ? String(r.state).trim() : null,
      lat,
      lon,
      property_type: r.property_type ? String(r.property_type).trim() : null,
      property_total_sites: parseNum(r.property_total_sites),
      quantity_of_units: parseNum(r.quantity_of_units),
      unit_type: r.unit_type ? String(r.unit_type).trim() : null,
      is_glamping_property: r.is_glamping_property ? String(r.is_glamping_property).trim() : null,
      ...rates,
      season_closed,
      occupancy_2024: occ2024,
      occupancy_2025: occ2025,
      occupancy_2026: occ2026,
      avg_rate_2024: null,
      avg_rate_2025: null,
      avg_rate_2026: null,
    });
  }

  return normalized;
}
