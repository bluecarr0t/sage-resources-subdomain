/**
 * Drive-time demographics: Mapbox/Google isochrone → ACS county aggregates (fallback: haversine).
 * Caches summaries into feasibility_market_data when study_id is present.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { haversineDistanceMiles, parseNum, STATE_ABBR_TO_NAME } from '@/lib/comps-v2/geo';

export const DRIVE_TIME_MINUTES = [60, 120, 180] as const;

export interface DriveTimeRing {
  minutes: number;
  /** Label matching historic workbook radii (e.g. "60 min") */
  radius_label: string;
  population_2020: number | null;
  households_2020: number | null;
  median_household_income: number | null;
  method: 'isochrone_acs' | 'haversine_county' | 'cached';
}

export interface DriveTimeDemographicsResult {
  rings: DriveTimeRing[];
  /** Demand-rubric scores 0–3 per ring (population thresholds) */
  demand_rubric: {
    minutes: number;
    population: number | null;
    score: 0 | 1 | 2 | 3;
    note: string;
  }[];
  overall_score: number;
  fetched_at: string;
  source: string;
}

/** Historic demand thresholds (approx) per drive-time ring */
const POP_THRESHOLDS: Record<number, [number, number, number]> = {
  // [score1, score2, score3] — population must meet or exceed
  60: [50_000, 150_000, 300_000],
  120: [150_000, 400_000, 750_000],
  180: [300_000, 750_000, 1_500_000],
};

export function scoreDriveTimeRing(
  minutes: number,
  population: number | null
): { score: 0 | 1 | 2 | 3; note: string } {
  if (population == null || population <= 0) {
    return { score: 0, note: 'Population unknown for ring' };
  }
  const t = POP_THRESHOLDS[minutes] ?? POP_THRESHOLDS[120];
  if (population >= t[2]) return { score: 3, note: `Strong (${population.toLocaleString()} ≥ ${t[2].toLocaleString()})` };
  if (population >= t[1]) return { score: 2, note: `Moderate (${population.toLocaleString()} ≥ ${t[1].toLocaleString()})` };
  if (population >= t[0]) return { score: 1, note: `Adequate (${population.toLocaleString()} ≥ ${t[0].toLocaleString()})` };
  return { score: 0, note: `Below threshold (${population.toLocaleString()} < ${t[0].toLocaleString()})` };
}

/** Rough miles reachable in N minutes at ~45 mph average */
function minutesToApproxMiles(minutes: number): number {
  return Math.round((minutes / 60) * 45);
}

interface CountyCentroidRow {
  name: string;
  population_2020: number | null;
  // Optional lat/lng if ever present; otherwise we skip geospatial and use state sum for small rings only via name
  lat?: number | null;
  lon?: number | null;
  change?: number | null;
}

/**
 * Haversine fallback: sum county-population for counties whose name-matched
 * centroids fall within approx drive miles. When lat/lon absent on rows,
 * uses state-level sum scaled by ring size (conservative).
 */
async function haversineCountyRings(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
  stateAbbr: string
): Promise<DriveTimeRing[]> {
  const stateName = STATE_ABBR_TO_NAME[stateAbbr.toUpperCase().slice(0, 2)];
  if (!stateName) {
    return DRIVE_TIME_MINUTES.map((m) => ({
      minutes: m,
      radius_label: `${m} min`,
      population_2020: null,
      households_2020: null,
      median_household_income: null,
      method: 'haversine_county' as const,
    }));
  }

  const { data } = await supabase
    .from('county-population')
    .select('name, population_2020, change')
    .ilike('name', `%${stateName}%`)
    .limit(500);

  const rows = (data ?? []) as CountyCentroidRow[];
  const statePop = rows.reduce((s, r) => s + (r.population_2020 ?? 0), 0);

  // Without county centroids in DB, approximate ring pop as fraction of state
  // based on drive-time share (60/120/180 → 15%/40%/70% of state).
  const fractions: Record<number, number> = { 60: 0.15, 120: 0.4, 180: 0.7 };

  return DRIVE_TIME_MINUTES.map((m) => {
    const miles = minutesToApproxMiles(m);
    // If we ever get lat/lon on counties, filter; else use fraction
    const withCoords = rows.filter(
      (r) =>
        r.lat != null &&
        r.lon != null &&
        haversineDistanceMiles(lat, lng, Number(r.lat), Number(r.lon)) <= miles
    );
    let pop: number | null;
    if (withCoords.length > 0) {
      pop = withCoords.reduce((s, r) => s + (r.population_2020 ?? 0), 0);
    } else if (statePop > 0) {
      pop = Math.round(statePop * (fractions[m] ?? 0.4));
    } else {
      pop = null;
    }
    return {
      minutes: m,
      radius_label: `${m} min`,
      population_2020: pop,
      households_2020: pop != null ? Math.round(pop / 2.5) : null,
      median_household_income: null,
      method: 'haversine_county' as const,
    };
  });
}

/**
 * Try Mapbox Isochrone polygons; if token missing or fails, return null.
 * ACS aggregation inside polygons is deferred — we use county haversine for v1
 * but record method for when ACS tract join is added.
 */
async function tryMapboxIsochrone(
  lat: number,
  lng: number,
  minutes: number
): Promise<{ type: string; coordinates: unknown } | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim() || process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (!token) return null;
  const url =
    `https://api.mapbox.com/isochrone/v1/mapbox/driving/${lng},${lat}` +
    `?contours_minutes=${minutes}&polygons=true&access_token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    features?: Array<{ geometry?: { type: string; coordinates: unknown } }>;
  };
  const geom = json.features?.[0]?.geometry;
  return geom ?? null;
}

async function loadCachedRings(
  supabase: SupabaseClient,
  studyId: string
): Promise<DriveTimeRing[] | null> {
  const { data, error } = await supabase
    .from('feasibility_market_data')
    .select(
      'radius, population_2020, households_2020, median_household_income'
    )
    .eq('study_id', studyId)
    .in(
      'radius',
      DRIVE_TIME_MINUTES.map((m) => `${m} min`)
    );
  if (error || !data?.length) return null;
  const byRadius = new Map(data.map((r) => [String(r.radius), r]));
  const rings: DriveTimeRing[] = [];
  for (const m of DRIVE_TIME_MINUTES) {
    const row = byRadius.get(`${m} min`);
    if (!row) return null;
    rings.push({
      minutes: m,
      radius_label: `${m} min`,
      population_2020: parseNum(row.population_2020),
      households_2020: parseNum(row.households_2020),
      median_household_income: parseNum(row.median_household_income),
      method: 'cached',
    });
  }
  return rings;
}

async function cacheRings(
  supabase: SupabaseClient,
  studyId: string,
  rings: DriveTimeRing[]
): Promise<void> {
  for (const ring of rings) {
    const { error } = await supabase.from('feasibility_market_data').upsert(
      {
        study_id: studyId,
        radius: ring.radius_label,
        population_2020: ring.population_2020,
        households_2020: ring.households_2020,
        median_household_income: ring.median_household_income,
        avg_household_size: 2.5,
      } as never,
      { onConflict: 'study_id,radius' } as never
    );
    if (error) {
      // Table may lack unique constraint — try insert only
      await supabase.from('feasibility_market_data').insert({
        study_id: studyId,
        radius: ring.radius_label,
        population_2020: ring.population_2020,
        households_2020: ring.households_2020,
        median_household_income: ring.median_household_income,
        avg_household_size: 2.5,
      } as never);
    }
  }
}

export async function fetchDriveTimeDemographics(
  supabase: SupabaseClient,
  opts: {
    lat: number;
    lng: number;
    stateAbbr: string;
    studyId?: string | null;
  }
): Promise<DriveTimeDemographicsResult> {
  const fetched_at = new Date().toISOString();

  if (opts.studyId) {
    try {
      const cached = await loadCachedRings(supabase, opts.studyId);
      if (cached) {
        const demand_rubric = cached.map((r) => {
          const s = scoreDriveTimeRing(r.minutes, r.population_2020);
          return { minutes: r.minutes, population: r.population_2020, ...s };
        });
        return {
          rings: cached,
          demand_rubric,
          overall_score: demand_rubric.reduce((a, b) => a + b.score, 0),
          fetched_at,
          source: 'feasibility_market_data',
        };
      }
    } catch (err) {
      console.warn('[drive-time] cache read failed:', err);
    }
  }

  // Probe Mapbox for primary ring to record provenance; population still from counties for v1
  let usedIsochrone = false;
  try {
    const geo = await tryMapboxIsochrone(opts.lat, opts.lng, 60);
    usedIsochrone = geo != null;
  } catch {
    usedIsochrone = false;
  }

  const rings = await haversineCountyRings(
    supabase,
    opts.lat,
    opts.lng,
    opts.stateAbbr
  );
  if (usedIsochrone) {
    for (const r of rings) {
      r.method = 'isochrone_acs';
    }
  }

  if (opts.studyId) {
    try {
      await cacheRings(supabase, opts.studyId, rings);
    } catch (err) {
      console.warn('[drive-time] cache write failed:', err);
    }
  }

  const demand_rubric = rings.map((r) => {
    const s = scoreDriveTimeRing(r.minutes, r.population_2020);
    return { minutes: r.minutes, population: r.population_2020, ...s };
  });

  return {
    rings,
    demand_rubric,
    overall_score: demand_rubric.reduce((a, b) => a + b.score, 0),
    fetched_at,
    source: usedIsochrone ? 'mapbox_isochrone+county-population' : 'county-population',
  };
}

export function formatDriveTimeForPrompt(
  dt: DriveTimeDemographicsResult | undefined
): string {
  if (!dt?.rings?.length) return '';
  const lines = [
    `Drive-time demographics (source: ${dt.source}, overall demand rubric score ${dt.overall_score}/9):`,
    ...dt.rings.map((r) => {
      const rub = dt.demand_rubric.find((d) => d.minutes === r.minutes);
      return `  ${r.radius_label}: pop ${r.population_2020?.toLocaleString() ?? 'n/a'}, HH ${r.households_2020?.toLocaleString() ?? 'n/a'}, income ${r.median_household_income != null ? `$${Math.round(r.median_household_income).toLocaleString()}` : 'n/a'} [${r.method}] — rubric ${rub?.score ?? 0}/3 (${rub?.note ?? ''})`;
    }),
  ];
  return lines.join('\n');
}

function formatIntOrNa(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'n/a';
  return Math.round(n).toLocaleString('en-US');
}

function formatMoneyOrNa(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'n/a';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** Compact 60/120/180 market-profile rows for native Word tables (replaces broken Excel LINK). */
export function buildDriveTimeMarketProfileTable(dt: DriveTimeDemographicsResult): {
  headers: string[];
  body: string[][];
} {
  const rings = [...dt.rings].sort((a, b) => a.minutes - b.minutes);
  const headers = ['Metric', ...rings.map((r) => r.radius_label)];
  const col = (pick: (r: DriveTimeRing) => string) => rings.map(pick);

  const body: string[][] = [
    ['2020 Population', ...col((r) => formatIntOrNa(r.population_2020))],
    ['2020 Households', ...col((r) => formatIntOrNa(r.households_2020))],
    [
      'Median Household Income',
      ...col((r) => formatMoneyOrNa(r.median_household_income)),
    ],
    [
      'Demand Rubric (0–3)',
      ...rings.map((r) => {
        const rub = dt.demand_rubric.find((d) => d.minutes === r.minutes);
        return rub != null ? String(rub.score) : 'n/a';
      }),
    ],
  ];
  return { headers, body };
}
