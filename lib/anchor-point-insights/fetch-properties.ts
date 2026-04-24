/**
 * Fetch and normalize properties from Hipcamp and all_glamping_properties
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedProperty } from './types';
import { MAX_PER_TABLE } from './constants';
import { parseNum, parseCoord, normalizeState, fetchAllRows } from './utils';

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
      'all_glamping_properties',
      'id, property_name, lat, lon, state, property_type, property_total_sites, quantity_of_units, unit_type, is_glamping_property, rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, roverpass_occupancy_rate, roverpass_occupancy_year',
      { notNull: ['lat', 'lon'], neq: [{ col: 'is_open', val: 'No' }] },
      MAX_PER_TABLE
    ),
  ]);

  const normalized: NormalizedProperty[] = [];

  for (const r of hipcampRows) {
    const lat = parseCoord(r.lat);
    const lon = parseCoord(r.lon);
    if (lat === null || lon === null) continue;
    if (stateFilter && normalizeState(r.state as string | null | undefined) !== stateFilter) continue;
    normalized.push({
      source: 'hipcamp',
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
    normalized.push({
      source: 'sage_glamping',
      property_name: String(r.property_name || '').trim() || 'Unknown',
      state: r.state ? String(r.state).trim() : null,
      lat,
      lon,
      property_type: r.property_type ? String(r.property_type).trim() : null,
      property_total_sites: parseNum(r.property_total_sites),
      quantity_of_units: parseNum(r.quantity_of_units),
      unit_type: r.unit_type ? String(r.unit_type).trim() : null,
      is_glamping_property: r.is_glamping_property ? String(r.is_glamping_property).trim() : null,
      winter_weekday: parseNum(r.rate_winter_weekday),
      winter_weekend: parseNum(r.rate_winter_weekend),
      spring_weekday: parseNum(r.rate_spring_weekday),
      spring_weekend: parseNum(r.rate_spring_weekend),
      summer_weekday: parseNum(r.rate_summer_weekday),
      summer_weekend: parseNum(r.rate_summer_weekend),
      fall_weekday: parseNum(r.rate_fall_weekday),
      fall_weekend: parseNum(r.rate_fall_weekend),
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
