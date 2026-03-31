/**
 * Proximity queries against market tables for comps-v2 / fetchNearbyComps.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComparableProperty, SeasonalRates } from '@/lib/ai-report-builder/types';
import {
  getBoundingBox,
  haversineDistanceMiles,
  parseNum,
} from '@/lib/comps-v2/geo';

type AnyRow = Record<string, unknown>;

function pickFirstNumeric(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = parseNum(v);
    if (n != null) return n;
  }
  return null;
}

export type MarketRowMeta = {
  comp: ComparableProperty;
  source_row_id: string | null;
  property_type: string | null;
};

function rowToGlampingComp(
  r: AnyRow,
  lat: number,
  lng: number,
  radiusMiles: number,
  stateAbbr: string
): MarketRowMeta | null {
  const rLat = parseNum(r.lat);
  const rLon = parseNum(r.lon);
  if (rLat == null || rLon == null) return null;
  const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
  if (dist > radiusMiles) return null;
  const id = r.id != null ? String(r.id) : null;
  return {
    source_row_id: id,
    property_type: r.property_type != null ? String(r.property_type) : null,
    comp: {
      property_name: (r.property_name as string) ?? 'Unknown',
      city: (r.city as string) ?? '',
      state: (r.state as string) ?? stateAbbr,
      unit_type: (r.unit_type as string) ?? null,
      property_total_sites: parseNum(r.property_total_sites),
      quantity_of_units: parseNum(r.quantity_of_units),
      avg_retail_daily_rate: parseNum(r.rate_avg_retail_daily_rate),
      high_rate: null,
      low_rate: null,
      seasonal_rates: {
        winter_weekday: parseNum(r.rate_winter_weekday),
        winter_weekend: parseNum(r.rate_winter_weekend),
        spring_weekday: parseNum(r.rate_spring_weekday),
        spring_weekend: parseNum(r.rate_spring_weekend),
        summer_weekday: parseNum(r.rate_summer_weekday),
        summer_weekend: parseNum(r.rate_summer_weekend),
        fall_weekday: parseNum(r.rate_fall_weekday),
        fall_weekend: parseNum(r.rate_fall_weekend),
      } as SeasonalRates,
      operating_season_months: (r.operating_season_months as string) ?? null,
      url: (r.url as string) ?? null,
      description: (r.description as string) ?? null,
      distance_miles: Math.round(dist * 10) / 10,
      source_table: 'all_glamping_properties',
      geo_lat: rLat,
      geo_lng: rLon,
    },
  };
}

export async function fetchGlampingPropsNumeric(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateAbbr: string,
  radiusMiles: number,
  rowLimit: number
): Promise<MarketRowMeta[]> {
  const bb = getBoundingBox(lat, lng, radiusMiles);

  const { data, error } = await supabase
    .from('all_glamping_properties' as never)
    .select(
      'id, property_type, property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
        'rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend, ' +
        'rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, ' +
        'rate_fall_weekday, rate_fall_weekend, operating_season_months, url, description, lat, lon'
    )
    .eq('is_closed', 'No')
    .gte('lat', bb.minLat)
    .lte('lat', bb.maxLat)
    .gte('lon', bb.minLng)
    .lte('lon', bb.maxLng)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .order('id', { ascending: true })
    .limit(rowLimit);

  if (error || !data) {
    console.warn('[market-fetch] all_glamping_properties error:', error?.message);
    return [];
  }

  return (data as unknown as AnyRow[])
    .map((r) => rowToGlampingComp(r, lat, lng, radiusMiles, stateAbbr))
    .filter((x): x is MarketRowMeta => x !== null);
}

function stateColumnVariants(stateFullName: string, stateAbbr: string): string[] {
  const full = stateFullName.trim();
  const abbr = stateAbbr.trim().toUpperCase().slice(0, 2);
  return [...new Set([full, abbr].filter((s) => s.length > 0))];
}

export async function fetchHipcampComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateFullName: string,
  stateAbbr: string,
  radiusMiles: number,
  rowLimit: number
): Promise<MarketRowMeta[]> {
  const stateKeys = stateColumnVariants(stateFullName, stateAbbr);
  const { data, error } = await supabase
    .from('hipcamp' as never)
    .select(
      'property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
        'avg_retail_daily_rate_2025, high_rate_2025, low_rate_2025, ' +
        'occupancy_rate_2024, occupancy_rate_2025, occupancy_rate_2026, ' +
        'winter_weekday, winter_weekend, spring_weekday, spring_weekend, ' +
        'summer_weekday, summer_weekend, fall_weekday, fall_weekend, ' +
        'operating_season_months, url, description, lat, lon'
    )
    .in('state', stateKeys)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .order('property_name', { ascending: true })
    .order('lat', { ascending: true })
    .order('lon', { ascending: true })
    .limit(rowLimit);

  if (error || !data) {
    console.warn('[market-fetch] hipcamp error:', error?.message);
    return [];
  }

  return (data as unknown as AnyRow[])
    .map((r) => {
      const rLat = parseNum(r.lat);
      const rLon = parseNum(r.lon);
      if (rLat == null || rLon == null) return null;
      const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
      if (dist > radiusMiles) return null;
      return {
        source_row_id: null,
        property_type: null,
        comp: {
          property_name: (r.property_name as string) ?? 'Unknown',
          city: (r.city as string) ?? '',
          state: (r.state as string) ?? stateFullName,
          unit_type: (r.unit_type as string) ?? null,
          property_total_sites: parseNum(r.property_total_sites),
          quantity_of_units: parseNum(r.quantity_of_units),
          avg_retail_daily_rate: parseNum(r.avg_retail_daily_rate_2025),
          high_rate: parseNum(r.high_rate_2025),
          low_rate: parseNum(r.low_rate_2025),
          seasonal_rates: {
            winter_weekday: parseNum(r.winter_weekday),
            winter_weekend: parseNum(r.winter_weekend),
            spring_weekday: parseNum(r.spring_weekday),
            spring_weekend: parseNum(r.spring_weekend),
            summer_weekday: parseNum(r.summer_weekday),
            summer_weekend: parseNum(r.summer_weekend),
            fall_weekday: parseNum(r.fall_weekday),
            fall_weekend: parseNum(r.fall_weekend),
          } as SeasonalRates,
          operating_season_months: (r.operating_season_months as string) ?? null,
          url: (r.url as string) ?? null,
          description: (r.description as string) ?? null,
          distance_miles: Math.round(dist * 10) / 10,
          source_table: 'hipcamp',
          geo_lat: rLat,
          geo_lng: rLon,
          market_occupancy_rate: pickFirstNumeric(
            r.occupancy_rate_2026,
            r.occupancy_rate_2025,
            r.occupancy_rate_2024
          ),
        },
      } as MarketRowMeta;
    })
    .filter((x): x is MarketRowMeta => x !== null);
}

export async function fetchRoverpassComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateFullName: string,
  radiusMiles: number,
  rowLimit: number
): Promise<MarketRowMeta[]> {
  const bb = getBoundingBox(lat, lng, radiusMiles);

  const { data, error } = await supabase
    .from('all_roverpass_data_new' as never)
    .select(
      'id, property_type, property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
        'rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend, ' +
        'rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, ' +
        'rate_fall_weekday, rate_fall_weekend, operating_season_months, url, description, lat, lon, ' +
        'roverpass_occupancy_rate'
    )
    .eq('is_closed', 'No')
    .gte('lat', bb.minLat)
    .lte('lat', bb.maxLat)
    .gte('lon', bb.minLng)
    .lte('lon', bb.maxLng)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .order('id', { ascending: true })
    .limit(rowLimit);

  if (error || !data) {
    console.warn('[market-fetch] all_roverpass_data_new error:', error?.message);
    return [];
  }

  return (data as unknown as AnyRow[])
    .map((r) => {
      const rLat = parseNum(r.lat);
      const rLon = parseNum(r.lon);
      if (rLat == null || rLon == null) return null;
      const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
      if (dist > radiusMiles) return null;
      const id = r.id != null ? String(r.id) : null;
      return {
        source_row_id: id,
        property_type: r.property_type != null ? String(r.property_type) : null,
        comp: {
          property_name: (r.property_name as string) ?? 'Unknown',
          city: (r.city as string) ?? '',
          state: (r.state as string) ?? stateFullName,
          unit_type: (r.unit_type as string) ?? null,
          property_total_sites: parseNum(r.property_total_sites),
          quantity_of_units: parseNum(r.quantity_of_units),
          avg_retail_daily_rate: parseNum(r.rate_avg_retail_daily_rate),
          high_rate: null,
          low_rate: null,
          seasonal_rates: {
            winter_weekday: parseNum(r.rate_winter_weekday),
            winter_weekend: parseNum(r.rate_winter_weekend),
            spring_weekday: parseNum(r.rate_spring_weekday),
            spring_weekend: parseNum(r.rate_spring_weekend),
            summer_weekday: parseNum(r.rate_summer_weekday),
            summer_weekend: parseNum(r.rate_summer_weekend),
            fall_weekday: parseNum(r.rate_fall_weekday),
            fall_weekend: parseNum(r.rate_fall_weekend),
          } as SeasonalRates,
          operating_season_months: (r.operating_season_months as string) ?? null,
          url: (r.url as string) ?? null,
          description: (r.description as string) ?? null,
          distance_miles: Math.round(dist * 10) / 10,
          source_table: 'all_roverpass_data_new',
          geo_lat: rLat,
          geo_lng: rLon,
          market_occupancy_rate: parseNum(r.roverpass_occupancy_rate),
        },
      } as MarketRowMeta;
    })
    .filter((x): x is MarketRowMeta => x !== null);
}

export async function fetchCampspotComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateFullName: string,
  stateAbbr: string,
  radiusMiles: number,
  rowLimit: number
): Promise<MarketRowMeta[]> {
  const stateKeys = stateColumnVariants(stateFullName, stateAbbr);
  const { data, error } = await supabase
    .from('campspot' as never)
    .select(
      'property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
        'avg_retail_daily_rate_2025, high_rate_2025, low_rate_2025, ' +
        'occupancy_rate_2024, occupancy_rate_2025, occupancy_rate_2026, ' +
        'winter_weekday, winter_weekend, spring_weekday, spring_weekend, ' +
        'summer_weekday, summer_weekend, fall_weekday, fall_weekend, ' +
        'operating_season_months, url, description, lat, lon'
    )
    .in('state', stateKeys)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .order('property_name', { ascending: true })
    .order('lat', { ascending: true })
    .order('lon', { ascending: true })
    .limit(rowLimit);

  if (error || !data) {
    console.warn('[market-fetch] campspot error:', error?.message);
    return [];
  }

  return (data as unknown as AnyRow[])
    .map((r) => {
      const rLat = parseNum(r.lat);
      const rLon = parseNum(r.lon);
      if (rLat == null || rLon == null) return null;
      const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
      if (dist > radiusMiles) return null;
      return {
        source_row_id: null,
        property_type: null,
        comp: {
          property_name: (r.property_name as string) ?? 'Unknown',
          city: (r.city as string) ?? '',
          state: (r.state as string) ?? stateFullName,
          unit_type: (r.unit_type as string) ?? null,
          property_total_sites: parseNum(r.property_total_sites),
          quantity_of_units: parseNum(r.quantity_of_units),
          avg_retail_daily_rate: parseNum(r.avg_retail_daily_rate_2025),
          high_rate: parseNum(r.high_rate_2025),
          low_rate: parseNum(r.low_rate_2025),
          seasonal_rates: {
            winter_weekday: parseNum(r.winter_weekday),
            winter_weekend: parseNum(r.winter_weekend),
            spring_weekday: parseNum(r.spring_weekday),
            spring_weekend: parseNum(r.spring_weekend),
            summer_weekday: parseNum(r.summer_weekday),
            summer_weekend: parseNum(r.summer_weekend),
            fall_weekday: parseNum(r.fall_weekday),
            fall_weekend: parseNum(r.fall_weekend),
          } as SeasonalRates,
          operating_season_months: (r.operating_season_months as string) ?? null,
          url: (r.url as string) ?? null,
          description: (r.description as string) ?? null,
          distance_miles: Math.round(dist * 10) / 10,
          source_table: 'campspot',
          geo_lat: rLat,
          geo_lng: rLon,
          market_occupancy_rate: pickFirstNumeric(
            r.occupancy_rate_2026,
            r.occupancy_rate_2025,
            r.occupancy_rate_2024
          ),
        },
      } as MarketRowMeta;
    })
    .filter((x): x is MarketRowMeta => x !== null);
}
