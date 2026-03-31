/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST as searchPost } from '@/app/api/admin/comps-v2/search/route';
import { POST as gapPost } from '@/app/api/admin/comps-v2/gap-fill/route';
import { POST as enrichPost } from '@/app/api/admin/comps-v2/enrich-selection/route';
import { emptyWebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';
import { COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES } from '@/lib/comps-v2/gap-fill-limits';

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    (handler: (req: NextRequest, auth: unknown) => Promise<Response>) =>
    async (req: NextRequest) =>
      handler(req, { supabase: {}, session: { user: { id: 'u1', email: 'a@test.com' } } }),
}));

const mockResolveGeocode = jest.fn();
jest.mock('@/lib/geocode', () => {
  const actual = jest.requireActual<typeof import('@/lib/geocode')>('@/lib/geocode');
  return {
    ...actual,
    resolveGeocodeForCompsSearch: (...a: unknown[]) => mockResolveGeocode(...a),
  };
});

const mockDiscover = jest.fn();
jest.mock('@/lib/comps-v2/discover', () => ({
  ...jest.requireActual<typeof import('@/lib/comps-v2/discover')>('@/lib/comps-v2/discover'),
  discoverCompsV2: (...a: unknown[]) => mockDiscover(...a),
}));

const MOCK_RUN_ID = '00000000-0000-0000-0000-000000000001';

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'comps_v2_usage_runs') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: MOCK_RUN_ID }, error: null }),
            }),
          }),
        };
      }
      return {
        insert: () => Promise.resolve({ error: null }),
      };
    }),
  })),
}));

const mockGapFill = jest.fn();
jest.mock('@/lib/comps-v2/gap-fill', () => ({
  runGapFillPipeline: (...a: unknown[]) => mockGapFill(...a),
}));

const mockDeep = jest.fn();
jest.mock('@/lib/comps-v2/deep-enrich', () => ({
  enrichCompSelectionDeep: (...a: unknown[]) => mockDeep(...a),
}));

describe('/api/admin/comps-v2/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveGeocode.mockResolvedValue({ lat: 30.2, lng: -97.7, stateAbbr: 'TX' });
    mockGapFill.mockResolvedValue({
      candidates: [],
      diagnostics: { ...emptyWebResearchDiagnostics(true), pipelineOutputCount: 0 },
    });
    mockDiscover.mockResolvedValue({
      candidates: [
        {
          stable_id: 'abc123',
          property_name: 'Test Resort',
          source_table: 'hipcamp',
          city: 'Austin',
          state: 'TX',
          distance_miles: 10,
          seasonal_rates: {},
          unit_type: null,
          property_total_sites: null,
          quantity_of_units: null,
          avg_retail_daily_rate: 150,
          high_rate: null,
          low_rate: null,
          operating_season_months: null,
          url: null,
          description: null,
          source_row_id: null,
          property_type: null,
          adr_quality_tier: 'mid',
        },
      ],
      counts: { hipcamp: 1 },
      sourceTimingsMs: { hipcamp: 5 },
    });
  });

  it('returns 200 with candidates when geocode and state ok', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/search', {
      method: 'POST',
      body: JSON.stringify({
        locationLine: 'Austin, TX',
        radiusMiles: 100,
        sources: {
          pastReports: true,
          all_glamping_properties: true,
          hipcamp: true,
          all_roverpass_data_new: true,
          campspot: true,
          web_search: true,
        },
      }),
    });
    const res = await searchPost(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Discovery-Correlation-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sourceTimingsMs).toEqual({ hipcamp: 5 });
    expect(typeof body.correlationId).toBe('string');
    expect(body.candidates).toHaveLength(1);
    expect(mockDiscover).toHaveBeenCalled();
    expect(mockGapFill).toHaveBeenCalled();
    expect(mockGapFill).toHaveBeenCalledWith(
      'Austin',
      'TX',
      expect.any(Array),
      expect.any(Set),
      expect.any(Set),
      expect.objectContaining({ anchorLat: 30.2, anchorLng: -97.7 })
    );
    expect(body.webResearch).toBeDefined();
    expect(body.webResearch.ran).toBe(true);
    expect(body.searchContext).toEqual({ anchorCity: 'Austin', stateAbbr: 'TX' });
  });

  it('returns NDJSON stream with phase lines and final result when stream is true', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/search', {
      method: 'POST',
      body: JSON.stringify({
        locationLine: 'Austin, TX',
        radiusMiles: 100,
        stream: true,
        sources: {
          pastReports: true,
          all_glamping_properties: true,
          hipcamp: true,
          all_roverpass_data_new: true,
          campspot: true,
          web_search: false,
        },
      }),
    });
    const res = await searchPost(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') ?? '').toContain('ndjson');
    const text = await res.text();
    const events = text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { type?: string });
    expect(events[0]?.type).toBe('meta');
    expect(typeof (events[0] as { correlationId?: string }).correlationId).toBe('string');
    expect(events.some((e) => e.type === 'phase' && (e as { step?: string }).step === 'geocode')).toBe(
      true
    );
    expect(events.some((e) => e.type === 'phase' && (e as { step?: string }).step === 'markets')).toBe(
      true
    );
    const result = events.find((e) => e.type === 'result') as
      | {
          type: 'result';
          success?: boolean;
          candidates?: unknown[];
          correlationId?: string;
          sourceTimingsMs?: Record<string, number>;
        }
      | undefined;
    expect(result?.success).toBe(true);
    expect(result?.candidates).toHaveLength(1);
    expect(typeof result?.correlationId).toBe('string');
    expect(result?.sourceTimingsMs).toEqual({ hipcamp: 5 });
  });

  it('defaults omitted sources to all off and skips gap-fill', async () => {
    mockDiscover.mockResolvedValue({ candidates: [], counts: {}, sourceTimingsMs: {} });
    const req = new NextRequest('http://localhost/api/admin/comps-v2/search', {
      method: 'POST',
      body: JSON.stringify({ locationLine: 'Austin, TX', radiusMiles: 50 }),
    });
    const res = await searchPost(req);
    expect(res.status).toBe(200);
    expect(mockDiscover).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sources: {
          pastReports: false,
          all_glamping_properties: false,
          hipcamp: false,
          all_roverpass_data_new: false,
          campspot: false,
          web_search: false,
        },
      })
    );
    expect(mockGapFill).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.webResearch).toBeNull();
  });

  it('skips web search when sources.web_search is false', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/search', {
      method: 'POST',
      body: JSON.stringify({
        locationLine: 'Austin, TX',
        state: 'TX',
        sources: {
          pastReports: true,
          all_glamping_properties: true,
          hipcamp: true,
          all_roverpass_data_new: true,
          campspot: true,
          web_search: false,
        },
      }),
    });
    const res = await searchPost(req);
    expect(res.status).toBe(200);
    expect(mockGapFill).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.webResearch).toBeNull();
    expect(body.searchContext).toEqual({ anchorCity: 'Austin', stateAbbr: 'TX' });
  });

  it('returns 400 when geocode fails', async () => {
    mockResolveGeocode.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/admin/comps-v2/search', {
      method: 'POST',
      body: JSON.stringify({ state: 'TX' }),
    });
    const res = await searchPost(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when US state cannot be resolved from address', async () => {
    mockResolveGeocode.mockResolvedValue({ lat: 64.15, lng: -21.95 });
    const req = new NextRequest('http://localhost/api/admin/comps-v2/search', {
      method: 'POST',
      body: JSON.stringify({ locationLine: 'Reykjavik Iceland', state: '' }),
    });
    const res = await searchPost(req);
    expect(res.status).toBe(400);
  });
});

describe('/api/admin/comps-v2/gap-fill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGapFill.mockResolvedValue({
      candidates: [],
      diagnostics: { ...emptyWebResearchDiagnostics(true), pipelineOutputCount: 0 },
    });
  });

  it('returns 400 without state', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/gap-fill', {
      method: 'POST',
      body: JSON.stringify({ city: 'Austin' }),
    });
    const res = await gapPost(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 when ok', async () => {
    mockGapFill.mockResolvedValue({
      candidates: [{ stable_id: 'x', property_name: 'Web', source_table: 'tavily_gap_fill' }],
      diagnostics: { ...emptyWebResearchDiagnostics(true), pipelineOutputCount: 1 },
    });
    const req = new NextRequest('http://localhost/api/admin/comps-v2/gap-fill', {
      method: 'POST',
      body: JSON.stringify({ city: 'Austin', state: 'TX', existingCandidates: [] }),
    });
    const res = await gapPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.added).toHaveLength(1);
    expect(body.webResearch).toBeDefined();
    expect(body.webResearch.ran).toBe(true);
  });

  it('returns 400 when city is empty', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/gap-fill', {
      method: 'POST',
      body: JSON.stringify({ city: '   ', state: 'TX', existingCandidates: [] }),
    });
    const res = await gapPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('CITY_REQUIRED');
    expect(mockGapFill).not.toHaveBeenCalled();
  });

  it('returns 413 when existingCandidates exceeds cap', async () => {
    const huge = Array.from({ length: COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES + 1 }, (_, i) => ({
      property_name: `P${i}`,
      city: 'Austin',
    }));
    const req = new NextRequest('http://localhost/api/admin/comps-v2/gap-fill', {
      method: 'POST',
      body: JSON.stringify({ city: 'Austin', state: 'TX', existingCandidates: huge }),
    });
    const res = await gapPost(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.errorCode).toBe('EXISTING_PAYLOAD_TOO_LARGE');
    expect(mockGapFill).not.toHaveBeenCalled();
  });
});

describe('/api/admin/comps-v2/enrich-selection', () => {
  const emptyStructured = {
    summary: 's',
    amenities: [] as string[],
    rates_notes: '',
    unit_type_rates: [] as { unit_type: string; rate_note: string }[],
    review_highlights: '',
    google_business_notes: '',
    sources_cited: [] as string[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeep.mockResolvedValue([
      { property_name: 'One', structured: { ...emptyStructured } },
      { property_name: 'Two', structured: { ...emptyStructured } },
      { property_name: 'Three', structured: { ...emptyStructured } },
    ]);
  });

  it('returns 400 when more than 5 items', async () => {
    const items = [1, 2, 3, 4, 5, 6].map((i) => ({ property_name: `P${i}` }));
    const req = new NextRequest('http://localhost/api/admin/comps-v2/enrich-selection', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    const res = await enrichPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('MAX_ITEMS_COUNT');
  });

  it('returns 400 with ITEMS_ARRAY_REQUIRED when items is empty', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/enrich-selection', {
      method: 'POST',
      body: JSON.stringify({ items: [] }),
    });
    const res = await enrichPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('ITEMS_ARRAY_REQUIRED');
  });

  it('returns 400 when fewer than 3 items', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/enrich-selection', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { property_name: 'One', city: 'A', state: 'TX' },
          { property_name: 'Two', city: 'B', state: 'TX' },
        ],
      }),
    });
    const res = await enrichPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('MIN_ITEMS_COUNT');
  });

  it('returns 400 with NO_VALID_ITEMS when no property names', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/enrich-selection', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { property_name: '', city: 'A', state: 'TX' },
          { property_name: '  ', city: 'B', state: 'TX' },
          { property_name: '', city: 'C', state: 'TX' },
        ],
      }),
    });
    const res = await enrichPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('NO_VALID_ITEMS');
    expect(mockDeep).not.toHaveBeenCalled();
  });

  it('returns 400 with INSUFFICIENT_VALID_ITEMS when only two names in three slots', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/enrich-selection', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { property_name: 'One', city: 'A', state: 'TX' },
          { property_name: 'Two', city: 'B', state: 'TX' },
          { property_name: '', city: 'C', state: 'TX' },
        ],
      }),
    });
    const res = await enrichPost(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('INSUFFICIENT_VALID_ITEMS');
    expect(mockDeep).not.toHaveBeenCalled();
  });

  it('returns 200 for valid items', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps-v2/enrich-selection', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { property_name: 'One', city: 'A', state: 'TX' },
          { property_name: 'Two', city: 'B', state: 'TX' },
          { property_name: 'Three', city: 'C', state: 'TX' },
        ],
      }),
    });
    const res = await enrichPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(3);
  });
});
