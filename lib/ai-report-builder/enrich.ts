/**
 * Enrich report draft input with DB benchmarks, geocoding, Census/GDP, and optional web research
 * Runs benchmarks, comparables, geocode, county lookups (and optionally Tavily) in parallel for performance
 */

import { createServerClient } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/geocode';
import { normaliseUnitCategory } from '@/lib/csv/feasibility-parser';
import { fetchCountyLookups } from '@/lib/anchor-point-insights/fetch-county-data';
import { fetchCensusStateDemographics } from './census-api';
import { fetchWebContextForReport } from './tavily-context';
import type { ReportDraftInput, EnrichedInput, BenchmarkRow } from './types';

export async function enrichReportInput(input: ReportDraftInput): Promise<EnrichedInput> {
  const enriched: EnrichedInput = { ...input };
  const supabase = createServerClient();

  const unitCategories = [
    ...new Set(input.unit_mix.map((u) => normaliseUnitCategory(u.type))),
  ].filter(Boolean);

  const state = input.state?.trim();

  // Run benchmarks, comparables, geocode, county lookups, optional Census API, and optional web research in parallel
  const [benchResult, compsResult, coords, countyLookups, censusData, webContext] = await Promise.all([
    // Benchmarks: aggregate feasibility_comp_units by unit_category
    unitCategories.length > 0
      ? supabase
          .from('feasibility_comp_units')
          .select('unit_category, low_adr, peak_adr')
          .in('unit_category', unitCategories)
          .not('low_adr', 'is', null)
          .not('peak_adr', 'is', null)
          .limit(5000)
      : Promise.resolve({ data: [] }),
    // Comparables from same state
    state
      ? supabase
          .from('feasibility_comparables')
          .select('comp_name')
          .eq('state', state)
          .not('comp_name', 'is', null)
          .limit(5)
      : Promise.resolve({ data: [] }),
    // Geocode (includes address_1 for better accuracy)
    geocodeAddress(
      input.address_1 || '',
      input.city,
      input.state,
      input.zip_code || '',
      'USA'
    ),
    // State-level Census population + BEA GDP (county-population, county-gdp)
    fetchCountyLookups(supabase),
    // Optional Census API (fresh ACS data when include_web_research)
    input.include_web_research && state
      ? fetchCensusStateDemographics(state)
      : Promise.resolve({ population: null, median_household_income: null }),
    // Optional web research via Tavily (tourism, market context)
    input.include_web_research ? fetchWebContextForReport(input) : Promise.resolve(null),
  ]);

  const benchData = benchResult.data;
  if (benchData && benchData.length > 0) {
    const byCategory = new Map<string, { low: number[]; peak: number[] }>();
    for (const row of benchData) {
      const cat = row.unit_category || 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, { low: [], peak: [] });
      const arr = byCategory.get(cat)!;
      if (typeof row.low_adr === 'number') arr.low.push(row.low_adr);
      if (typeof row.peak_adr === 'number') arr.peak.push(row.peak_adr);
    }
    enriched.benchmarks = Array.from(byCategory.entries()).map(
      ([unit_category, { low, peak }]) => ({
        unit_category,
        avg_low_adr: low.length ? low.reduce((a, b) => a + b, 0) / low.length : 0,
        avg_peak_adr: peak.length ? peak.reduce((a, b) => a + b, 0) / peak.length : 0,
        sample_count: Math.max(low.length, peak.length),
      })
    ) as BenchmarkRow[];
  }

  const comps = compsResult.data;
  if (comps && comps.length > 0) {
    enriched.comparables_summary = comps
      .map((c) => c.comp_name)
      .filter(Boolean)
      .join(', ');
  }

  if (coords) {
    enriched.latitude = coords.lat;
    enriched.longitude = coords.lng;
  }

  if (webContext) {
    enriched.web_context = webContext;
  }

  if (state && countyLookups) {
    const stateAbbr = state.toUpperCase().slice(0, 2);
    const pop = countyLookups.statePopulationLookup[stateAbbr];
    const gdp = countyLookups.stateGDPLookup[stateAbbr];
    if (pop) {
      enriched.population_2010 = pop.population_2010;
      enriched.population_2020 = pop.population_2020;
      if (pop.population_2010 > 0) {
        enriched.population_change_pct =
          ((pop.population_2020 - pop.population_2010) / pop.population_2010) * 100;
      }
    }
    if (gdp) {
      enriched.gdp_2022 = gdp.gdp_2022;
      enriched.gdp_2023 = gdp.gdp_2023;
    }
  }

  if (censusData?.population != null) {
    enriched.census_population = censusData.population;
  }
  if (censusData?.median_household_income != null) {
    enriched.census_median_household_income = censusData.median_household_income;
  }

  const dataSources: string[] = ['feasibility_comp_units', 'feasibility_comparables', 'geocode'];
  if (state && countyLookups) {
    dataSources.push('county-population');
    dataSources.push('county-gdp');
  }
  if (censusData?.population != null) dataSources.push('census_api');
  if (webContext) dataSources.push('tavily');

  enriched.enrichment_metadata = {
    benchmark_sample_count: enriched.benchmarks?.reduce((sum, b) => sum + b.sample_count, 0) ?? 0,
    benchmark_categories: enriched.benchmarks?.map((b) => b.unit_category) ?? [],
    enrichment_date: new Date().toISOString(),
    data_sources: dataSources,
  };

  return enriched;
}
