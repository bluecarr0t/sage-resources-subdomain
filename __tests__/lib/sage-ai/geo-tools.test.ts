/**
 * @jest-environment node
 */
import { createSageAiTools } from '@/lib/sage-ai/tools';

type ExecutorResult = unknown;
type ChainStep = { method: string; args: unknown[] };

/**
 * Builds a supabase stub that supports the tool call patterns in geo-tools.ts:
 *   - supabase.from(table).select(...).eq(...).maybeSingle()
 *   - supabase.from('property_geocode').upsert(...)
 *   - supabase.rpc(name, args)
 *
 * Tests configure per-table responses and assert against `supabase.calls`.
 */
function makeSupabase() {
  const calls: Array<{ kind: string; table?: string; rpc?: string; args?: unknown[] }> = [];
  const tableResponders: Record<string, unknown> = {};
  const rpcResponders: Record<string, unknown> = {};

  function makeChain(result: unknown) {
    const chain: Record<string, unknown> = {};
    const impl = (_method: string) => (..._args: unknown[]) => chain;
    const terminals = ['maybeSingle', 'single', 'limit'];
    for (const m of ['select', 'eq', 'ilike', 'not', 'is', 'order', 'range', 'in']) {
      chain[m] = impl(m);
    }
    for (const t of terminals) {
      chain[t] = () => result;
    }
    chain.then = (res: (v: unknown) => unknown) => res(result);
    chain.upsert = (..._args: unknown[]) => ({ error: null });
    return chain;
  }

  const supabase = {
    from(table: string) {
      calls.push({ kind: 'from', table });
      return makeChain(tableResponders[table] ?? { data: null, error: null });
    },
    rpc(name: string, args: unknown[]) {
      calls.push({ kind: 'rpc', rpc: name, args: [args] });
      return Promise.resolve(
        rpcResponders[name] ?? { data: [], error: null }
      );
    },
  };

  return {
    supabase,
    calls,
    setTableResult(table: string, result: unknown) {
      tableResponders[table] = result;
    },
    setRpcResult(name: string, result: unknown) {
      rpcResponders[name] = result;
    },
  };
}

describe('createSageAiTools — geoToolsEnabled registration', () => {
  it('does not register geocode_property or nearest_attractions by default', () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    expect(Object.keys(tools)).not.toContain('geocode_property');
    expect(Object.keys(tools)).not.toContain('nearest_attractions');
  });

  it('registers geo tools when geoToolsEnabled is true', () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', geoToolsEnabled: true }
    );
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining(['geocode_property', 'nearest_attractions'])
    );
  });
});

describe('geocode_property — tiered cascade', () => {
  it('returns cache hit without calling Google Maps', async () => {
    const { supabase, setTableResult, calls } = makeSupabase();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    setTableResult('property_geocode', {
      data: {
        property_id: 1,
        latitude: '30.2672',
        longitude: '-97.7431',
        source: 'db',
        confidence: 100,
        place_id: null,
        formatted_address: null,
        fetched_at: new Date().toISOString(),
        stale_after: future,
      },
      error: null,
    });

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', geoToolsEnabled: true }
    );

    const res = (await tools.geocode_property.execute!(
      { property_id: 1 },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as { data: { cached: boolean; source: string; latitude: number; longitude: number } };

    expect(res.data).toBeDefined();
    expect(res.data.cached).toBe(true);
    expect(res.data.source).toBe('db');
    expect(res.data.latitude).toBeCloseTo(30.2672);
    expect(res.data.longitude).toBeCloseTo(-97.7431);
    expect(calls.filter((c) => c.kind === 'from' && c.table === 'all_glamping_properties')).toHaveLength(0);
  });

  it('falls through to DB lat/lon when cache is empty and writes cache', async () => {
    const { supabase, setTableResult } = makeSupabase();
    setTableResult('property_geocode', { data: null, error: null });
    setTableResult('all_glamping_properties', {
      data: {
        id: 42,
        property_name: 'Test Cabin',
        lat: 33.5,
        lon: -112.1,
        address: '1 Main',
        city: 'Phoenix',
        state: 'AZ',
        zip_code: '85001',
        country: 'USA',
      },
      error: null,
    });

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u2', geoToolsEnabled: true }
    );

    const res = (await tools.geocode_property.execute!(
      { property_id: 42 },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as ExecutorResult;

    expect(res).toMatchObject({
      data: {
        source: 'db',
        cached: false,
        latitude: 33.5,
        longitude: -112.1,
      },
    });
  });

  it('returns an error when property_id, property_name, and address are all missing', async () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u3', geoToolsEnabled: true }
    );
    const res = (await tools.geocode_property.execute!(
      {},
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as { error?: string; data: null };
    expect(res.error).toMatch(/resolve a property_id/i);
    expect(res.data).toBeNull();
  });
});

describe('nearest_attractions — RPC integration', () => {
  it('requires property_id or lat/lng and returns RPC rows', async () => {
    const { supabase, setRpcResult } = makeSupabase();
    setRpcResult('nearest_attractions_v1', {
      data: [
        {
          type: 'national_park',
          id: 'np-1',
          name: 'Yellowstone',
          distance_km: 12.5,
          latitude: 44.4,
          longitude: -110.6,
          url: null,
          state: 'WY',
        },
      ],
      error: null,
    });

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u4', geoToolsEnabled: true }
    );

    const res = (await tools.nearest_attractions.execute!(
      {
        latitude: 44.5,
        longitude: -110.5,
        radius_km: 50,
        types: ['national_park'],
        limit: 5,
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as {
      origin: { latitude: number; longitude: number };
      results: Array<{ type: string; name: string; distance_km: number }>;
    };

    expect(res.origin).toEqual({ latitude: 44.5, longitude: -110.5 });
    expect(res.results).toHaveLength(1);
    expect(res.results[0].name).toBe('Yellowstone');
  });

  it('returns an error when neither property_id nor lat/lng provided', async () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u5', geoToolsEnabled: true }
    );
    const res = (await tools.nearest_attractions.execute!(
      { radius_km: 10, types: ['property'], limit: 5 },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as { error?: string };
    expect(res.error).toMatch(/origin/i);
  });
});

describe('query_properties — near branch', () => {
  it('delegates to properties_within_radius RPC when near is provided', async () => {
    const { supabase, setRpcResult, setTableResult, calls } = makeSupabase();
    setRpcResult('properties_within_radius', {
      data: [
        {
          id: 7,
          property_name: 'Near Place',
          city: 'Austin',
          state: 'TX',
          distance_km: 3.21,
        },
      ],
      error: null,
    });
    setTableResult('all_glamping_properties', {
      data: [
        {
          id: 7,
          property_name: 'Near Place',
          city: 'Austin',
          state: 'TX',
          country: 'USA',
        },
      ],
      error: null,
    });

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u6', geoToolsEnabled: true }
    );

    const res = (await tools.query_properties.execute!(
      {
        near: { latitude: 30.3, longitude: -97.7, radius_km: 25 },
        limit: 20,
        offset: 0,
        order_ascending: true,
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as { data: unknown[]; total_count: number; near?: unknown };

    expect(res.total_count).toBe(1);
    expect(res.near).toMatchObject({ latitude: 30.3, longitude: -97.7, radius_km: 25 });
    const rpcCall = calls.find((c) => c.kind === 'rpc' && c.rpc === 'properties_within_radius');
    expect(rpcCall).toBeDefined();
  });
});
