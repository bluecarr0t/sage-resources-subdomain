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
    if (name === 'unified_comps_list_properties') {
      return Promise.resolve({
        data: [{ anchor: mockRows[0], site_rows: mockRows }],
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
    expect(body.pagination.total).toBe(99);
    expect(body.pagination.total_site_units).toBe(123);
    expect(body.pagination.per_page).toBe(50);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.total_pages).toBe(Math.ceil(99 / 50));
    expect(body.pagination.total_properties).toBe(99);
  });

  it('requests property-level pagination via unified_comps_list_properties RPC', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified?page=2&per_page=25');
    await GET(req);
    expect(mockRpc).toHaveBeenCalledWith(
      'unified_comps_list_properties',
      expect.objectContaining({ p_page: 2, p_per_page: 25 })
    );
  });

  it('clamps per_page to the configured max in the property list RPC', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified?page=1&per_page=9999');
    await GET(req);
    expect(mockRpc).toHaveBeenCalledWith(
      'unified_comps_list_properties',
      expect.objectContaining({ p_per_page: 100 })
    );
  });

  it('passes sort_by and sort_dir to the property list RPC', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/comps/unified?sort_by=property_name&sort_dir=asc'
    );
    await GET(req);
    expect(mockRpc).toHaveBeenCalledWith(
      'unified_comps_list_properties',
      expect.objectContaining({ p_sort_by: 'property_name', p_sort_asc: true })
    );
  });

  it('rejects unknown sort_by and falls back to created_at in the property list RPC', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/comps/unified?sort_by=drop_table;--&sort_dir=asc'
    );
    await GET(req);
    expect(mockRpc).toHaveBeenCalledWith(
      'unified_comps_list_properties',
      expect.objectContaining({ p_sort_by: 'created_at' })
    );
  });

  it('applies admin published Glamping cohort on the property list RPC', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified');
    await GET(req);
    expect(mockRpc).toHaveBeenCalledWith(
      'unified_comps_list_properties',
      expect.objectContaining({
        p_apply_admin_cohort: true,
        p_property_types: ['Glamping'],
      })
    );
  });

  it('uses FTS mode in the property list RPC when `search` is present', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified?search=austin%20ranch');
    await GET(req);
    expect(mockRpc).toHaveBeenCalledWith(
      'unified_comps_list_properties',
      expect.objectContaining({
        p_tsquery: expect.stringContaining('austin'),
        p_ilike_terms: null,
      })
    );
  });
});
