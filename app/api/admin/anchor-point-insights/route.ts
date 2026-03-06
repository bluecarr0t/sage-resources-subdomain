/**
 * API Route: Anchor Point Insights (Ski Resort / National Park Proximity Analytics)
 * GET /api/admin/anchor-point-insights
 *
 * Compares glamping/camping data from hipcamp and all_glamping_properties
 * against ski_resorts or national-parks. Returns distance bands,
 * winter rates, trends, drive-time estimates, and county population/GDP enrichment.
 *
 * Query params: state (optional), anchor_type=ski|national-parks (default: ski),
 * anchor_id (ski drill-down), anchor_slug (national-parks drill-down)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { getCache, setCache } from '@/lib/redis';
import {
  calculateDistance,
  getDistanceBand,
  estimateDriveTimeHours,
  DISTANCE_BANDS,
} from '@/lib/proximity-utils';

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
const MAX_COUNTY_ROWS = 5_000; // US has ~3,100 counties; cap for safety

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_PER_TABLE = 50_000;
const FETCH_PAGE_SIZE = 1000; // Supabase/PostgREST default max per request

/** Full state name -> abbreviation for county-population parsing */
const STATE_FULL_TO_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
};

type PropertySource = 'hipcamp' | 'sage_glamping';

interface NormalizedProperty {
  source: PropertySource;
  property_name: string;
  state: string | null;
  lat: number;
  lon: number;
  winter_weekday: number | null;
  winter_weekend: number | null;
  spring_weekday: number | null;
  spring_weekend: number | null;
  summer_weekday: number | null;
  summer_weekend: number | null;
  fall_weekday: number | null;
  fall_weekend: number | null;
  occupancy_2024: number | null;
  occupancy_2025: number | null;
  occupancy_2026: number | null;
  avg_rate_2024: number | null;
  avg_rate_2025: number | null;
  avg_rate_2026: number | null;
}

interface PropertyWithProximity extends NormalizedProperty {
  distance_miles: number;
  distance_band: string;
  drive_time_hours: number;
  nearest_anchor: string;
}

interface Anchor {
  id: number;
  name: string;
  lat: number;
  lon: number;
  slug?: string;
}

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'no data') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseCoord(val: unknown): number | null {
  const n = parseNum(val);
  if (n === null) return null;
  if (n < -180 || n > 180) return null;
  return n;
}

/** Paginate through a Supabase table to fetch up to maxRows, bypassing PostgREST 1000-row default limit */
async function fetchAllRows<T>(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  select: string,
  filters: { notNull?: string[]; neq?: Array<{ col: string; val: unknown }> },
  maxRows: number
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (all.length < maxRows) {
    const pageSize = Math.min(FETCH_PAGE_SIZE, maxRows - all.length);
    let q = supabase
      .from(table)
      .select(select)
      .range(offset, offset + pageSize - 1)
      .order('id', { ascending: true });
    for (const col of filters.notNull ?? []) {
      q = q.not(col, 'is', null);
    }
    for (const item of filters.neq ?? []) {
      q = q.neq(item.col, item.val);
    }
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += data.length;
  }
  return all;
}

export async function GET(request: NextRequest) {
  try {
    const rlKey = `anchor-insights:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const stateFilter = searchParams.get('state')?.trim().toUpperCase() || null;
    const anchorType = (searchParams.get('anchor_type') || 'ski').toLowerCase();
    const isNationalParks = anchorType === 'national-parks';
    const anchorIdParam = searchParams.get('anchor_id');
    const anchorSlugParam = searchParams.get('anchor_slug')?.trim() || null;
    const anchorId = anchorIdParam ? parseInt(anchorIdParam, 10) : null;
    const anchorSlug = anchorSlugParam || null;

    const cacheKey = `anchor-insights:${anchorType}:${stateFilter ?? 'all'}:${anchorId ?? anchorSlug ?? 'all'}`;
    const cached = await getCache<{ success: true; insights: object }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const supabaseAdmin = createServerClient();

    // 1. Fetch anchors (ski_resorts or national-parks) with valid coordinates
    let anchors: Anchor[] = [];
    if (isNationalParks) {
      const { data: parkRows, error: parkError } = await supabaseAdmin
        .from('national-parks')
        .select('id, name, latitude, longitude, slug')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (parkError) throw parkError;
      for (const r of parkRows || []) {
        const lat = parseCoord(r.latitude);
        const lon = parseCoord(r.longitude);
        if (lat !== null && lon !== null && r.name) {
          anchors.push({
            id: r.id,
            name: r.name,
            lat,
            lon,
            slug: r.slug ? String(r.slug).trim() : undefined,
          });
        }
      }
    } else {
      const { data: skiRows, error: skiError } = await supabaseAdmin
        .from('ski_resorts')
        .select('id, name, lat, lon')
        .not('lat', 'is', null)
        .not('lon', 'is', null);

      if (skiError) throw skiError;
      for (const r of skiRows || []) {
        const lat = parseCoord(r.lat);
        const lon = parseCoord(r.lon);
        if (lat !== null && lon !== null && r.name) {
          anchors.push({ id: r.id, name: r.name, lat, lon });
        }
      }
    }

    if (anchors.length === 0) {
      const emptyResponse = {
        success: true as const,
        insights: {
          anchor_type: isNationalParks ? 'national-parks' : 'ski',
          summary: {
            total_properties: 0,
            properties_within_30_mi: 0,
            anchors_count: 0,
            avg_winter_rate: null,
            data_sources: 2,
            avg_state_population_2020: null,
            combined_state_gdp_2023: null,
          },
          by_band: [],
          by_source: [],
          by_state: [],
          trends: null,
          property_sample: [],
          anchors_with_property_counts: [],
          map_properties: [],
          map_anchors: [],
        },
      };
      await setCache(cacheKey, emptyResponse, CACHE_TTL_SECONDS);
      return NextResponse.json(emptyResponse);
    }

    // 2. Fetch properties from each table in parallel (paginated to bypass PostgREST 1000-row limit)
    const normalized: NormalizedProperty[] = [];

    const [hipcampRows, glampingRows] = await Promise.all([
      fetchAllRows<Record<string, unknown>>(
        supabaseAdmin,
        'hipcamp',
        'id, property_name, lat, lon, state, winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, fall_weekday, fall_weekend, occupancy_rate_2024, occupancy_rate_2025, occupancy_rate_2026, avg_retail_daily_rate_2024, avg_retail_daily_rate_2025',
        { notNull: ['lat', 'lon'] },
        MAX_PER_TABLE
      ),
      fetchAllRows<Record<string, unknown>>(
        supabaseAdmin,
        'all_glamping_properties',
        'id, property_name, lat, lon, state, rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, roverpass_occupancy_rate',
        { notNull: ['lat', 'lon'], neq: [{ col: 'is_closed', val: 'Yes' }] },
        MAX_PER_TABLE
      ),
    ]);

    for (const r of hipcampRows) {
      const lat = parseCoord(r.lat);
      const lon = parseCoord(r.lon);
      if (lat === null || lon === null) continue;
      if (stateFilter && String(r.state || '').toUpperCase() !== stateFilter) continue;
      normalized.push({
        source: 'hipcamp',
        property_name: String(r.property_name || '').trim() || 'Unknown',
        state: r.state ? String(r.state).trim() : null,
        lat,
        lon,
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
      if (stateFilter && String(r.state || '').toUpperCase() !== stateFilter) continue;
      const occ = parseNum(r.roverpass_occupancy_rate);
      normalized.push({
        source: 'sage_glamping',
        property_name: String(r.property_name || '').trim() || 'Unknown',
        state: r.state ? String(r.state).trim() : null,
        lat,
        lon,
        winter_weekday: parseNum(r.rate_winter_weekday),
        winter_weekend: parseNum(r.rate_winter_weekend),
        spring_weekday: parseNum(r.rate_spring_weekday),
        spring_weekend: parseNum(r.rate_spring_weekend),
        summer_weekday: parseNum(r.rate_summer_weekday),
        summer_weekend: parseNum(r.rate_summer_weekend),
        fall_weekday: parseNum(r.rate_fall_weekday),
        fall_weekend: parseNum(r.rate_fall_weekend),
        occupancy_2024: occ,
        occupancy_2025: occ,
        occupancy_2026: occ,
        avg_rate_2024: null,
        avg_rate_2025: null,
        avg_rate_2026: null,
      });
    }

    // 3. Deduplicate properties by coordinates (same physical property may exist in multiple sources)
    const COORD_PRECISION = 4; // ~11m; catches same property across Hipcamp, Sage Glamping, etc.
    const seenCoords = new Set<string>();
    const deduped: NormalizedProperty[] = [];
    for (const p of normalized) {
      const key = `${Math.round(p.lat * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION},${Math.round(p.lon * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION}`;
      if (seenCoords.has(key)) continue;
      seenCoords.add(key);
      deduped.push(p);
    }

    // 4. Compute distance to nearest anchor for each property.
    // NOTE: O(properties × anchors) in-memory. For 100k+ properties, consider PostGIS ST_DWithin
    // or a precomputed property-anchor distance table.
    const withProximity: PropertyWithProximity[] = [];
    for (const p of deduped) {
      let minDist = Infinity;
      let nearestName = '';
      for (const anchor of anchors) {
        const d = calculateDistance(p.lat, p.lon, anchor.lat, anchor.lon);
        if (d < minDist) {
          minDist = d;
          nearestName = anchor.name;
        }
      }
      if (minDist === Infinity) continue;
      const band = getDistanceBand(minDist);
      withProximity.push({
        ...p,
        distance_miles: Math.round(minDist * 10) / 10,
        distance_band: band,
        drive_time_hours: Math.round(estimateDriveTimeHours(minDist) * 10) / 10,
        nearest_anchor: nearestName,
      });
    }

    // 4a. Anchor drill-down: filter to properties nearest the selected anchor
    const withProximityAll = withProximity; // keep unfiltered for anchor selector
    let selectedAnchor: { id: number; name: string; lat: number; lon: number; slug?: string } | null = null;
    let proximityForAggregation = withProximity;
    if (isNationalParks && anchorSlug) {
      const match = anchors.find((a) => a.slug === anchorSlug);
      if (match) {
        selectedAnchor = { id: match.id, name: match.name, lat: match.lat, lon: match.lon, slug: match.slug };
        proximityForAggregation = withProximity.filter((p) => p.nearest_anchor === match.name);
      }
    } else if (!isNationalParks && anchorId != null && !isNaN(anchorId)) {
      const match = anchors.find((a) => a.id === anchorId);
      if (match) {
        selectedAnchor = { id: match.id, name: match.name, lat: match.lat, lon: match.lon };
        proximityForAggregation = withProximity.filter((p) => p.nearest_anchor === match.name);
      }
    }

    // Normalize occupancy to 0-100 (RoverPass may be 0-1)
    function toOccupancyPct(v: number | null): number | null {
      if (v === null || v === undefined) return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (isNaN(n)) return null;
      return n <= 1 ? Math.round(n * 100) : Math.round(n);
    }

    // 4. Aggregate by band (winter + seasonal rates + occupancy)
    type BandEntry = {
      sumWd: number;
      sumWe: number;
      countWd: number;
      countWe: number;
      sumSpringWd: number;
      sumSpringWe: number;
      countSpringWd: number;
      countSpringWe: number;
      sumSummerWd: number;
      sumSummerWe: number;
      countSummerWd: number;
      countSummerWe: number;
      sumFallWd: number;
      sumFallWe: number;
      countFallWd: number;
      countFallWe: number;
      count: number;
      sumOcc2024: number;
      countOcc2024: number;
      sumOcc2025: number;
      countOcc2025: number;
      sumOcc2026: number;
      countOcc2026: number;
    };
    const bandMap = new Map<string, BandEntry>();
    for (const b of DISTANCE_BANDS) {
      bandMap.set(b, {
        sumWd: 0,
        sumWe: 0,
        countWd: 0,
        countWe: 0,
        sumSpringWd: 0,
        sumSpringWe: 0,
        countSpringWd: 0,
        countSpringWe: 0,
        sumSummerWd: 0,
        sumSummerWe: 0,
        countSummerWd: 0,
        countSummerWe: 0,
        sumFallWd: 0,
        sumFallWe: 0,
        countFallWd: 0,
        countFallWe: 0,
        count: 0,
        sumOcc2024: 0,
        countOcc2024: 0,
        sumOcc2025: 0,
        countOcc2025: 0,
        sumOcc2026: 0,
        countOcc2026: 0,
      });
    }
    for (const p of proximityForAggregation) {
      const entry = bandMap.get(p.distance_band);
      if (!entry) continue;
      entry.count++;
      if (p.winter_weekday !== null) {
        entry.sumWd += p.winter_weekday;
        entry.countWd++;
      }
      if (p.winter_weekend !== null) {
        entry.sumWe += p.winter_weekend;
        entry.countWe++;
      }
      if (p.spring_weekday !== null) {
        entry.sumSpringWd += p.spring_weekday;
        entry.countSpringWd++;
      }
      if (p.spring_weekend !== null) {
        entry.sumSpringWe += p.spring_weekend;
        entry.countSpringWe++;
      }
      if (p.summer_weekday !== null) {
        entry.sumSummerWd += p.summer_weekday;
        entry.countSummerWd++;
      }
      if (p.summer_weekend !== null) {
        entry.sumSummerWe += p.summer_weekend;
        entry.countSummerWe++;
      }
      if (p.fall_weekday !== null) {
        entry.sumFallWd += p.fall_weekday;
        entry.countFallWd++;
      }
      if (p.fall_weekend !== null) {
        entry.sumFallWe += p.fall_weekend;
        entry.countFallWe++;
      }
      const occ2024 = toOccupancyPct(p.occupancy_2024);
      if (occ2024 !== null) {
        entry.sumOcc2024 += occ2024;
        entry.countOcc2024++;
      }
      const occ2025 = toOccupancyPct(p.occupancy_2025);
      if (occ2025 !== null) {
        entry.sumOcc2025 += occ2025;
        entry.countOcc2025++;
      }
      const occ2026 = toOccupancyPct(p.occupancy_2026);
      if (occ2026 !== null) {
        entry.sumOcc2026 += occ2026;
        entry.countOcc2026++;
      }
    }
    const byBand = DISTANCE_BANDS.map((band) => {
      const e = bandMap.get(band)!;
      return {
        band,
        count: e.count,
        avg_winter_weekday: e.countWd > 0 ? Math.round(e.sumWd / e.countWd) : null,
        avg_winter_weekend: e.countWe > 0 ? Math.round(e.sumWe / e.countWe) : null,
        avg_spring_weekday: e.countSpringWd > 0 ? Math.round(e.sumSpringWd / e.countSpringWd) : null,
        avg_spring_weekend: e.countSpringWe > 0 ? Math.round(e.sumSpringWe / e.countSpringWe) : null,
        avg_summer_weekday: e.countSummerWd > 0 ? Math.round(e.sumSummerWd / e.countSummerWd) : null,
        avg_summer_weekend: e.countSummerWe > 0 ? Math.round(e.sumSummerWe / e.countSummerWe) : null,
        avg_fall_weekday: e.countFallWd > 0 ? Math.round(e.sumFallWd / e.countFallWd) : null,
        avg_fall_weekend: e.countFallWe > 0 ? Math.round(e.sumFallWe / e.countFallWe) : null,
        avg_occupancy_2024: e.countOcc2024 > 0 ? Math.round(e.sumOcc2024 / e.countOcc2024) : null,
        avg_occupancy_2025: e.countOcc2025 > 0 ? Math.round(e.sumOcc2025 / e.countOcc2025) : null,
        avg_occupancy_2026: e.countOcc2026 > 0 ? Math.round(e.sumOcc2026 / e.countOcc2026) : null,
      };
    });

    // 5. Aggregate by source
    const sourceMap = new Map<PropertySource, { count: number; sumRate: number; rateCount: number }>();
    const sources: PropertySource[] = ['hipcamp', 'sage_glamping'];
    for (const s of sources) {
      sourceMap.set(s, { count: 0, sumRate: 0, rateCount: 0 });
    }
    for (const p of proximityForAggregation) {
      const e = sourceMap.get(p.source)!;
      e.count++;
      const rate = p.winter_weekday ?? p.winter_weekend;
      if (rate !== null) {
        e.sumRate += rate;
        e.rateCount++;
      }
    }
    const bySource = sources.map((source) => {
      const e = sourceMap.get(source)!;
      const label = source === 'hipcamp' ? 'Hipcamp' : 'Sage Glamping';
      return {
        source: label,
        count: e.count,
        avg_winter_rate: e.rateCount > 0 ? Math.round(e.sumRate / e.rateCount) : null,
      };
    });

    // 5b. Fetch county-population and county-gdp; build state-level lookups.
    // NOTE: We use state-level aggregation because property tables lack county. True county-level
    // enrichment would require reverse-geocoding (lat,lon) -> county or a county boundaries table.
    const statePopulationLookup: Record<string, { population_2020: number; population_2010: number }> = {};
    const stateGDPLookup: Record<string, { gdp_2023: number; gdp_2022: number }> = {};

    const { data: countyPopRows } = await supabaseAdmin
      .from('county-population')
      .select('name, population_2010, population_2020')
      .limit(MAX_COUNTY_ROWS);

    for (const r of countyPopRows || []) {
      const name = String(r.name || '').trim();
      if (!name) continue;
      const parts = name.split(',').map((s) => s.trim());
      const stateFull = parts[parts.length - 1]?.toLowerCase();
      if (!stateFull) continue;
      const stateAbbr = STATE_FULL_TO_ABBR[stateFull];
      if (!stateAbbr) continue;
      const pop2020 = r.population_2020 != null ? Number(r.population_2020) : 0;
      const pop2010 = r.population_2010 != null ? Number(r.population_2010) : 0;
      if (!statePopulationLookup[stateAbbr]) {
        statePopulationLookup[stateAbbr] = { population_2020: 0, population_2010: 0 };
      }
      statePopulationLookup[stateAbbr].population_2020 += pop2020;
      statePopulationLookup[stateAbbr].population_2010 += pop2010;
    }

    const { data: countyGDPRows } = await supabaseAdmin
      .from('county-gdp')
      .select('geoname, gdp_2022, gdp_2023')
      .limit(MAX_COUNTY_ROWS);

    for (const r of countyGDPRows || []) {
      const geoname = String(r.geoname || '').trim();
      if (!geoname) continue;
      const parts = geoname.split(',').map((s) => s.trim());
      const stateAbbr = parts[parts.length - 1]?.toUpperCase();
      if (!stateAbbr || stateAbbr.length !== 2) continue;
      const gdp2023 = r.gdp_2023 != null ? Number(r.gdp_2023) : 0;
      const gdp2022 = r.gdp_2022 != null ? Number(r.gdp_2022) : 0;
      if (!stateGDPLookup[stateAbbr]) {
        stateGDPLookup[stateAbbr] = { gdp_2023: 0, gdp_2022: 0 };
      }
      stateGDPLookup[stateAbbr].gdp_2023 += gdp2023;
      stateGDPLookup[stateAbbr].gdp_2022 += gdp2022;
    }

    // 6. Aggregate by state (with population/GDP enrichment)
    const stateMap = new Map<string, { count: number; sumRate: number; rateCount: number }>();
    for (const p of proximityForAggregation) {
      const state = p.state || 'Unknown';
      let e = stateMap.get(state);
      if (!e) {
        e = { count: 0, sumRate: 0, rateCount: 0 };
        stateMap.set(state, e);
      }
      e.count++;
      const rate = p.winter_weekday ?? p.winter_weekend;
      if (rate !== null) {
        e.sumRate += rate;
        e.rateCount++;
      }
    }
    const byState = Array.from(stateMap.entries())
      .map(([state, e]) => {
        const pop = state !== 'Unknown' ? statePopulationLookup[state.toUpperCase()] : null;
        const gdp = state !== 'Unknown' ? stateGDPLookup[state.toUpperCase()] : null;
        return {
          state,
          count: e.count,
          avg_winter_rate: e.rateCount > 0 ? Math.round(e.sumRate / e.rateCount) : null,
          population_2020: pop?.population_2020 ?? null,
          gdp_2023: gdp?.gdp_2023 ?? null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // 7. Trends (YoY from hipcamp avg_retail_daily_rate). Exclude 2026 — no avg_retail_daily_rate_2026
    // column; retail_daily_rate_ytd is not comparable to full-year averages.
    const trendRates: { year: number; avg: number; count: number }[] = [];
    const years = [2024, 2025];
    for (const y of years) {
      const key = `avg_rate_${y}` as keyof NormalizedProperty;
      const vals = proximityForAggregation
        .map((p) => (p[key] as number | null) ?? null)
        .filter((v): v is number => v !== null);
      if (vals.length > 0) {
        trendRates.push({
          year: y,
          avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          count: vals.length,
        });
      }
    }
    const trends = trendRates.length >= 2 ? trendRates.sort((a, b) => a.year - b.year) : null;

    // 8. Property sample (top by winter rate within 30 mi)
    const within30 = proximityForAggregation.filter((p) => p.distance_miles <= 30);
    const propertySample = within30
      .filter((p) => (p.winter_weekday ?? p.winter_weekend) !== null)
      .sort((a, b) => {
        const ra = a.winter_weekend ?? a.winter_weekday ?? 0;
        const rb = b.winter_weekend ?? b.winter_weekday ?? 0;
        return rb - ra;
      })
      .slice(0, 20)
      .map((p) => {
        const stateKey = p.state ? p.state.toUpperCase() : null;
        const pop = stateKey ? statePopulationLookup[stateKey] : null;
        const gdp = stateKey ? stateGDPLookup[stateKey] : null;
        return {
          property_name: p.property_name,
          source: p.source,
          state: p.state,
          distance_miles: p.distance_miles,
          drive_time_hours: p.drive_time_hours,
          winter_weekday: p.winter_weekday,
          winter_weekend: p.winter_weekend,
          nearest_anchor: p.nearest_anchor,
          state_population_2020: pop?.population_2020 ?? null,
          state_gdp_2023: gdp?.gdp_2023 ?? null,
        };
      });

    // 9. Anchors with property counts within 15 mi (use unfiltered for selector)
    const anchorsWithCounts = anchors.map((anchor) => {
      const count = withProximityAll.filter((p) => {
        const d = calculateDistance(p.lat, p.lon, anchor.lat, anchor.lon);
        return d <= 15;
      }).length;
      return {
        anchor_id: anchor.id,
        anchor_name: anchor.name,
        anchor_slug: anchor.slug,
        property_count_15_mi: count,
      };
    });
    const anchorsWithPropertyCounts = anchorsWithCounts
      .filter((s) => s.property_count_15_mi > 0)
      .sort((a, b) => b.property_count_15_mi - a.property_count_15_mi)
      .slice(0, 50);

    // 9b. Map data: properties within 75 mi (cap 500) + all anchors
    const MAP_MARKER_LIMIT = 500;
    const mapProperties = proximityForAggregation
      .filter((p) => p.distance_miles <= 75)
      .slice(0, MAP_MARKER_LIMIT)
      .map((p) => ({
        lat: p.lat,
        lon: p.lon,
        property_name: p.property_name,
        source: p.source,
        distance_miles: p.distance_miles,
        nearest_anchor: p.nearest_anchor,
        winter_weekday: p.winter_weekday,
        winter_weekend: p.winter_weekend,
      }));
    const mapAnchors = selectedAnchor
      ? [{ id: selectedAnchor.id, name: selectedAnchor.name, lat: selectedAnchor.lat, lon: selectedAnchor.lon }]
      : anchors.map((a) => ({ id: a.id, name: a.name, lat: a.lat, lon: a.lon }));

    // 10. Summary (with county metrics)
    const allRates = proximityForAggregation
      .map((p) => p.winter_weekday ?? p.winter_weekend)
      .filter((v): v is number => v !== null);
    const statesWithProps = new Set(proximityForAggregation.map((p) => p.state?.toUpperCase()).filter(Boolean));
    let totalStatePop = 0;
    let totalStateGDP = 0;
    let popCount = 0;
    let gdpCount = 0;
    for (const st of statesWithProps) {
      const pop = st ? statePopulationLookup[st] : null;
      const gdp = st ? stateGDPLookup[st] : null;
      if (pop?.population_2020) {
        totalStatePop += pop.population_2020;
        popCount++;
      }
      if (gdp?.gdp_2023) {
        totalStateGDP += gdp.gdp_2023;
        gdpCount++;
      }
    }
    const summary = {
      total_properties: proximityForAggregation.length,
      properties_within_30_mi: proximityForAggregation.filter((p) => p.distance_miles <= 30).length,
      anchors_count: selectedAnchor ? 1 : anchors.length,
      avg_winter_rate: allRates.length > 0 ? Math.round(allRates.reduce((a, b) => a + b, 0) / allRates.length) : null,
      data_sources: 2,
      avg_state_population_2020: popCount > 0 ? Math.round(totalStatePop / popCount) : null,
      combined_state_gdp_2023: gdpCount > 0 ? Math.round(totalStateGDP) : null,
    };

    const insightsPayload: Record<string, unknown> = {
      anchor_type: isNationalParks ? 'national-parks' : 'ski',
      summary,
      by_band: byBand,
      by_source: bySource,
      by_state: byState,
      trends,
      property_sample: propertySample,
      anchors_with_property_counts: anchorsWithPropertyCounts,
      map_properties: mapProperties,
      map_anchors: mapAnchors,
    };
    if (selectedAnchor) {
      insightsPayload.selected_anchor = selectedAnchor;
    }
    const response = {
      success: true as const,
      insights: insightsPayload,
    };
    await setCache(cacheKey, response, CACHE_TTL_SECONDS);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[anchor-point-insights] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch anchor point insights' },
      { status: 500 }
    );
  }
}
