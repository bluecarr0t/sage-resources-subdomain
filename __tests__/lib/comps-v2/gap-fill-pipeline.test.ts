/**
 * @jest-environment node
 */

import type { SeasonalRates } from '@/lib/ai-report-builder/types';
import { extractStreetAddressHintFromWebText, runGapFillPipeline } from '@/lib/comps-v2/gap-fill';
import { emptyWebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';

const mockFetchTavilyGapComps = jest.fn();
const mockScrapeUrlMarkdown = jest.fn();

jest.mock('@/lib/comps-v2/tavily-gap', () => {
  const actual = jest.requireActual<typeof import('@/lib/comps-v2/tavily-gap')>('@/lib/comps-v2/tavily-gap');
  return {
    ...actual,
    fetchTavilyGapComps: (...args: unknown[]) => mockFetchTavilyGapComps(...args),
  };
});

jest.mock('@/lib/comps-v2/scrape-url', () => ({
  scrapeUrlMarkdown: (...args: unknown[]) => mockScrapeUrlMarkdown(...args),
}));

jest.mock('@/lib/geocode', () => ({
  geocodeNominatim: jest.fn().mockResolvedValue(null),
  geocodePlaceLine: jest.fn().mockResolvedValue(null),
  googlePlacesFindPlaceLatLng: jest.fn().mockResolvedValue(null),
}));

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

describe('extractStreetAddressHintFromWebText', () => {
  it('extracts a US street-style fragment', () => {
    const hint = extractStreetAddressHintFromWebText(
      'Directions: 4520 W State Highway 71, Johnson City, TX — gate on the left.'
    );
    expect(hint).toMatch(/4520 W State Highway/i);
  });

  it('returns null when no street pattern', () => {
    expect(extractStreetAddressHintFromWebText('Nightly glamping from $199. Book online.')).toBeNull();
  });
});

describe('runGapFillPipeline text enrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScrapeUrlMarkdown.mockResolvedValue({ ok: false, reason: 'no_api_key' as const });
    mockFetchTavilyGapComps.mockResolvedValue({
      rows: [
        {
          property_name: 'Pipeline Test RV Park',
          city: 'Austin',
          state: 'TX',
          unit_type: null,
          property_total_sites: null,
          quantity_of_units: null,
          avg_retail_daily_rate: null,
          high_rate: null,
          low_rate: null,
          seasonal_rates: { ...EMPTY_SEASONAL },
          operating_season_months: null,
          url: 'https://example.com/rv-park',
          description:
            'Family friendly. Nightly rates from $88 per night. The park offers 72 full hookup RV sites.',
          distance_miles: null,
          source_table: 'tavily_gap_fill',
        },
      ],
      stats: { ...emptyWebResearchDiagnostics(true).tavily, apiConfigured: true },
    });
  });

  it('fills ADR and site count from combined snippet text when Firecrawl is off', async () => {
    const { candidates, diagnostics } = await runGapFillPipeline(
      'Austin',
      'TX',
      ['rv'],
      new Set(),
      new Set(),
      {
        firecrawlTopN: 0,
        webDistanceGeocodeBudget: 0,
      }
    );

    expect(diagnostics.pipelineOutputCount).toBe(1);
    expect(candidates[0]?.avg_retail_daily_rate).toBe(88);
    expect(candidates[0]?.property_total_sites).toBe(72);
    expect(candidates[0]?.adr_quality_tier).toBe('economy');
    expect(mockScrapeUrlMarkdown).not.toHaveBeenCalled();
  });

  it('sets lat/lng from JSON-LD in Firecrawl HTML and skips geocode when coords present', async () => {
    mockScrapeUrlMarkdown.mockResolvedValue({
      ok: true,
      markdown: 'Book now. Rates from $50.',
      html: `<script type="application/ld+json">{"@type":"LodgingBusiness","geo":{"@type":"GeoCoordinates","latitude":30.3,"longitude":-97.7}}</script>`,
    });

    const { candidates, diagnostics } = await runGapFillPipeline(
      'Austin',
      'TX',
      ['rv'],
      new Set(),
      new Set(),
      {
        firecrawlTopN: 2,
        anchorLat: 30.27,
        anchorLng: -97.74,
        webDistanceGeocodeBudget: 0,
      }
    );

    expect(mockScrapeUrlMarkdown).toHaveBeenCalled();
    expect(candidates[0]?.geo_lat).toBe(30.3);
    expect(candidates[0]?.geo_lng).toBe(-97.7);
    expect(candidates[0]?.distance_miles).toBeGreaterThan(0);
    expect(diagnostics.webDistanceGeocodeAttempts ?? 0).toBe(0);
  });
});
