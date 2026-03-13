/**
 * Fetch comparable properties from past Sage reports (feasibility_comparables + feasibility_comp_units).
 * Pulls comp data from previously completed feasibility studies in the same region,
 * providing rate/occupancy data that was manually verified and curated.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComparableProperty, SeasonalRates } from './types';

const MAX_PAST_REPORT_COMPS = 10;

const EMPTY_SEASONAL: SeasonalRates = {
  winter_weekday: null, winter_weekend: null,
  spring_weekday: null, spring_weekend: null,
  summer_weekday: null, summer_weekend: null,
  fall_weekday: null, fall_weekend: null,
};

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Query feasibility_comparables + feasibility_comp_units for properties
 * from past reports in the same state (or nearby states).
 */
export async function fetchPastReportComps(
  supabase: SupabaseClient,
  state: string,
  marketType?: string | null,
  currentStudyId?: string | null,
): Promise<ComparableProperty[]> {
  const stateUpper = state.trim().toUpperCase().slice(0, 2);

  const { data: pastComps, error: compsError } = await supabase
    .from('feasibility_comparables' as any)
    .select(`
      id,
      comp_name,
      overview,
      amenities,
      distance_miles,
      total_sites,
      quality_score,
      property_type,
      state,
      study_id,
      report_id
    `)
    .or(`state.eq.${stateUpper},state.ilike.%${state.trim()}%`)
    .not('comp_name', 'eq', '')
    .order('quality_score', { ascending: false, nullsFirst: false })
    .limit(50);

  if (compsError || !pastComps || pastComps.length === 0) {
    if (compsError) {
      console.warn('[fetch-past-report-comps] Query error:', compsError.message);
    }
    return [];
  }

  const filteredComps = (pastComps as any[]).filter((c) => {
    if (currentStudyId && c.study_id === currentStudyId) return false;
    return true;
  });

  if (filteredComps.length === 0) return [];

  const compIds = filteredComps.map((c) => c.id);

  const { data: unitRows, error: unitsError } = await supabase
    .from('feasibility_comp_units' as any)
    .select(`
      comparable_id,
      property_name,
      unit_type,
      unit_category,
      num_units,
      low_adr,
      peak_adr,
      avg_annual_adr,
      low_occupancy,
      peak_occupancy,
      quality_score
    `)
    .in('comparable_id', compIds)
    .limit(500);

  if (unitsError) {
    console.warn('[fetch-past-report-comps] Units query error:', unitsError.message);
  }

  const unitsByCompId = new Map<string, any[]>();
  if (unitRows) {
    for (const u of unitRows as any[]) {
      const arr = unitsByCompId.get(u.comparable_id) || [];
      arr.push(u);
      unitsByCompId.set(u.comparable_id, arr);
    }
  }

  const results: ComparableProperty[] = [];

  for (const comp of filteredComps) {
    const units = unitsByCompId.get(comp.id) || [];

    if (units.length > 0) {
      for (const unit of units) {
        const avgAdr = parseNum(unit.avg_annual_adr)
          ?? (parseNum(unit.low_adr) && parseNum(unit.peak_adr)
            ? ((parseNum(unit.low_adr)! + parseNum(unit.peak_adr)!) / 2)
            : null);

        results.push({
          property_name: comp.comp_name,
          city: '',
          state: comp.state ?? stateUpper,
          unit_type: unit.unit_type ?? unit.unit_category ?? null,
          property_total_sites: parseNum(comp.total_sites),
          quantity_of_units: parseNum(unit.num_units),
          avg_retail_daily_rate: avgAdr,
          high_rate: parseNum(unit.peak_adr),
          low_rate: parseNum(unit.low_adr),
          seasonal_rates: { ...EMPTY_SEASONAL },
          operating_season_months: null,
          url: null,
          description: comp.overview ?? null,
          distance_miles: parseNum(comp.distance_miles) ?? -1,
          source_table: 'past_reports',
          amenities: comp.amenities ?? null,
          quality_score: parseNum(unit.quality_score) ?? parseNum(comp.quality_score) ?? null,
          past_report_study_id: comp.study_id ?? null,
          low_occupancy: parseNum(unit.low_occupancy),
          peak_occupancy: parseNum(unit.peak_occupancy),
        });
      }
    } else {
      results.push({
        property_name: comp.comp_name,
        city: '',
        state: comp.state ?? stateUpper,
        unit_type: comp.property_type ?? null,
        property_total_sites: parseNum(comp.total_sites),
        quantity_of_units: null,
        avg_retail_daily_rate: null,
        high_rate: null,
        low_rate: null,
        seasonal_rates: { ...EMPTY_SEASONAL },
        operating_season_months: null,
        url: null,
        description: comp.overview ?? null,
        distance_miles: parseNum(comp.distance_miles) ?? -1,
        source_table: 'past_reports',
        amenities: comp.amenities ?? null,
        quality_score: parseNum(comp.quality_score) ?? null,
        past_report_study_id: comp.study_id ?? null,
        low_occupancy: null,
        peak_occupancy: null,
      });
    }
  }

  const seen = new Set<string>();
  const deduped = results.filter((c) => {
    const key = `${c.property_name.toLowerCase()}-${c.unit_type?.toLowerCase() ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));

  console.log(
    `[fetch-past-report-comps] Found ${deduped.length} comps from past reports in ${state}`,
  );
  return deduped.slice(0, MAX_PAST_REPORT_COMPS);
}
