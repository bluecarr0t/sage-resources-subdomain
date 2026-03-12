/**
 * Fetch comparable properties from Supabase by proximity.
 *
 * Glamping: all_glamping_properties + hipcamp
 * RV:      all_roverpass_data_new + campspot
 *
 * Uses Haversine distance, filtered by bounding box for performance.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComparableProperty, SeasonalRates } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRow = Record<string, any>;

const SEARCH_RADIUS_MILES = 150;
const MAX_COMPS = 10;
const DEG_PER_MILE_LAT = 1 / 69;
const DEG_PER_MILE_LNG = (lat: number) => 1 / (69 * Math.cos((lat * Math.PI) / 180));

const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function getBoundingBox(lat: number, lng: number, radiusMiles: number) {
  const dLat = radiusMiles * DEG_PER_MILE_LAT;
  const dLng = radiusMiles * DEG_PER_MILE_LNG(lat);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

function resolveStateName(stateInput: string): string {
  const upper = stateInput.trim().toUpperCase();
  if (upper.length === 2 && STATE_ABBR_TO_NAME[upper]) {
    return STATE_ABBR_TO_NAME[upper];
  }
  return stateInput.trim();
}

// ─── Glamping: all_glamping_properties (numeric lat/lon, abbreviation state) ──

async function fetchGlampingPropsNumeric(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateAbbr: string
): Promise<ComparableProperty[]> {
  const bb = getBoundingBox(lat, lng, SEARCH_RADIUS_MILES);

  const { data, error } = await supabase
    .from('all_glamping_properties' as any)
    .select(
      'property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
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
    .limit(200);

  if (error || !data) {
    console.warn('[fetch-comps] all_glamping_properties error:', error?.message);
    return [];
  }

  return (data as AnyRow[])
    .map((r) => {
      const rLat = parseNum(r.lat);
      const rLon = parseNum(r.lon);
      if (rLat == null || rLon == null) return null;
      const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
      if (dist > SEARCH_RADIUS_MILES) return null;
      return {
        property_name: r.property_name ?? 'Unknown',
        city: r.city ?? '',
        state: r.state ?? stateAbbr,
        unit_type: r.unit_type ?? null,
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
        operating_season_months: r.operating_season_months ?? null,
        url: r.url ?? null,
        description: r.description ?? null,
        distance_miles: Math.round(dist * 10) / 10,
        source_table: 'all_glamping_properties',
      } as ComparableProperty;
    })
    .filter((c) => c !== null) as ComparableProperty[];
}

// ─── Glamping: hipcamp (text lat/lon, full state name) ──

async function fetchHipcampComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateFullName: string
): Promise<ComparableProperty[]> {
  const { data, error } = await supabase
    .from('hipcamp' as any)
    .select(
      'property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
      'avg_retail_daily_rate_2025, high_rate_2025, low_rate_2025, ' +
      'winter_weekday, winter_weekend, spring_weekday, spring_weekend, ' +
      'summer_weekday, summer_weekend, fall_weekday, fall_weekend, ' +
      'operating_season_months, url, description, lat, lon'
    )
    .eq('state', stateFullName)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .limit(500);

  if (error || !data) {
    console.warn('[fetch-comps] hipcamp error:', error?.message);
    return [];
  }

  return (data as AnyRow[])
    .map((r) => {
      const rLat = parseNum(r.lat);
      const rLon = parseNum(r.lon);
      if (rLat == null || rLon == null) return null;
      const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
      if (dist > SEARCH_RADIUS_MILES) return null;
      return {
        property_name: r.property_name ?? 'Unknown',
        city: r.city ?? '',
        state: r.state ?? stateFullName,
        unit_type: r.unit_type ?? null,
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
        operating_season_months: r.operating_season_months ?? null,
        url: r.url ?? null,
        description: r.description ?? null,
        distance_miles: Math.round(dist * 10) / 10,
        source_table: 'hipcamp',
      } as ComparableProperty;
    })
    .filter((c) => c !== null) as ComparableProperty[];
}

// ─── RV: all_roverpass_data_new (numeric lat/lon, full state name) ──

async function fetchRoverpassComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateFullName: string
): Promise<ComparableProperty[]> {
  const bb = getBoundingBox(lat, lng, SEARCH_RADIUS_MILES);

  const { data, error } = await supabase
    .from('all_roverpass_data_new' as any)
    .select(
      'property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
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
    .limit(200);

  if (error || !data) {
    console.warn('[fetch-comps] all_roverpass_data_new error:', error?.message);
    return [];
  }

  return (data as AnyRow[])
    .map((r) => {
      const rLat = parseNum(r.lat);
      const rLon = parseNum(r.lon);
      if (rLat == null || rLon == null) return null;
      const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
      if (dist > SEARCH_RADIUS_MILES) return null;
      return {
        property_name: r.property_name ?? 'Unknown',
        city: r.city ?? '',
        state: r.state ?? stateFullName,
        unit_type: r.unit_type ?? null,
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
        operating_season_months: r.operating_season_months ?? null,
        url: r.url ?? null,
        description: r.description ?? null,
        distance_miles: Math.round(dist * 10) / 10,
        source_table: 'all_roverpass_data_new',
      } as ComparableProperty;
    })
    .filter((c) => c !== null) as ComparableProperty[];
}

// ─── RV: campspot (text lat/lon, full state name) ──

async function fetchCampspotComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateFullName: string
): Promise<ComparableProperty[]> {
  const { data, error } = await supabase
    .from('campspot' as any)
    .select(
      'property_name, city, state, unit_type, property_total_sites, quantity_of_units, ' +
      'avg_retail_daily_rate_2025, high_rate_2025, low_rate_2025, ' +
      'winter_weekday, winter_weekend, spring_weekday, spring_weekend, ' +
      'summer_weekday, summer_weekend, fall_weekday, fall_weekend, ' +
      'operating_season_months, url, description, lat, lon'
    )
    .eq('state', stateFullName)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .limit(500);

  if (error || !data) {
    console.warn('[fetch-comps] campspot error:', error?.message);
    return [];
  }

  return (data as AnyRow[])
    .map((r) => {
      const rLat = parseNum(r.lat);
      const rLon = parseNum(r.lon);
      if (rLat == null || rLon == null) return null;
      const dist = haversineDistanceMiles(lat, lng, rLat, rLon);
      if (dist > SEARCH_RADIUS_MILES) return null;
      return {
        property_name: r.property_name ?? 'Unknown',
        city: r.city ?? '',
        state: r.state ?? stateFullName,
        unit_type: r.unit_type ?? null,
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
        operating_season_months: r.operating_season_months ?? null,
        url: r.url ?? null,
        description: r.description ?? null,
        distance_miles: Math.round(dist * 10) / 10,
        source_table: 'campspot',
      } as ComparableProperty;
    })
    .filter((c) => c !== null) as ComparableProperty[];
}

// ─── Public API ──

export interface FetchCompsOptions {
  /** Include past Sage report comps (feasibility_comparables) */
  pastReportComps?: ComparableProperty[];
  /** Include Tavily web-researched comps */
  tavilyComps?: ComparableProperty[];
}

/**
 * Fetch and merge comparables from all available sources:
 * 1. Supabase market tables (hipcamp, all_glamping_properties, campspot, all_roverpass_data_new)
 * 2. Past Sage reports (feasibility_comparables + feasibility_comp_units)
 * 3. Tavily web research
 *
 * Results are deduplicated and sorted by distance (DB comps first, then past reports, then web).
 */
export async function fetchNearbyComps(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateInput: string,
  marketType?: string | null,
  options?: FetchCompsOptions,
): Promise<ComparableProperty[]> {
  const stateAbbr = stateInput.trim().toUpperCase().slice(0, 2);
  const stateFullName = resolveStateName(stateInput);
  const isGlamping = (marketType ?? '').toLowerCase().includes('glamping');

  let dbComps: ComparableProperty[];

  if (isGlamping) {
    const [glampingProps, hipcampProps] = await Promise.all([
      fetchGlampingPropsNumeric(supabase, lat, lng, stateAbbr),
      fetchHipcampComps(supabase, lat, lng, stateFullName),
    ]);
    dbComps = [...glampingProps, ...hipcampProps];
  } else {
    const [roverpassProps, campspotProps] = await Promise.all([
      fetchRoverpassComps(supabase, lat, lng, stateFullName),
      fetchCampspotComps(supabase, lat, lng, stateFullName),
    ]);
    dbComps = [...roverpassProps, ...campspotProps];
  }

  const allComps = [
    ...dbComps,
    ...(options?.pastReportComps ?? []),
    ...(options?.tavilyComps ?? []),
  ];

  const seen = new Set<string>();
  const deduped = allComps.filter((c) => {
    const key = `${c.property_name.toLowerCase().trim()}-${c.unit_type?.toLowerCase() ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: DB comps by distance first, then past reports by quality, then web comps
  deduped.sort((a, b) => {
    const sourceOrder = (s: string) => {
      if (s === 'past_reports') return 1;
      if (s === 'tavily_web_research') return 2;
      return 0; // DB tables
    };
    const orderDiff = sourceOrder(a.source_table) - sourceOrder(b.source_table);
    if (orderDiff !== 0) return orderDiff;
    if (a.source_table === 'past_reports') {
      return (b.quality_score ?? 0) - (a.quality_score ?? 0);
    }
    if (a.distance_miles >= 0 && b.distance_miles >= 0) {
      return a.distance_miles - b.distance_miles;
    }
    return 0;
  });

  return deduped.slice(0, MAX_COMPS);
}
