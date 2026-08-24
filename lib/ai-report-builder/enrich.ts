/**
 * Enrich report draft input with DB benchmarks, geocoding, county metrics,
 * demand drivers, drive-time demographics, site risk, STVR indicators,
 * tourism economics, and comparables from all sources.
 */

import { createServerClient } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/geocode';
import { normaliseUnitCategory } from '@/lib/csv/feasibility-parser';
import { fetchCountyLookups } from '@/lib/anchor-point-insights/fetch-county-data';
import { fetchCountyMetrics } from '@/lib/market-report/county-metrics';
import { fetchDemandDrivers } from '@/lib/market-report/demand-drivers';
import { fetchCensusStateDemographics } from './census-api';
import { fetchWebContextForReport } from './tavily-context';
import { fetchNearbyComps } from './fetch-comps';
import { fetchPastReportComps } from './fetch-past-report-comps';
import { attachSubjectDistanceToWebComps, fetchTavilyComps, gapFillComparableDetails } from './tavily-comp-research';
import { fetchWeatherSparkData } from './weatherspark';
import type { WeatherSparkData } from './weatherspark';
import { fetchCompRadiusPivots } from './comp-radius-pivots';
import { fetchDriveTimeDemographics } from './drive-time-demographics';
import { fetchSiteRisk } from './site-risk';
import { fetchMarketOccupancyIndicators } from './stvr-indicators';
import { fetchTourismEconomics } from './tourism-economics';
import { fetchNearestAirport } from './nearest-airport';
import {
  researchedStateParksToDemandItems,
  researchNearbyStateParks,
} from './state-parks-research';
import { selectStateParkRows } from './park-visitation';
import type {
  ReportDraftInput,
  EnrichedInput,
  BenchmarkRow,
  ComparableProperty,
  CountyMetricsBlock,
  DemandDriversBlock,
} from './types';

function buildComparablesSummary(comps: ComparableProperty[]): string {
  return comps
    .slice(0, 8)
    .map((c) => {
      const loc = [c.city, c.state].filter(Boolean).join(', ');
      const dist =
        c.distance_miles != null && Number.isFinite(c.distance_miles) ? ` – ${c.distance_miles} mi` : '';
      const rate = c.avg_retail_daily_rate ? ` $${Math.round(c.avg_retail_daily_rate)}/night` : '';
      const src = c.source_table === 'past_reports' ? ' [past report]'
        : c.source_table === 'tavily_web_research' ? ' [web]'
        : '';
      return `${c.property_name} (${loc}${dist}${rate})${src}`;
    })
    .join('; ');
}

function toDemandDriversBlock(
  raw: Awaited<ReturnType<typeof fetchDemandDrivers>>
): DemandDriversBlock {
  const toItems = (
    items: Array<{
      name: string;
      state: string | null;
      distance_miles: number;
      visitors?: number | null;
      siteType?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }>
  ) =>
    items.slice(0, 8).map((i) => ({
      name: i.name,
      state: i.state,
      distance_miles: i.distance_miles,
      visitors: i.visitors ?? null,
      site_type: i.siteType ?? null,
      latitude: i.latitude ?? null,
      longitude: i.longitude ?? null,
    }));
  const topNames = (items: { name: string }[]) => items.slice(0, 5).map((i) => i.name);
  return {
    national_parks: {
      count: raw.nationalParks.count,
      top_names: topNames(raw.nationalParks.top),
      items: toItems(raw.nationalParks.top),
      radius_miles: raw.nationalParks.radiusMiles,
    },
    ski_resorts: {
      count: raw.skiResorts.count,
      top_names: topNames(raw.skiResorts.top),
      items: toItems(raw.skiResorts.top),
      radius_miles: raw.skiResorts.radiusMiles,
    },
    wineries: {
      count: raw.wineries.count,
      top_names: topNames(raw.wineries.top),
      items: toItems(raw.wineries.top),
      radius_miles: raw.wineries.radiusMiles,
    },
    major_outdoor_sites: {
      count: raw.majorOutdoorSites.count,
      top_names: topNames(raw.majorOutdoorSites.top),
      items: toItems(raw.majorOutdoorSites.top),
      radius_miles: raw.majorOutdoorSites.radiusMiles,
    },
    major_cities: {
      count: raw.majorAndLargeCities.count,
      top_names: topNames(raw.majorAndLargeCities.top),
      items: toItems(raw.majorAndLargeCities.top),
      radius_miles: raw.majorAndLargeCities.radiusMiles,
    },
    source: 'national-parks,outdoor_recreation_sites,ski_resorts,wineries',
    fetched_at: new Date().toISOString(),
  };
}

function captureEnrichWarning(warnings: string[], key: string, err: unknown): null {
  console.warn(`[enrich] ${key} failed:`, err);
  warnings.push(key);
  return null;
}

export async function enrichReportInput(input: ReportDraftInput): Promise<EnrichedInput> {
  const enriched: EnrichedInput = { ...input };
  const supabase = createServerClient();
  const warnings: string[] = [];

  const unitCategories = [
    ...new Set(input.unit_mix.map((u) => normaliseUnitCategory(u.type))),
  ].filter(Boolean);

  const state = input.state?.trim();
  const stateAbbr = state ? state.toUpperCase().slice(0, 2) : '';

  // Phase 1: independent fetches (past-report comps wait for geocode so distance is to subject)
  const [benchResult, coords, countyLookups, censusData, webContext, tavilyComps, weatherSparkResult] =
    await Promise.all([
      unitCategories.length > 0
        ? supabase
            .from('feasibility_comp_units')
            .select('unit_category, low_adr, peak_adr')
            .in('unit_category', unitCategories)
            .not('low_adr', 'is', null)
            .not('peak_adr', 'is', null)
            .limit(5000)
        : Promise.resolve({ data: [] }),
      geocodeAddress(
        input.address_1 || '',
        input.city,
        input.state,
        input.zip_code || '',
        'USA',
      ),
      fetchCountyLookups(supabase),
      input.include_web_research && state
        ? fetchCensusStateDemographics(state)
        : Promise.resolve({ population: null, median_household_income: null }),
      input.include_web_research ? fetchWebContextForReport(input) : Promise.resolve(null),
      input.include_web_research && state
        ? fetchTavilyComps(input.city, state, input.market_type).catch((err) => {
            captureEnrichWarning(warnings, 'tavily_comps', err);
            return [] as ComparableProperty[];
          })
        : Promise.resolve([] as ComparableProperty[]),
      input.include_web_research && state
        ? fetchWeatherSparkData(input.city, state).catch((err) => {
            captureEnrichWarning(warnings, 'weatherspark', err);
            return null as WeatherSparkData | null;
          })
        : Promise.resolve(null as WeatherSparkData | null),
    ]);

  let pastReportComps: ComparableProperty[] = [];
  if (state) {
    try {
      pastReportComps = await fetchPastReportComps(
        supabase,
        state,
        input.market_type,
        input.study_id,
        coords
          ? { subjectLat: coords.lat, subjectLng: coords.lng }
          : undefined,
      );
    } catch (err) {
      captureEnrichWarning(warnings, 'past_report_comps', err);
      pastReportComps = [];
    }
  }

  // Attach true distance to web comps once subject geocode is known
  if (coords && tavilyComps.length > 0) {
    try {
      await attachSubjectDistanceToWebComps(tavilyComps, coords.lat, coords.lng);
    } catch (err) {
      captureEnrichWarning(warnings, 'web_comps_geocode', err);
    }
  }

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

  // Phase 2 connectors (need geocode) — each soft-fails independently
  if (coords) {
    enriched.latitude = coords.lat;
    enriched.longitude = coords.lng;

    const countyHint = input.county?.trim() || coords.countyLevel2 || null;
    const addressLine = [input.address_1, input.city, input.state, input.zip_code]
      .filter(Boolean)
      .join(', ');

    const [
      nearbyResult,
      pivotsResult,
      demandResult,
      countyMetricsResult,
      driveTimeResult,
      siteRiskResult,
      stvrResult,
      airportResult,
      tourismResult,
    ] = await Promise.all([
      fetchNearbyComps(
        supabase,
        coords.lat,
        coords.lng,
        state ?? '',
        input.market_type,
        { pastReportComps, tavilyComps },
      ).catch((err) => {
        captureEnrichWarning(warnings, 'nearby_comps', err);
        return null;
      }),
      state
        ? fetchCompRadiusPivots(supabase, coords.lat, coords.lng, state, input.market_type).catch(
            (err) => {
              captureEnrichWarning(warnings, 'comp_radius_pivots', err);
              return null;
            }
          )
        : Promise.resolve(null),
      fetchDemandDrivers(supabase, {
        anchorLat: coords.lat,
        anchorLng: coords.lng,
        // 250 mi covers destination NPS anchors (e.g. Glacier / Yellowstone from western MT)
        parksRadiusMiles: 250,
        skiRadiusMiles: 100,
        wineriesRadiusMiles: 100,
        majorOutdoorRadiusMiles: 150,
        anchorStateUsAbbr: stateAbbr || null,
      }).catch((err) => {
        captureEnrichWarning(warnings, 'demand_drivers', err);
        return null;
      }),
      stateAbbr
        ? fetchCountyMetrics(supabase, {
            stateAbbr,
            addressLine,
            countyHint,
            anchorLat: coords.lat,
            anchorLng: coords.lng,
          }).catch((err) => {
            captureEnrichWarning(warnings, 'county_metrics', err);
            return null;
          })
        : Promise.resolve(null),
      stateAbbr
        ? fetchDriveTimeDemographics(supabase, {
            lat: coords.lat,
            lng: coords.lng,
            stateAbbr,
            studyId: input.study_id,
          }).catch((err) => {
            captureEnrichWarning(warnings, 'drive_time_demographics', err);
            return null;
          })
        : Promise.resolve(null),
      fetchSiteRisk(coords.lat, coords.lng).catch((err) => {
        captureEnrichWarning(warnings, 'site_risk', err);
        return null;
      }),
      state
        ? fetchMarketOccupancyIndicators(supabase, coords.lat, coords.lng, state, 50).catch(
            (err) => {
              captureEnrichWarning(warnings, 'stvr_indicators', err);
              return null;
            }
          )
        : Promise.resolve(null),
      fetchNearestAirport(coords.lat, coords.lng).catch((err) => {
        captureEnrichWarning(warnings, 'nearest_airport', err);
        return null;
      }),
      stateAbbr
        ? fetchTourismEconomics(supabase, {
            stateAbbr,
            countyName: countyHint,
          }).catch((err) => {
            captureEnrichWarning(warnings, 'tourism_economics', err);
            return null;
          })
        : Promise.resolve(null),
    ]);

    if (nearbyResult && nearbyResult.length > 0) {
      enriched.nearby_comps = nearbyResult;
      enriched.comparables_summary = buildComparablesSummary(nearbyResult);
    } else {
      const fallbackComps = [...pastReportComps, ...tavilyComps];
      if (fallbackComps.length > 0) {
        enriched.nearby_comps = fallbackComps;
        enriched.comparables_summary = buildComparablesSummary(fallbackComps);
      }
    }

    if (enriched.nearby_comps?.length && input.include_web_research !== false) {
      try {
        await gapFillComparableDetails(enriched.nearby_comps, {
          maxLookups: 6,
          marketType: input.market_type,
        });
        enriched.comparables_summary = buildComparablesSummary(enriched.nearby_comps);
      } catch (err) {
        captureEnrichWarning(warnings, 'comp_gap_fill', err);
      }
    }

    if (pivotsResult) enriched.comp_radius_pivots = pivotsResult;
    if (demandResult) enriched.demand_drivers = toDemandDriversBlock(demandResult);

    // outdoor_recreation_sites is thinly seeded; web-research state parks when empty.
    if (
      enriched.demand_drivers &&
      selectStateParkRows(enriched.demand_drivers, 1).length === 0 &&
      state
    ) {
      try {
        const researched = await researchNearbyStateParks({
          city: input.city,
          state,
          lat: coords.lat,
          lng: coords.lng,
          limit: 4,
        });
        if (researched.length > 0) {
          const items = researchedStateParksToDemandItems(researched);
          const existing = enriched.demand_drivers.major_outdoor_sites.items ?? [];
          enriched.demand_drivers = {
            ...enriched.demand_drivers,
            major_outdoor_sites: {
              ...enriched.demand_drivers.major_outdoor_sites,
              count: existing.length + items.length,
              top_names: [
                ...items.map((i) => i.name),
                ...enriched.demand_drivers.major_outdoor_sites.top_names,
              ].slice(0, 5),
              items: [...items, ...existing].slice(0, 8),
            },
            source: `${enriched.demand_drivers.source},tavily_state_parks`,
          };
        }
      } catch (err) {
        captureEnrichWarning(warnings, 'state_parks_research', err);
      }
    }

    if (countyMetricsResult) {
      const block: CountyMetricsBlock = {
        county_name: countyMetricsResult.countyName,
        state_abbr: countyMetricsResult.stateAbbr,
        population_2020: countyMetricsResult.population2020,
        population_change_pct: countyMetricsResult.populationChangePct,
        gdp_2023: countyMetricsResult.gdp2023,
        gdp_growth_maa_pct: countyMetricsResult.gdpGrowthMaaPct,
        high_confidence: countyMetricsResult.highConfidence,
        source: 'county-population,county-gdp',
        fetched_at: new Date().toISOString(),
      };
      enriched.county_metrics = block;
      if (!enriched.county) {
        enriched.county = countyMetricsResult.countyName.replace(/,\s*[A-Za-z\s]+$/, '').trim();
      }
      // Prefer county metrics over state rollups when present
      if (countyMetricsResult.population2020 != null) {
        enriched.population_2020 = countyMetricsResult.population2020;
      }
      if (countyMetricsResult.populationChangePct != null) {
        enriched.population_change_pct = countyMetricsResult.populationChangePct;
      }
      if (countyMetricsResult.gdp2023 != null) {
        enriched.gdp_2023 = countyMetricsResult.gdp2023;
      }
    } else if (countyHint && !enriched.county) {
      enriched.county = countyHint;
    }

    if (driveTimeResult) enriched.drive_time_demographics = driveTimeResult;
    if (siteRiskResult) enriched.site_risk = siteRiskResult;
    if (stvrResult) enriched.stvr_indicators = stvrResult;
    if (airportResult) enriched.nearest_airport = airportResult;
    if (tourismResult) enriched.tourism_economics = tourismResult;
  } else if (pastReportComps.length > 0 || tavilyComps.length > 0) {
    enriched.nearby_comps = [...pastReportComps, ...tavilyComps];
    enriched.comparables_summary = buildComparablesSummary(enriched.nearby_comps);
  }

  if (webContext) {
    enriched.web_context = webContext;
  }

  // State-level fallback when county metrics unavailable
  if (!enriched.county_metrics && state && countyLookups) {
    const abbr = state.toUpperCase().slice(0, 2);
    const pop = countyLookups.statePopulationLookup[abbr];
    const gdp = countyLookups.stateGDPLookup[abbr];
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
      chart_images: weatherSparkResult.chart_images,
      city: weatherSparkResult.city,
      state: weatherSparkResult.state,
    };
  }

  const dataSources: string[] = ['feasibility_comp_units', 'geocode'];
  if (enriched.nearby_comps?.length) {
    const compSources = [...new Set(enriched.nearby_comps.map((c) => c.source_table))];
    dataSources.push(...compSources);
  }
  if (enriched.comp_radius_pivots) {
    dataSources.push('all_sage_data', 'hipcamp', 'campspot', 'all_roverpass_data_new');
  }
  if (enriched.demand_drivers) {
    dataSources.push('national-parks', 'outdoor_recreation_sites', 'ski_resorts', 'wineries');
  }
  if (enriched.county_metrics) {
    dataSources.push('county-population', 'county-gdp');
  } else if (state && countyLookups) {
    dataSources.push('county-population', 'county-gdp');
  }
  if (enriched.drive_time_demographics) dataSources.push(enriched.drive_time_demographics.source);
  if (enriched.site_risk) {
    dataSources.push('fema_nfhl', 'fws_wetlands', 'fema_nri');
  }
  if (enriched.stvr_indicators) {
    dataSources.push(...enriched.stvr_indicators.sources);
    if (enriched.stvr_indicators.airdna) dataSources.push('airdna');
  }
  if (enriched.nearest_airport) dataSources.push('airports');
  if (enriched.tourism_economics) dataSources.push('tourism_economics');
  if (censusData?.population != null) dataSources.push('census_api');
  if (webContext) dataSources.push('tavily_market_context');
  if (weatherSparkResult) {
    dataSources.push('weatherspark');
    if (weatherSparkResult.chart_images?.length) {
      dataSources.push('weatherspark_charts');
    }
  }

  enriched.enrichment_metadata = {
    benchmark_sample_count: enriched.benchmarks?.reduce((sum, b) => sum + b.sample_count, 0) ?? 0,
    benchmark_categories: enriched.benchmarks?.map((b) => b.unit_category) ?? [],
    enrichment_date: new Date().toISOString(),
    data_sources: [...new Set(dataSources)],
    ...(warnings.length > 0 ? { warnings: [...new Set(warnings)] } : {}),
  };

  return enriched;
}
