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

interface Calls {
  in: Array<[string, string[]]>;
  overlaps: Array<[string, string[]]>;
  gte: Array<[string, number]>;
  lte: Array<[string, number]>;
  or: string[];
  textSearch: Array<[string, string]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qb(calls: Calls, rows: unknown[]): any {
  const self: Record<string, unknown> = {};
  self.in = (c: string, v: string[]) => (calls.in.push([c, v]), self);
  self.overlaps = (c: string, v: string[]) => (calls.overlaps.push([c, v]), self);
  self.gte = (c: string, v: number) => (calls.gte.push([c, v]), self);
  self.lte = (c: string, v: number) => (calls.lte.push([c, v]), self);
  self.or = (c: string) => (calls.or.push(c), self);
  self.textSearch = (c: string, v: string) => (calls.textSearch.push([c, v]), self);
  self.order = () => self;
  self.range = () => Promise.resolve({ data: rows, error: null, count: rows.length });
  self.limit = () => Promise.resolve({ data: rows, error: null });
  return self;
}

let lastCalls: Calls;
let mockSelect: jest.Mock;

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({ select: mockSelect })),
    rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
}));

import { GET } from '@/app/api/admin/comps/unified/route';
import { expandStateValuesForInQuery } from '@/components/map/utils/stateUtils';

beforeEach(() => {
  lastCalls = { in: [], overlaps: [], gte: [], lte: [], or: [], textSearch: [] };
  mockSelect = jest.fn(() => qb(lastCalls, []));
});

describe('GET /api/admin/comps/unified filters', () => {
  it('filters by known sources only, dropping invalid values', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/comps/unified?source=hipcamp,foo,campspot,reports'
    );
    await GET(req);
    const sourceFilter = lastCalls.in.find((c) => c[0] === 'source');
    expect(sourceFilter).toBeDefined();
    expect(sourceFilter?.[1]).toEqual(['hipcamp', 'campspot', 'reports']);
  });

  it('does not apply a source filter when none provided', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified');
    await GET(req);
    expect(lastCalls.in.find((c) => c[0] === 'source')).toBeUndefined();
  });

  it('filters by state (expands abbreviations to all DB casing variants) and keywords (array overlap)', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/comps/unified?state=tx,ca&keywords=hot%20tub,wifi'
    );
    await GET(req);
    const stateFilter = lastCalls.in.find((c) => c[0] === 'state');
    expect(stateFilter?.[1]).toEqual(expandStateValuesForInQuery(['tx', 'ca']));
    const overlap = lastCalls.overlaps.find((c) => c[0] === 'amenity_keywords');
    expect(overlap?.[1]).toEqual(['hot tub', 'wifi']);
  });

  it('treats all-caps full state name like the abbreviation (e.g. ALABAMA → AL)', async () => {
    const req = new NextRequest('http://localhost/api/admin/comps/unified?state=ALABAMA');
    await GET(req);
    const stateFilter = lastCalls.in.find((c) => c[0] === 'state');
    expect(stateFilter?.[1]).toEqual(expandStateValuesForInQuery(['ALABAMA']));
  });

  it('applies ADR range filters', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/comps/unified?min_adr=100&max_adr=500'
    );
    await GET(req);
    expect(lastCalls.gte).toEqual([['low_adr', 100]]);
    expect(lastCalls.lte).toEqual([['peak_adr', 500]]);
  });

  it('turns unit_category filter into an OR across unit_category + unit_type ilike', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/comps/unified?unit_category=safari_tent'
    );
    await GET(req);
    expect(lastCalls.or).toHaveLength(1);
    const clause = lastCalls.or[0];
    expect(clause).toContain('unit_category.eq.safari_tent');
    // `_` is a SQL ILIKE wildcard, so we escape it with a backslash
    expect(clause).toContain('unit_type.ilike.%safari\\_tent%');
  });
});
