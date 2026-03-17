/**
 * Enrich report draft input with DB benchmarks, geocoding, Census/GDP, web research,
 * and comparables from all sources (Supabase market tables, past reports, Tavily).
 *
 * Phase 1 (parallel): benchmarks, geocoding, county data, Census API, web context,
 *                      past report comps, Tavily comp research
 * Phase 2 (sequential, needs geocode): merge all comp sources via fetchNearbyComps
 */

import { createServerClient } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/geocode';
import { normaliseUnitCategory } from '@/lib/csv/feasibility-parser';
import { fetchCountyLookups } from '@/lib/anchor-point-insights/fetch-county-data';
import { fetchCensusStateDemographics } from './census-api';
import { fetchWebContextForReport } from './tavily-context';
import { fetchNearbyComps } from './fetch-comps';
import { fetchPastReportComps } from './fetch-past-report-comps';
import { fetchTavilyComps } from './tavily-comp-research';
import { fetchWeatherSparkData } from './weatherspark';
import type { ReportDraftInput, EnrichedInput, BenchmarkRow, ComparableProperty } from './types';
import type { WeatherSparkData } from './weatherspark';

function buildComparablesSummary(comps: ComparableProperty[]): string {
  return comps
    .slice(0, 8)
    .map((c) => {
      const loc = [c.city, c.state].filter(Boolean).join(', ');
      const dist = c.distance_miles >= 0 ? ` – ${c.distance_miles} mi` : '';
      const rate = c.avg_retail_daily_rate ? ` $${Math.round(c.avg_retail_daily_rate)}/night` : '';
      const src = c.source_table === 'past_reports' ? ' [past report]'
        : c.source_table === 'tavily_web_research' ? ' [web]'
        : '';
      return `${c.property_name} (${loc}${dist}${rate})${src}`;
    })
    .join('; ');
}

export async function enrichReportInput(input: ReportDraftInput): Promise<EnrichedInput> {
  const enriched: EnrichedInput = { ...input };
  const supabase = createServerClient();

  const unitCategories = [
    ...new Set(input.unit_mix.map((u) => normaliseUnitCategory(u.type))),
  ].filter(Boolean);

  const state = input.state?.trim();

  // Phase 1: run all independent data fetches in parallel
  const [benchResult, coords, countyLookups, censusData, webContext, pastReportComps, tavilyComps, weatherSparkResult] =
    await Promise.all([
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
      // Geocode
      geocodeAddress(
        input.address_1 || '',
        input.city,
        input.state,
        input.zip_code || '',
        'USA',
      ),
      // State-level Census population + BEA GDP
      fetchCountyLookups(supabase),
      // Optional Census API (fresh ACS data)
      input.include_web_research && state
        ? fetchCensusStateDemographics(state)
        : Promise.resolve({ population: null, median_household_income: null }),
      // General web context via Tavily (tourism, market overview)
      input.include_web_research ? fetchWebContextForReport(input) : Promise.resolve(null),
      // Past Sage report comps (feasibility_comparables + feasibility_comp_units)
      state
        ? fetchPastReportComps(supabase, state, input.market_type, input.study_id).catch((err) => {
            console.warn('[enrich] Past report comps failed:', err);
            return [] as ComparableProperty[];
          })
        : Promise.resolve([] as ComparableProperty[]),
      // Tavily comp-specific web research
      input.include_web_research && state
        ? fetchTavilyComps(input.city, state, input.market_type).catch((err) => {
            console.warn('[enrich] Tavily comp research failed:', err);
            return [] as ComparableProperty[];
          })
        : Promise.resolve([] as ComparableProperty[]),
      // WeatherSpark climate data for Demand Indicators
      input.include_web_research && state
        ? fetchWeatherSparkData(input.city, state).catch((err) => {
            console.warn('[enrich] WeatherSpark fetch failed:', err);
            return null as WeatherSparkData | null;
          })
        : Promise.resolve(null as WeatherSparkData | null),
    ]);

  // Process benchmarks
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
      }),
    ) as BenchmarkRow[];
  }

  // Phase 2: merge all comp sources (DB tables need geocode for lat/lng)
  if (coords) {
    enriched.latitude = coords.lat;
    enriched.longitude = coords.lng;

    try {
      const nearbyComps = await fetchNearbyComps(
        supabase,
        coords.lat,
        coords.lng,
        state ?? '',
        input.market_type,
        { pastReportComps, tavilyComps },
      );
      if (nearbyComps.length > 0) {
        enriched.nearby_comps = nearbyComps;
        enriched.comparables_summary = buildComparablesSummary(nearbyComps);
      }
    } catch (err) {
      console.warn('[enrich] Nearby comps fetch failed:', err);
      // If DB query fails, still use past reports + Tavily
      const fallbackComps = [...pastReportComps, ...tavilyComps];
      if (fallbackComps.length > 0) {
        enriched.nearby_comps = fallbackComps;
        enriched.comparables_summary = buildComparablesSummary(fallbackComps);
      }
    }
  } else if (pastReportComps.length > 0 || tavilyComps.length > 0) {
    // No geocode but still have comps from other sources
    enriched.nearby_comps = [...pastReportComps, ...tavilyComps];
    enriched.comparables_summary = buildComparablesSummary(enriched.nearby_comps);
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

  if (weatherSparkResult) {
    enriched.weather_data = {
      url: weatherSparkResult.url,
      climate_text: weatherSparkResult.climate_text,
      image_urls: weatherSparkResult.image_urls,
      city: weatherSparkResult.city,
      state: weatherSparkResult.state,
    };
  }

  // Build enrichment metadata with all data sources
  const dataSources: string[] = ['feasibility_comp_units', 'geocode'];
  if (enriched.nearby_comps?.length) {
    const compSources = [...new Set(enriched.nearby_comps.map((c) => c.source_table))];
    dataSources.push(...compSources);
  }
  if (state && countyLookups) {
    dataSources.push('county-population', 'county-gdp');
  }
  if (censusData?.population != null) dataSources.push('census_api');
  if (webContext) dataSources.push('tavily_market_context');
  if (weatherSparkResult) dataSources.push('weatherspark');

  enriched.enrichment_metadata = {
    benchmark_sample_count: enriched.benchmarks?.reduce((sum, b) => sum + b.sample_count, 0) ?? 0,
    benchmark_categories: enriched.benchmarks?.map((b) => b.unit_category) ?? [],
    enrichment_date: new Date().toISOString(),
    data_sources: dataSources,
  };

  return enriched;
}
