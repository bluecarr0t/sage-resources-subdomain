/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    (handler: (req: NextRequest, auth: unknown) => Promise<Response>) =>
    async (req: NextRequest) =>
      handler(req, { supabase: {}, session: { user: { id: 'u1', email: 'a@test.com' } } }),
}));

interface QueryCalls {
  textSearch: Array<[string, string]>;
  in: Array<[string, string[]]>;
  overlaps: Array<[string, string[]]>;
  gte: Array<[string, number]>;
  lte: Array<[string, number]>;
  or: string[];
  order: Array<[string, { ascending?: boolean; nullsFirst?: boolean }]>;
  range: Array<[number, number]>;
}

function makeQueryBuilder(rows: unknown[], total: number, calls: QueryCalls) {
  const qb: Record<string, unknown> = {};
  const self = qb as unknown as Record<string, (...args: unknown[]) => unknown> & Promise<unknown>;

  qb.textSearch = (c: string, v: string) => {
    calls.textSearch.push([c, v]);
    return self;
  };
  qb.in = (c: string, v: string[]) => {
    calls.in.push([c, v]);
    return self;
  };
  qb.overlaps = (c: string, v: string[]) => {
    calls.overlaps.push([c, v]);
    return self;
  };
  qb.gte = (c: string, v: number) => {
    calls.gte.push([c, v]);
    return self;
  };
  qb.lte = (c: string, v: number) => {
    calls.lte.push([c, v]);
    return self;
  };
  qb.or = (c: string) => {
    calls.or.push(c);
    return self;
  };
  qb.order = (c: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) => {
    calls.order.push([c, opts]);
    return self;
  };
  qb.range = (from: number, to: number) => {
    calls.range.push([from, to]);
    // Return a thenable so `await query` resolves to the supabase-shaped result.
    return Promise.resolve({ data: rows, error: null, count: total });
  };
  qb.limit = () => Promise.resolve({ data: rows, error: null });

  return self;
}

const mockRows = [
  {
    id: 'rep:abc',
    source: 'reports',
    property_name: 'Test Ranch',
    city: 'Austin',
    state: 'TX',
    country: 'USA',
    lat: null,
    lon: null,
    property_type: 'Glamping',
    unit_type: 'Safari Tent',
    unit_category: 'safari_tent',
    unit_categories: ['safari_tent'],
    total_sites: 10,
    num_units: 10,
    low_adr: 100,
    peak_adr: 300,
    avg_adr: 200,
    low_occupancy: 0.4,
    peak_occupancy: 0.9,
    quality_score: 4,
    amenity_keywords: ['wifi', 'hot tub'],
    study_id: 'S123',
    overview: null,
    report_property_name: null,
    website_url: null,
    address_key: 'deadbeef',
    created_at: new Date().toISOString(),
    source_row_id: 'abc',
  },
];

let lastCalls: QueryCalls;
let mockSelect: jest.Mock;
let mockRpc: jest.Mock;

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect,
    })),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

import { GET } from '@/app/api/admin/comps/unified/route';

function newCalls(): QueryCalls {
  return { textSearch: [], in: [], overlaps: [], gte: [], lte: [], or: [], order: [], range: [] };
}

beforeEach(() => {
  lastCalls = newCalls();
  mockSelect = jest.fn(() => makeQueryBuilder(mockRows, 123, lastCalls));
  mockRpc = jest.fn((name: string) => {
    if (name === 'unified_comps_aggregate_counts') {
      return Promise.resolve({
        data: [{ row_count: 123, distinct_address_count: 99 }],
        error: null,
      });
    }
    return Promise.resolve({ data: [], error: null });
  });
});

describe('GET /api/admin/comps/unified', () => {
  it('returns rows with pagination metadata', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rows).toHaveLength(1);
    expect(body.pagination.total).toBe(123);
    expect(body.pagination.per_page).toBe(50);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.total_pages).toBe(Math.ceil(123 / 50));
    expect(body.pagination.total_properties).toBe(99);
  });

  it('pushes pagination to the DB via .range(from, to)', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified?page=2&per_page=25');
    await GET(req);
    expect(lastCalls.range).toEqual([[25, 49]]);
  });

  it('clamps per_page to the configured max', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified?page=1&per_page=9999');
    await GET(req);
    const [from, to] = lastCalls.range[0];
    expect(from).toBe(0);
    expect(to - from + 1).toBeLessThanOrEqual(100);
  });

  it('orders by created_at desc by default, with id as secondary key', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified');
    await GET(req);
    expect(lastCalls.order[0][0]).toBe('created_at');
    expect(lastCalls.order[0][1].ascending).toBe(false);
    expect(lastCalls.order[1][0]).toBe('id');
    expect(lastCalls.order[1][1].ascending).toBe(true);
  });

  it('rejects unknown sort_by and falls back to created_at', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/comps/unified?sort_by=drop_table;--&sort_dir=asc'
    );
    await GET(req);
    expect(lastCalls.order[0][0]).toBe('created_at');
  });

  it('applies tsvector full-text search when `search` is present', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified?search=austin%20ranch');
    await GET(req);
    expect(lastCalls.textSearch).toHaveLength(1);
    expect(lastCalls.textSearch[0][0]).toBe('search_tsv');
    expect(lastCalls.textSearch[0][1]).toContain('austin');
    expect(lastCalls.textSearch[0][1]).toContain('ranch');
    expect(lastCalls.textSearch[0][1]).toContain('&');
  });
});
