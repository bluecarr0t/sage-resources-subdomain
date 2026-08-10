/**
 * Enrich provenance unit test — mocks connectors so we assert data_sources wiring
 * without hitting Supabase / external APIs.
 */

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        in: () => ({
          not: () => ({
            not: () => ({
              limit: () => Promise.resolve({ data: [] }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

jest.mock('@/lib/geocode', () => ({
  geocodeAddress: jest.fn(async () => ({
    lat: 44.0582,
    lng: -121.3153,
    stateAbbr: 'OR',
    countyLevel2: 'Deschutes County',
  })),
}));

jest.mock('@/lib/anchor-point-insights/fetch-county-data', () => ({
  fetchCountyLookups: jest.fn(async () => null),
}));

jest.mock('@/lib/ai-report-builder/census-api', () => ({
  fetchCensusStateDemographics: jest.fn(async () => ({
    population: null,
    median_household_income: null,
  })),
}));

jest.mock('@/lib/ai-report-builder/tavily-context', () => ({
  fetchWebContextForReport: jest.fn(async () => null),
}));

jest.mock('@/lib/ai-report-builder/tavily-comp-research', () => ({
  fetchTavilyComps: jest.fn(async () => []),
}));

jest.mock('@/lib/ai-report-builder/weatherspark', () => ({
  fetchWeatherSparkData: jest.fn(async () => null),
}));

jest.mock('@/lib/ai-report-builder/fetch-past-report-comps', () => ({
  fetchPastReportComps: jest.fn(async () => []),
}));

jest.mock('@/lib/ai-report-builder/fetch-comps', () => ({
  fetchNearbyComps: jest.fn(async () => [
    {
      property_name: 'Mock Glamp',
      city: 'Bend',
      state: 'OR',
      unit_type: 'Safari Tent',
      property_total_sites: 10,
      quantity_of_units: 10,
      avg_retail_daily_rate: 200,
      high_rate: null,
      low_rate: null,
      seasonal_rates: {
        winter_weekday: null,
        winter_weekend: null,
        spring_weekday: null,
        spring_weekend: null,
        summer_weekday: null,
        summer_weekend: null,
        fall_weekday: null,
        fall_weekend: null,
      },
      operating_season_months: null,
      url: null,
      description: null,
      distance_miles: 12,
      source_table: 'all_sage_data',
    },
    {
      property_name: 'Mock Hipcamp',
      city: 'Bend',
      state: 'OR',
      unit_type: null,
      property_total_sites: 5,
      quantity_of_units: 5,
      avg_retail_daily_rate: 150,
      high_rate: null,
      low_rate: null,
      seasonal_rates: {
        winter_weekday: null,
        winter_weekend: null,
        spring_weekday: null,
        spring_weekend: null,
        summer_weekday: null,
        summer_weekend: null,
        fall_weekday: null,
        fall_weekend: null,
      },
      operating_season_months: null,
      url: null,
      description: null,
      distance_miles: 8,
      source_table: 'hipcamp',
      market_occupancy_rate: 0.4,
    },
  ]),
}));

jest.mock('@/lib/ai-report-builder/comp-radius-pivots', () => ({
  fetchCompRadiusPivots: jest.fn(async () => ({
    buckets: [{ radius_miles: 50, property_count: 2, avg_adr: 175, avg_occupancy: 0.4, sources: ['all_sage_data', 'hipcamp'] }],
    fetched_at: '2026-01-01T00:00:00Z',
  })),
}));

jest.mock('@/lib/market-report/demand-drivers', () => ({
  fetchDemandDrivers: jest.fn(async () => ({
    nationalParks: {
      count: 1,
      top: [{ name: 'Crater Lake', state: 'OR', distance_miles: 90, visitors: 500_000 }],
      radiusMiles: 250,
    },
    skiResorts: {
      count: 1,
      top: [{ name: 'Mt Bachelor', state: 'OR', distance_miles: 20 }],
      radiusMiles: 100,
    },
    wineries: { count: 0, top: [], radiusMiles: 100 },
    majorOutdoorSites: {
      count: 1,
      top: [
        {
          name: 'Smith Rock State Park',
          state: 'OR',
          distance_miles: 25,
          visitors: 100_000,
          siteType: 'state_park',
        },
      ],
      radiusMiles: 150,
    },
    majorAndLargeCities: { count: 0, top: [], radiusMiles: 150 },
  })),
}));

jest.mock('@/lib/market-report/county-metrics', () => ({
  fetchCountyMetrics: jest.fn(async () => ({
    countyName: 'Deschutes County, Oregon',
    stateAbbr: 'OR',
    population2020: 198_000,
    populationChangePct: 12.5,
    gdp2023: 10_000_000,
    gdpGrowthMaaPct: 3.2,
    highConfidence: true,
  })),
}));

jest.mock('@/lib/ai-report-builder/drive-time-demographics', () => ({
  fetchDriveTimeDemographics: jest.fn(async () => ({
    rings: [],
    demand_rubric: [],
    overall_score: 0,
    fetched_at: '2026-01-01T00:00:00Z',
    source: 'county-population',
  })),
}));

jest.mock('@/lib/ai-report-builder/site-risk', () => ({
  fetchSiteRisk: jest.fn(async () => ({
    flood: { zone: 'X', panel: null, source: 'fema_nfhl' },
    wetlands: { present: false, note: 'none', source: 'fws_wetlands' },
    wildfire: { eal_rating: 'Very Low', risk_score: null, source: 'fema_nri' },
    fetched_at: '2026-01-01T00:00:00Z',
  })),
}));

jest.mock('@/lib/ai-report-builder/stvr-indicators', () => ({
  fetchMarketOccupancyIndicators: jest.fn(async () => ({
    radius_miles: 50,
    sample_count: 5,
    avg_occupancy: 0.4,
    avg_adr: 160,
    sources: ['hipcamp', 'campspot'],
    airdna: null,
    fetched_at: '2026-01-01T00:00:00Z',
  })),
}));

jest.mock('@/lib/ai-report-builder/nearest-airport', () => ({
  fetchNearestAirport: jest.fn(async () => ({
    name: 'Redmond Municipal',
    iata_code: 'RDM',
    city: 'Redmond',
    state_province: 'OR',
    distance_miles: 18,
    avg_annual_passengers: 500_000,
    hub_size: 'small',
    fetched_at: '2026-01-01T00:00:00Z',
    source: 'airports',
  })),
}));

jest.mock('@/lib/ai-report-builder/tourism-economics', () => ({
  fetchTourismEconomics: jest.fn(async () => null),
}));

import { enrichReportInput } from '@/lib/ai-report-builder/enrich';

describe('enrichReportInput Phase 2 provenance', () => {
  it('includes national-parks, county-population, and market table sources when geocode succeeds', async () => {
    const enriched = await enrichReportInput({
      property_name: 'Test Bend Glamp',
      city: 'Bend',
      state: 'OR',
      unit_mix: [{ type: 'Safari Tent', count: 8 }],
      market_type: 'glamping',
      include_web_research: false,
    });

    expect(enriched.latitude).toBeCloseTo(44.0582);
    expect(enriched.county).toMatch(/Deschutes/i);
    expect(enriched.county_metrics?.population_2020).toBe(198_000);
    expect(enriched.demand_drivers?.national_parks.count).toBe(1);
    expect(enriched.demand_drivers?.national_parks.items?.[0]?.visitors).toBe(500_000);

    const sources = enriched.enrichment_metadata?.data_sources ?? [];
    expect(sources).toEqual(
      expect.arrayContaining([
        'national-parks',
        'county-population',
        'all_sage_data',
        'hipcamp',
        'campspot',
      ])
    );
  });
});
