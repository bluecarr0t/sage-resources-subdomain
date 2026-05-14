import type { SupabaseClient } from '@supabase/supabase-js';
import { getBoundingBox, haversineDistanceMiles, parseNum, stateSqlValuesGlampingRoverpass } from '@/lib/comps-v2/geo';
import { anchorUsStatesForRegionalDemandFetch } from '@/lib/market-report/us-state-border-states';

/**
 * Demand drivers — natural attractions and tourism anchors near the search
 * center. Used by the Market Summary scorecard and as narrative context in
 * the client deck. Sources:
 *
 *   national-parks            → latitude/longitude (numeric), state, recreation_visitors_* (text)
 *   ski_resorts / wineries    → lat/lon (text), state_province, country, overall_rating (text)
 *   outdoor_recreation_sites  → latitude/longitude (numeric), site_type, state (optional)
 */

const NATIONAL_PARK_RADIUS_MI_DEFAULT = 100;
const SKI_RESORT_RADIUS_MI_DEFAULT = 100;
const WINERY_RADIUS_MI_DEFAULT = 50;
const PER_TYPE_CAP = 8;

/** Hard cap so very large report radii do not explode bbox / in-memory work. */
export const DEMAND_DRIVERS_MAX_RADIUS_MILES = 250;

export interface DemandDriverItem {
  name: string;
  state: string | null;
  distance_miles: number;
  /** Annual recreation visitors (national parks) or null. */
  visitors?: number | null;
  /** Source rating 0–5 when available (ski resorts / wineries). */
  rating?: number | null;
  /** outdoor_recreation_sites.site_type when present. */
  siteType?: string | null;
}

export interface DemandDriversResult {
  nationalParks: { count: number; top: DemandDriverItem[]; radiusMiles: number };
  skiResorts: { count: number; top: DemandDriverItem[]; radiusMiles: number };
  wineries: { count: number; top: DemandDriverItem[]; radiusMiles: number };
  majorOutdoorSites: { count: number; top: DemandDriverItem[]; radiusMiles: number };
}

function makeEmptyDemand(radii: {
  parks: number;
  ski: number;
  wineries: number;
  outdoor: number;
}): DemandDriversResult {
  return {
    nationalParks: { count: 0, top: [], radiusMiles: radii.parks },
    skiResorts: { count: 0, top: [], radiusMiles: radii.ski },
    wineries: { count: 0, top: [], radiusMiles: radii.wineries },
    majorOutdoorSites: { count: 0, top: [], radiusMiles: radii.outdoor },
  };
}

/**
 * Derive per-layer search radii from the market report local radius (miles),
 * each capped at {@link DEMAND_DRIVERS_MAX_RADIUS_MILES}.
 */
export function resolveDemandDriverSearchRadii(marketReportRadiusMiles: number): {
  parksRadiusMiles: number;
  skiRadiusMiles: number;
  wineriesRadiusMiles: number;
  majorOutdoorRadiusMiles: number;
} {
  const r = Math.max(
    1,
    Math.min(Math.floor(marketReportRadiusMiles), DEMAND_DRIVERS_MAX_RADIUS_MILES)
  );
  return {
    parksRadiusMiles: r,
    skiRadiusMiles: r,
    wineriesRadiusMiles: r,
    majorOutdoorRadiusMiles: r,
  };
}

function parseVisitors(value: unknown): number | null {
  if (value == null) return null;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseRating(value: unknown): number | null {
  const n = parseNum(value);
  return n != null && n >= 0 && n <= 5 ? n : null;
}

/**
 * Collapse Mt./Mount (and similar) so one physical resort is not listed twice
 * when the `ski_resorts` table has variant spellings.
 *
 * @internal Exported for unit tests.
 */
export function canonicalSkiResortNameKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\bmt\.?\b/g, 'mount')
    .replace(/\bft\.?\b/g, 'fort')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickPreferredSkiResortDisplayName(a: string, b: string): string {
  const aUsesMountWord = /\bmount\b/i.test(a);
  const bUsesMountWord = /\bmount\b/i.test(b);
  const aUsesMtAbbrev = /\bmt\.?\b/i.test(a);
  const bUsesMtAbbrev = /\bmt\.?\b/i.test(b);
  if (aUsesMountWord && bUsesMtAbbrev && !bUsesMountWord) return a;
  if (bUsesMountWord && aUsesMtAbbrev && !aUsesMountWord) return b;
  return a.trim().length >= b.trim().length ? a : b;
}

function pickByRatingThenDistance(a: DemandDriverItem, b: DemandDriverItem): DemandDriverItem {
  const ra = a.rating ?? 0;
  const rb = b.rating ?? 0;
  if (rb !== ra) return rb > ra ? b : a;
  if (a.distance_miles !== b.distance_miles) return a.distance_miles <= b.distance_miles ? a : b;
  return a;
}

/** @internal Exported for unit tests. */
export function dedupeSkiResortsDemandDrivers(items: DemandDriverItem[]): DemandDriverItem[] {
  const map = new Map<string, DemandDriverItem>();
  for (const item of items) {
    const key = canonicalSkiResortNameKey(item.name);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    const winner = pickByRatingThenDistance(existing, item);
    const other = winner === existing ? item : existing;
    map.set(key, {
      ...winner,
      name: pickPreferredSkiResortDisplayName(winner.name, other.name),
    });
  }
  return [...map.values()];
}

async function fetchNationalParks(
  supabase: SupabaseClient,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number
): Promise<{ count: number; top: DemandDriverItem[]; radiusMiles: number }> {
  const bb = getBoundingBox(anchorLat, anchorLng, radiusMiles);
  const { data, error } = await supabase
    .from('national-parks')
    .select('name, state, latitude, longitude, recreation_visitors_2023, recreation_visitors_2022')
    .gte('latitude', bb.minLat)
    .lte('latitude', bb.maxLat)
    .gte('longitude', bb.minLng)
    .lte('longitude', bb.maxLng)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(80);
  if (error || !data) return { count: 0, top: [], radiusMiles };

  const inRadius: DemandDriverItem[] = [];
  for (const r of data as unknown as Record<string, unknown>[]) {
    const lat = parseNum(r.latitude);
    const lon = parseNum(r.longitude);
    if (lat == null || lon == null) continue;
    const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lon);
    if (dist > radiusMiles) continue;
    inRadius.push({
      name: String(r.name ?? 'Unknown'),
      state: r.state != null ? String(r.state) : null,
      distance_miles: Math.round(dist * 10) / 10,
      visitors:
        parseVisitors(r.recreation_visitors_2023) ?? parseVisitors(r.recreation_visitors_2022),
    });
  }
  inRadius.sort((a, b) => {
    const va = a.visitors ?? 0;
    const vb = b.visitors ?? 0;
    if (vb !== va) return vb - va;
    return a.distance_miles - b.distance_miles;
  });
  return { count: inRadius.length, top: inRadius.slice(0, PER_TYPE_CAP), radiusMiles };
}

async function fetchOutdoorRecreationSites(
  supabase: SupabaseClient,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number
): Promise<{ count: number; top: DemandDriverItem[]; radiusMiles: number }> {
  const bb = getBoundingBox(anchorLat, anchorLng, radiusMiles);
  const { data, error } = await supabase
    .from('outdoor_recreation_sites')
    .select('name, site_type, state, latitude, longitude, annual_visitors')
    .gte('latitude', bb.minLat)
    .lte('latitude', bb.maxLat)
    .gte('longitude', bb.minLng)
    .lte('longitude', bb.maxLng)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(120);
  if (error || !data) return { count: 0, top: [], radiusMiles };

  const inRadius: DemandDriverItem[] = [];
  for (const r of data as unknown as Record<string, unknown>[]) {
    const lat = parseNum(r.latitude);
    const lon = parseNum(r.longitude);
    if (lat == null || lon == null) continue;
    const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lon);
    if (dist > radiusMiles) continue;
    inRadius.push({
      name: String(r.name ?? 'Unknown'),
      state: r.state != null ? String(r.state) : null,
      distance_miles: Math.round(dist * 10) / 10,
      visitors: parseVisitors(r.annual_visitors),
      siteType: r.site_type != null ? String(r.site_type) : null,
    });
  }
  inRadius.sort((a, b) => {
    const va = a.visitors ?? 0;
    const vb = b.visitors ?? 0;
    if (vb !== va) return vb - va;
    return a.distance_miles - b.distance_miles;
  });
  return { count: inRadius.length, top: inRadius.slice(0, PER_TYPE_CAP), radiusMiles };
}

/** Lowercased state tokens (abbr + full name) for optional post-fetch filtering. */
function allowedStateProvinceTokens(stateAbbrs: string[] | null): Set<string> | null {
  if (!stateAbbrs?.length) return null;
  const tokens = stateSqlValuesGlampingRoverpass(stateAbbrs);
  return new Set(tokens.map((t) => t.trim().toLowerCase()));
}

/**
 * When we have an anchor US state, keep rows whose `state_province` matches the
 * anchor + border states (case-insensitive), **or** rows with blank state (coords-only).
 * SQL `.in()` was too strict (case, nulls, odd spellings) and zeroed Bend ski/winery counts.
 */
function stateProvincePassesRegionalFilter(
  stateProv: unknown,
  allowed: Set<string> | null
): boolean {
  if (!allowed) return true;
  if (stateProv == null || String(stateProv).trim() === '') return true;
  return allowed.has(String(stateProv).trim().toLowerCase());
}

/** @internal Exported for unit tests. */
export function demandDriverStatePassesRegionalFilter(
  stateProv: unknown,
  anchorStateAbbr: string | null | undefined
): boolean {
  const abbrs = anchorUsStatesForRegionalDemandFetch(anchorStateAbbr ?? null);
  return stateProvincePassesRegionalFilter(stateProv, allowedStateProvinceTokens(abbrs));
}

async function fetchTextLatLngTable(
  supabase: SupabaseClient,
  table: 'ski_resorts' | 'wineries',
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
  stateAbbrsForInFilter: string[] | null
): Promise<{ count: number; top: DemandDriverItem[]; radiusMiles: number }> {
  const allowedStates = allowedStateProvinceTokens(stateAbbrsForInFilter);

  const { data, error } = await supabase
    .from(table)
    .select('name, state_province, country, lat, lon, overall_rating')
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .in('country', ['US', 'USA', 'United States'])
    .limit(5000);

  if (error) {
    console.warn(`[market-report] demand-drivers ${table}:`, error.message);
    return { count: 0, top: [], radiusMiles };
  }
  if (!data) return { count: 0, top: [], radiusMiles };

  const inRadius: DemandDriverItem[] = [];
  for (const r of data as unknown as Record<string, unknown>[]) {
    const lat = parseNum(r.lat);
    const lon = parseNum(r.lon);
    if (lat == null || lon == null) continue;
    if (!stateProvincePassesRegionalFilter(r.state_province, allowedStates)) continue;
    const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lon);
    if (dist > radiusMiles) continue;
    inRadius.push({
      name: String(r.name ?? 'Unknown'),
      state: r.state_province != null ? String(r.state_province) : null,
      distance_miles: Math.round(dist * 10) / 10,
      rating: parseRating(r.overall_rating),
    });
  }
  const merged =
    table === 'ski_resorts' ? dedupeSkiResortsDemandDrivers(inRadius) : inRadius;
  merged.sort((a, b) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    return a.distance_miles - b.distance_miles;
  });
  return { count: merged.length, top: merged.slice(0, PER_TYPE_CAP), radiusMiles };
}

export interface FetchDemandDriversOptions {
  anchorLat: number;
  anchorLng: number;
  /**
   * When set, per-layer radii default from this value (capped at
   * {@link DEMAND_DRIVERS_MAX_RADIUS_MILES}), unless individual layer overrides are passed.
   */
  marketReportRadiusMiles?: number;
  parksRadiusMiles?: number;
  skiRadiusMiles?: number;
  wineriesRadiusMiles?: number;
  majorOutdoorRadiusMiles?: number;
  /** Two-letter US state at the anchor; narrows ski/winery rows to this state + neighbors. */
  anchorStateUsAbbr?: string | null;
}

export async function fetchDemandDrivers(
  supabase: SupabaseClient,
  opts: FetchDemandDriversOptions
): Promise<DemandDriversResult> {
  const fromMarket =
    opts.marketReportRadiusMiles != null &&
    Number.isFinite(opts.marketReportRadiusMiles);
  const resolved = fromMarket
    ? resolveDemandDriverSearchRadii(opts.marketReportRadiusMiles!)
    : {
        parksRadiusMiles: opts.parksRadiusMiles ?? NATIONAL_PARK_RADIUS_MI_DEFAULT,
        skiRadiusMiles: opts.skiRadiusMiles ?? SKI_RESORT_RADIUS_MI_DEFAULT,
        wineriesRadiusMiles: opts.wineriesRadiusMiles ?? WINERY_RADIUS_MI_DEFAULT,
        majorOutdoorRadiusMiles:
          opts.majorOutdoorRadiusMiles ??
          opts.parksRadiusMiles ??
          NATIONAL_PARK_RADIUS_MI_DEFAULT,
      };

  const parksRadius = opts.parksRadiusMiles ?? resolved.parksRadiusMiles;
  const skiRadius = opts.skiRadiusMiles ?? resolved.skiRadiusMiles;
  const wineriesRadius = opts.wineriesRadiusMiles ?? resolved.wineriesRadiusMiles;
  const outdoorRadius = opts.majorOutdoorRadiusMiles ?? resolved.majorOutdoorRadiusMiles;

  const stateAbbrevs = anchorUsStatesForRegionalDemandFetch(opts.anchorStateUsAbbr ?? null);
  const stateFilterList = stateAbbrevs;

  const emptyRadii = { parks: parksRadius, ski: skiRadius, wineries: wineriesRadius, outdoor: outdoorRadius };

  try {
    const [parks, ski, wineries, outdoor] = await Promise.all([
      fetchNationalParks(supabase, opts.anchorLat, opts.anchorLng, parksRadius),
      fetchTextLatLngTable(
        supabase,
        'ski_resorts',
        opts.anchorLat,
        opts.anchorLng,
        skiRadius,
        stateFilterList
      ),
      fetchTextLatLngTable(
        supabase,
        'wineries',
        opts.anchorLat,
        opts.anchorLng,
        wineriesRadius,
        stateFilterList
      ),
      fetchOutdoorRecreationSites(supabase, opts.anchorLat, opts.anchorLng, outdoorRadius).catch(
        (err) => {
          console.warn('[market-report] outdoor_recreation_sites fetch skipped:', err);
          return { count: 0, top: [], radiusMiles: outdoorRadius };
        }
      ),
    ]);
    return { nationalParks: parks, skiResorts: ski, wineries, majorOutdoorSites: outdoor };
  } catch (err) {
    console.warn('[market-report] demand-drivers fetch:', err);
    return makeEmptyDemand(emptyRadii);
  }
}
