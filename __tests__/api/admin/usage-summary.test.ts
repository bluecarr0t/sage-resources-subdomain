/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/usage/summary/route';

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    (handler: (req: NextRequest, auth: unknown) => Promise<Response>) =>
    async (req: NextRequest) =>
      handler(req, { supabase: {}, session: { user: { id: 'u1', email: 'a@test.com' } } }),
}));

const mockRuns = [
  {
    created_at: '2026-03-01T12:00:00.000Z',
    route: 'search',
    tavily_queries_planned: 2,
    tavily_queries_completed: 2,
    tavily_raw_rows: 10,
    firecrawl_attempted: 3,
    firecrawl_enriched: 2,
    web_geocode_attempts: 4,
    web_geocode_hits: 3,
    google_geocode_calls: 2,
    nominatim_geocode_calls: 1,
  },
];

const mockAi = [
  {
    created_at: '2026-03-01T15:00:00.000Z',
    feature: 'site_builder_image',
    provider: 'vercel_ai_gateway',
    model: 'google/gemini-3-pro-image',
    input_tokens: 100,
    output_tokens: 200,
    total_tokens: 300,
    request_meta: { task: 'image' },
  },
];

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() =>
            Promise.resolve({
              data: table === 'comps_v2_usage_runs' ? mockRuns : mockAi,
              error: null,
            })
          ),
        })),
      })),
    })),
  })),
}));

const { createServerClient } = jest.requireMock('@/lib/supabase') as {
  createServerClient: jest.Mock;
};

describe('GET /api/admin/usage/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns aggregated comps and AI totals', async () => {
    const req = new NextRequest('http://localhost/api/admin/usage/summary');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.compsV2.totals.runCount).toBe(1);
    expect(body.compsV2.totals.tavily_queries_completed).toBe(2);
    expect(body.compsV2.totals.google_geocode_calls).toBe(2);
    expect(body.adminAi.totals.eventCount).toBe(1);
    expect(body.adminAi.totals.totalTokens).toBe(300);
    expect(body.adminAi.byFeature.site_builder_image.totalTokens).toBe(300);
    expect(body.adminAi.recentEvents).toHaveLength(1);
    expect(body.adminAi.recentEvents[0].feature).toBe('site_builder_image');
    expect(createServerClient).toHaveBeenCalled();
  });

  it('returns 400 for invalid range', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/usage/summary?from=2099-01-01&to=2000-01-01'
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
