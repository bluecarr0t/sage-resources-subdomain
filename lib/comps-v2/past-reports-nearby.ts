/**
 * Past feasibility comparables near an anchor: match coordinates via market tables or geocode overview.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComparableProperty, SeasonalRates } from '@/lib/ai-report-builder/types';
import { geocodePlaceLine } from '@/lib/geocode';
import { haversineDistanceMiles, parseNum, STATE_ABBR_TO_NAME } from '@/lib/comps-v2/geo';
import { parseLocationAndState } from '@/lib/feasibility-utils';

const EMPTY_SEASONAL: SeasonalRates = {
  winter_weekday: null,
  winter_weekend: null,
  spring_weekday: null,
  spring_weekend: null,
  summer_weekday: null,
  summer_weekend: null,
  fall_weekday: null,
  fall_weekend: null,
};

function locationSnippetFromOverview(overview: string | null): string | null {
  if (!overview?.trim()) return null;
  const m = overview.match(/Location:\s*([^.]+)/i);
  return m?.[1]?.trim() ?? null;
}

function shortNameForMatch(name: string): string {
  const t = name.trim().slice(0, 60);
  return t.replace(/[%_\\]/g, '');
}

async function tryMatchGlampingCoords(
  supabase: SupabaseClient,
  propertyName: string,
  stateAbbr: string
): Promise<{ lat: number; lon: number } | null> {
  const short = shortNameForMatch(propertyName);
  if (short.length < 3) return null;
  const { data, error } = await supabase
    .from('all_glamping_properties' as never)
    .select('lat, lon')
    .ilike('property_name', `%${short}%`)
    .eq('state', stateAbbr)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .limit(1);

  if (error || !data?.[0]) return null;
  const lat = parseNum((data[0] as { lat?: unknown }).lat);
  const lon = parseNum((data[0] as { lon?: unknown }).lon);
  if (lat == null || lon == null) return null;
  return { lat, lon };
}

async function tryMatchRoverpassCoords(
  supabase: SupabaseClient,
  propertyName: string,
  stateFullName: string,
  stateAbbr: string
): Promise<{ lat: number; lon: number } | null> {
  const short = shortNameForMatch(propertyName);
  if (short.length < 3) return null;
  const { data, error } = await supabase
    .from('all_roverpass_data_new' as never)
    .select('lat, lon, state')
    .ilike('property_name', `%${short}%`)
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .limit(5);

  if (error || !data?.length) return null;
  const upperAbbr = stateAbbr.toUpperCase();
  for (const row of data as { lat?: unknown; lon?: unknown; state?: string }[]) {
    const st = (row.state ?? '').trim();
    const stUp = st.toUpperCase();
    if (
      stUp === stateFullName.toUpperCase() ||
      stUp === upperAbbr ||
      stUp.endsWith(upperAbbr)
    ) {
      const lat = parseNum(row.lat);
      const lon = parseNum(row.lon);
      if (lat != null && lon != null) return { lat, lon };
    }
  }
  const lat0 = parseNum((data[0] as { lat?: unknown }).lat);
  const lon0 = parseNum((data[0] as { lon?: unknown }).lon);
  if (lat0 != null && lon0 != null) return { lat: lat0, lon: lon0 };
  return null;
}

async function resolveAnchorCoordsForPastComp(
  supabase: SupabaseClient,
  propertyName: string,
  overview: string | null,
  stateAbbr: string,
  geocodeBudget: { left: number }
): Promise<{ lat: number; lon: number } | null> {
  const g = await tryMatchGlampingCoords(supabase, propertyName, stateAbbr);
  if (g) return g;
  const full = STATE_ABBR_TO_NAME[stateAbbr.toUpperCase()] ?? stateAbbr;
  const r = await tryMatchRoverpassCoords(supabase, propertyName, full, stateAbbr);
  if (r) return r;

  const loc = locationSnippetFromOverview(overview);
  if (!loc || geocodeBudget.left <= 0) return null;

  const parsed = parseLocationAndState(loc);
  const line = parsed
    ? `${parsed.locationFormatted}, USA`
    : loc.includes(',')
      ? `${loc}, USA`
      : `${loc}, ${stateAbbr}, USA`;

  geocodeBudget.left -= 1;
  const geo = await geocodePlaceLine(line);
  if (!geo) return null;
  return { lat: geo.lat, lon: geo.lng };
}

/** Escape `%` / `_` for PostgREST `ilike` patterns. */
function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Past report comp rows within `radiusMiles` of anchor when coordinates resolve; otherwise
 * still include rows scoped to the same state as the search (matches /admin/comps `reports.state` filter).
 *
 * Previously only `feasibility_comparables.state` was used — that column is often empty while
 * `reports.state` holds the job state (TX, etc.), so past comps disappeared entirely.
 */
export async function fetchPastReportCompsNearAnchor(
  supabase: SupabaseClient,
  anchorLat: number,
  anchorLng: number,
  stateInput: string,
  radiusMiles: number,
  maxGeocodes = 25
): Promise<ComparableProperty[]> {
  const stateUpper = stateInput.trim().toUpperCase().slice(0, 2);
  const stateFullName = STATE_ABBR_TO_NAME[stateUpper] ?? '';
  const geocodeBudget = { left: maxGeocodes };

  const orParts = [
    `reports.state.eq.${stateUpper}`,
    `state.eq.${stateUpper}`,
  ];
  if (stateFullName) {
    const esc = escapeIlikePattern(stateFullName);
    orParts.push(`reports.state.ilike.%${esc}%`);
    orParts.push(`state.ilike.%${esc}%`);
  }

  const selectCols =
    `id, comp_name, overview, amenities, distance_miles, total_sites, quality_score, property_type, state, study_id,
     reports!inner(state)`;

  let pastComps: Record<string, unknown>[] | null = null;
  let compsError: { message: string } | null = null;

  const primary = await supabase
    .from('feasibility_comparables' as never)
    .select(selectCols)
    .or(orParts.join(','))
    .not('comp_name', 'eq', '')
    .order('quality_score', { ascending: false, nullsFirst: false })
    .limit(150);

  if (primary.error) {
    console.warn('[past-reports-nearby] Primary query error, falling back to reports.state only:', primary.error.message);
    const fallback = await supabase
      .from('feasibility_comparables' as never)
      .select(selectCols)
      .eq('reports.state', stateUpper)
      .not('comp_name', 'eq', '')
      .order('quality_score', { ascending: false, nullsFirst: false })
      .limit(150);
    pastComps = (fallback.data as Record<string, unknown>[]) ?? null;
    compsError = fallback.error;
  } else {
    pastComps = (primary.data as Record<string, unknown>[]) ?? null;
    compsError = primary.error;
  }

  if (compsError || !pastComps?.length) {
    if (compsError) {
      console.warn('[past-reports-nearby] Query error:', compsError.message);
    }
    return [];
  }

  const compIds = (pastComps as { id: string }[]).map((c) => c.id);
  const { data: unitRows, error: unitsError } = await supabase
    .from('feasibility_comp_units' as never)
    .select(
      `comparable_id, property_name, unit_type, unit_category, num_units, low_adr, peak_adr, avg_annual_adr, low_occupancy, peak_occupancy, quality_score`
    )
    .in('comparable_id', compIds)
    .limit(800);

  if (unitsError) {
    console.warn('[past-reports-nearby] Units error:', unitsError.message);
  }

  const unitsByCompId = new Map<string, Record<string, unknown>[]>();
  if (unitRows) {
    for (const u of unitRows as Record<string, unknown>[]) {
      const cid = String(u.comparable_id ?? '');
      const arr = unitsByCompId.get(cid) || [];
      arr.push(u);
      unitsByCompId.set(cid, arr);
    }
  }

  const expanded: ComparableProperty[] = [];

  for (const comp of pastComps as Record<string, unknown>[]) {
    const compId = String(comp.id ?? '');
    const compName = String(comp.comp_name ?? '');
    const units = unitsByCompId.get(compId) || [];

    const pushRow = (partial: Partial<ComparableProperty>) => {
      expanded.push({
        property_name: compName,
        city: '',
        state: (comp.state as string) ?? stateUpper,
        unit_type: partial.unit_type ?? null,
        property_total_sites: parseNum(comp.total_sites),
        quantity_of_units: partial.quantity_of_units ?? null,
        avg_retail_daily_rate: partial.avg_retail_daily_rate ?? null,
        high_rate: partial.high_rate ?? null,
        low_rate: partial.low_rate ?? null,
        seasonal_rates: { ...EMPTY_SEASONAL },
        operating_season_months: null,
        url: null,
        description: (comp.overview as string) ?? null,
        distance_miles: null,
        source_table: 'past_reports',
        amenities: (comp.amenities as string) ?? null,
        quality_score: partial.quality_score ?? parseNum(comp.quality_score),
        past_report_study_id: (comp.study_id as string) ?? null,
        low_occupancy: partial.low_occupancy ?? null,
        peak_occupancy: partial.peak_occupancy ?? null,
      });
    };

    if (units.length > 0) {
      for (const unit of units) {
        const avgAdr =
          parseNum(unit.avg_annual_adr) ??
          (parseNum(unit.low_adr) && parseNum(unit.peak_adr)
            ? (parseNum(unit.low_adr)! + parseNum(unit.peak_adr)!) / 2
            : null);
        pushRow({
          unit_type: (unit.unit_type as string) ?? (unit.unit_category as string) ?? null,
          quantity_of_units: parseNum(unit.num_units),
          avg_retail_daily_rate: avgAdr,
          high_rate: parseNum(unit.peak_adr),
          low_rate: parseNum(unit.low_adr),
          quality_score: parseNum(unit.quality_score) ?? parseNum(comp.quality_score),
          low_occupancy: parseNum(unit.low_occupancy),
          peak_occupancy: parseNum(unit.peak_occupancy),
        });
      }
    } else {
      pushRow({
        unit_type: (comp.property_type as string) ?? null,
        quality_score: parseNum(comp.quality_score),
      });
    }
  }

  const withDistance: ComparableProperty[] = [];

  for (const row of expanded) {
    const coords = await resolveAnchorCoordsForPastComp(
      supabase,
      row.property_name,
      row.description ?? null,
      stateUpper,
      geocodeBudget
    );
    if (coords) {
      const dist = haversineDistanceMiles(anchorLat, anchorLng, coords.lat, coords.lon);
      if (dist > radiusMiles) continue;
      withDistance.push({
        ...row,
        distance_miles: Math.round(dist * 10) / 10,
        geo_lat: coords.lat,
        geo_lng: coords.lon,
      });
    } else {
      // Same-state past comps still count for discovery when we cannot match coords / geocode
      // (admin /comps lists these without a map radius).
      withDistance.push({
        ...row,
        distance_miles: null,
        geo_lat: null,
        geo_lng: null,
      });
    }
  }

  const seen = new Set<string>();
  return withDistance.filter((c) => {
    const key = `${c.property_name.toLowerCase()}-${(c.unit_type ?? '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
