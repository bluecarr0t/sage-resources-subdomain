/**
 * @jest-environment node
 */
import { createSageAiTools } from '@/lib/sage-ai/tools';

/**
 * Build a chainable thenable that mimics a PostgREST builder. `result` is the
 * object returned when the builder is awaited, and `captured` records every
 * method call for assertions.
 */
function makeBuilder(result: unknown) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown) => resolve(result);
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return proxy;
      };
    },
  };
  const proxy: unknown = new Proxy({}, handler);
  return { builder: proxy, calls };
}

function makeSupabaseStub(result: unknown) {
  const fromCalls: string[] = [];
  const { builder, calls } = makeBuilder(result);
  const supabase = {
    from(table: string) {
      fromCalls.push(table);
      return builder;
    },
  };
  return { supabase, fromCalls, calls };
}

describe('createSageAiTools', () => {
  it('does not register the removed execute_safe_sql tool', () => {
    const { supabase } = makeSupabaseStub({ data: [], error: null, count: 0 });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    expect(Object.keys(tools)).not.toContain('execute_safe_sql');
  });

  it('does not register Tavily/Firecrawl tools unless webResearchEnabled', () => {
    const { supabase } = makeSupabaseStub({ data: [], error: null, count: 0 });
    const without = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', webResearchEnabled: false }
    );
    expect(Object.keys(without)).not.toContain('web_search');
    expect(Object.keys(without)).not.toContain('scrape_webpage');
    expect(Object.keys(without)).not.toContain('crawl_website');

    const withWeb = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', webResearchEnabled: true }
    );
    expect(Object.keys(withWeb)).toEqual(
      expect.arrayContaining(['web_search', 'scrape_webpage', 'crawl_website'])
    );
  });

  it('exposes find_glamping_columns for plain-language feature lookup', async () => {
    const { supabase } = makeSupabaseStub({ data: [], error: null, count: 0 });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    expect(Object.keys(tools)).toContain('find_glamping_columns');
    const res = await tools.find_glamping_columns.execute!(
      { query: 'private bath ensuite', max_results: 3 },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const top = (res as { matches?: Array<{ column: string }> }).matches;
    expect(top?.[0]?.column).toBe('unit_private_bathroom');
  });

  it('accepts allowlisted columns on query_properties', async () => {
    const { supabase, calls } = makeSupabaseStub({ data: [{ id: '1' }], error: null, count: 1 });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.query_properties.execute!(
      { columns: ['id', 'property_name', 'state'], limit: 10, offset: 0, order_ascending: true },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    expect(res).not.toHaveProperty('rejected_columns');
    const selectCall = calls.find((c) => c.method === 'select');
    expect(selectCall?.args[0]).toBe('id, property_name, state');
  });

  it('rejects unknown columns on query_properties and falls back to summary columns', async () => {
    const { supabase, calls } = makeSupabaseStub({ data: [{ id: '1' }], error: null, count: 1 });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.query_properties.execute!(
      { columns: ['state', 'evil; DROP TABLE users', 'price'], limit: 10, offset: 0, order_ascending: true },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    expect(res).toHaveProperty('rejected_columns');
    expect((res as { rejected_columns: string[] }).rejected_columns).toEqual(
      expect.arrayContaining(['evil; DROP TABLE users', 'price'])
    );
    const selectCall = calls.find((c) => c.method === 'select');
    expect(selectCall?.args[0]).toContain('state');
  });

  it('query_properties default select includes seasonal rate columns and effective_retail_adr on rows', async () => {
    const { supabase, calls } = makeSupabaseStub({
      data: [
        {
          id: 1,
          property_name: 'P',
          city: 'Vancouver',
          state: 'BC',
          country: 'Canada',
          rate_avg_retail_daily_rate: null,
          rate_summer_weekend: 950,
        },
      ],
      error: null,
      count: 1,
    });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.query_properties.execute!(
      { filters: { country: 'Canada' }, limit: 10, offset: 0, order_ascending: true },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const selectCall = calls.find((c) => c.method === 'select');
    expect(String(selectCall?.args[0])).toContain('rate_summer_weekend');
    const typed = res as { data: Array<{ effective_retail_adr: number | null }> };
    expect(typed.data[0]!.effective_retail_adr).toBe(950);
  });

  it('silently drops placeholder near={lat:0, lng:0} and falls through to filter-only branch', async () => {
    const rpcCalls: Array<{ name: string; args: unknown }> = [];
    const fromCalls: string[] = [];
    const { builder, calls } = makeBuilder({
      data: [{ id: 1, property_name: 'Some TX Glamp', state: 'TX' }],
      error: null,
      count: 1,
    });
    const supabase = {
      from(table: string) {
        fromCalls.push(table);
        return builder;
      },
      rpc(name: string, args: unknown) {
        rpcCalls.push({ name, args });
        return Promise.resolve({ data: [], error: null });
      },
    };

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.query_properties.execute!(
      {
        near: { latitude: 0, longitude: 0, radius_km: 1 },
        filters: { state: 'Texas', is_glamping_property: 'Yes', is_open: 'Yes' },
        limit: 50,
        offset: 0,
        order_ascending: true,
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as unknown as {
      data: Array<{ id: number; state: string }>;
      total_count: number;
      near_placeholder_dropped?: boolean;
      note?: string;
      error?: string;
    };
    // The proximity RPC must NOT be called for the sentinel — we want the
    // tool to fall through to the regular filtered query.
    expect(rpcCalls).toHaveLength(0);
    // The filter-branch table query MUST run.
    expect(fromCalls).toEqual(['all_glamping_properties']);
    // State filter normalized to "TX" via .ilike('state', ...).
    const ilikeCall = calls.find((c) => c.method === 'ilike');
    expect(ilikeCall?.args).toEqual(['state', 'TX']);
    expect(typed.error).toBeUndefined();
    expect(typed.data).toEqual([
      { id: 1, property_name: 'Some TX Glamp', state: 'TX', effective_retail_adr: null },
    ]);
    expect(typed.total_count).toBe(1);
    expect(typed.near_placeholder_dropped).toBe(true);
    expect(typed.note).toMatch(/placeholder/i);
  });

  it('honors state filter in proximity branch via in-memory predicate', async () => {
    const rpcRows = [
      { id: 1, property_name: 'A', state: 'CO', distance_km: 5 },
      { id: 2, property_name: 'B', state: 'NM', distance_km: 7 },
      { id: 3, property_name: 'C', state: 'co', distance_km: 9 }, // case-insensitive
    ];
    const fullRows = [
      {
        id: 1,
        property_name: 'A',
        state: 'CO',
        is_glamping_property: 'Yes',
        is_open: 'Yes',
      },
      {
        id: 2,
        property_name: 'B',
        state: 'NM',
        is_glamping_property: 'Yes',
        is_open: 'Yes',
      },
      {
        id: 3,
        property_name: 'C',
        state: 'co',
        is_glamping_property: 'Yes',
        is_open: 'Yes',
      },
    ];
    const { builder } = makeBuilder({ data: fullRows, error: null, count: fullRows.length });
    const supabase = {
      from() {
        return builder;
      },
      rpc() {
        return Promise.resolve({ data: rpcRows, error: null });
      },
    };

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.query_properties.execute!(
      {
        near: { latitude: 39.7392, longitude: -104.9903, radius_km: 50 },
        filters: { state: 'Colorado', is_glamping_property: 'Yes' },
        limit: 50,
        offset: 0,
        order_ascending: true,
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as unknown as {
      data: Array<{ id: number; state: string }>;
      total_count: number;
    };
    expect(typed.data.map((r) => r.id).sort()).toEqual([1, 3]);
    expect(typed.total_count).toBe(2);
  });

  it('accepts near with column_eq_filters after hydrating full rows from all_glamping_properties', async () => {
    const rpcRows = [
      { id: 42, property_name: 'Pool Place', state: 'CO', distance_km: 2 },
    ];
    const fullRows = [
      {
        id: 42,
        property_name: 'Pool Place',
        state: 'CO',
        property_pool: 'Yes',
        is_glamping_property: 'Yes',
      },
    ];
    const { builder } = makeBuilder({ data: fullRows, error: null, count: 1 });
    const supabase = {
      from() {
        return builder;
      },
      rpc() {
        return Promise.resolve({ data: rpcRows, error: null });
      },
    };
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = (await tools.query_properties.execute!(
      {
        near: { latitude: 39.7, longitude: -104.9, radius_km: 20 },
        column_eq_filters: [{ column: 'property_pool', value: 'Yes' }],
        limit: 10,
        offset: 0,
        order_ascending: true,
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as { error?: string; data?: Array<{ id: number; property_pool?: string }> };
    expect(res.error).toBeUndefined();
    expect(res.data).toHaveLength(1);
    expect(res.data![0]!.id).toBe(42);
    expect(res.data![0]!.property_pool).toBe('Yes');
  });

  it('returns an error for order_by columns outside the allowlist', async () => {
    const { supabase } = makeSupabaseStub({ data: [], error: null, count: 0 });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.query_properties.execute!(
      { order_by: 'not_a_column', limit: 10, offset: 0, order_ascending: true },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    expect(res).toHaveProperty('error');
  });

  it('strips empty-string filter values on aggregate_properties before calling the RPC', async () => {
    // Regression: the model often "fills in every slot" with `""` for optional
    // string filters (e.g. `state: ""`). Without this strip, the v2 aggregate
    // RPC runs `state ILIKE ''` (no wildcard, empty pattern) and returns 0
    // rows for what should have been a country-only aggregate.
    const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const supabase = {
      from() {
        const { builder } = makeBuilder({ data: [], error: null, count: 0 });
        return builder;
      },
      rpc(name: string, args: Record<string, unknown>) {
        rpcCalls.push({ name, args });
        return Promise.resolve({
          data: [
            {
              key: 'BC',
              unique_properties: 69,
              avg_daily_rate: 250,
              median_daily_rate: 240,
              total_units: 1200,
              total_sites: 500,
            },
            {
              key: 'ON',
              unique_properties: 49,
              avg_daily_rate: 300,
              median_daily_rate: 280,
              total_units: 800,
              total_sites: 400,
            },
          ],
          error: null,
        });
      },
    };
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.aggregate_properties.execute!(
      {
        group_by: 'state',
        filters: {
          state: '',
          country: 'Canada',
          unit_type: '   ',
        is_open: 'Yes',
        is_glamping_property: 'Yes',
      },
    },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    expect(rpcCalls).toHaveLength(1);
    const sentFilters = rpcCalls[0]!.args.filters as Record<string, unknown>;
    expect(sentFilters).not.toHaveProperty('state');
    expect(sentFilters).not.toHaveProperty('unit_type');
    expect(sentFilters.country).toBe('Canada');
    expect(sentFilters.is_open).toBe('Yes');
    expect(sentFilters.is_glamping_property).toBe('Yes');
    const typed = res as {
      total_groups: number;
      applied_filters: Record<string, unknown>;
      summary: string;
      aggregates: Array<Record<string, unknown>>;
    };
    expect(typed.total_groups).toBe(2);
    expect(typed.applied_filters).not.toHaveProperty('state');
    expect(typed.summary).toMatch(/country=Canada/);
    expect(typed.aggregates[0]!.properties).toBe(69);
    expect(typed.aggregates[0]!).not.toHaveProperty('count');
  });

  it('rejects `state: "Canada"` on aggregate_properties with a corrective error', async () => {
    const supabase = {
      from() {
        const { builder } = makeBuilder({ data: [], error: null, count: 0 });
        return builder;
      },
      rpc() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.aggregate_properties.execute!(
      {
        group_by: 'unit_type',
        filters: { state: 'Canada' },
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as { error?: string; aggregates: null; hint?: string };
    expect(typed.error).toBeDefined();
    expect(typed.error).toMatch(/country, not a state/i);
    expect(typed.error).toMatch(/filters\.country=/);
  });

  it('drops filter keys with malicious identifiers on count_rows', async () => {
    const { supabase } = makeSupabaseStub({ count: 3, error: null });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.count_rows.execute!(
      {
        table: 'all_glamping_properties',
        filters: { state: 'TX', 'drop table; --': 'x', price: '100' },
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as { rejected_filters?: string[]; filters: Record<string, string> };
    expect(typed.rejected_filters).toEqual(
      expect.arrayContaining(['drop table; --', 'price'])
    );
    expect(typed.filters).toEqual({ state: 'TX' });
  });

  it('returns _emptyRetry on first empty result and _emptyRetryExhausted after the budget', async () => {
    const { supabase } = makeSupabaseStub({ data: [], error: null, count: 0 });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );

    const args = {
      filters: { state: 'TX' as const },
      limit: 10,
      offset: 0,
      order_ascending: true,
    };

    const first = await tools.query_properties.execute!(args, {
      messages: [],
      toolCallId: 't1',
      abortSignal: new AbortController().signal,
    });
    expect(first).toMatchObject({ _emptyRetry: true, attempt: 1 });
    expect(first).not.toHaveProperty('error');

    // Same args again — budget is now exhausted, surface a hard error.
    const second = await tools.query_properties.execute!(args, {
      messages: [],
      toolCallId: 't2',
      abortSignal: new AbortController().signal,
    });
    expect(second).toMatchObject({
      _emptyRetryExhausted: true,
      attempts: 2,
      data: null,
    });
    expect(second).toHaveProperty('error');

    // A *different* tool's empty result should NOT be affected by the
    // counter for query_properties.
    const otherTool = await tools.query_hipcamp.execute!(
      { filters: { state: 'TX' }, limit: 10, offset: 0 },
      { messages: [], toolCallId: 't3', abortSignal: new AbortController().signal }
    );
    expect(otherTool).toMatchObject({ _emptyRetry: true, attempt: 1 });
  });

  it('does not retry-gate count_rows when count is 0 (zero is a valid answer)', async () => {
    const { supabase } = makeSupabaseStub({ count: 0, error: null });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.count_rows.execute!(
      { table: 'all_glamping_properties', filters: { state: 'TX' } },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    expect(res).toMatchObject({ count: 0 });
    expect(res).not.toHaveProperty('_emptyRetry');
    expect(res).not.toHaveProperty('error');
  });

  it('count_unique_properties dedupes by trimmed-lowercase address with name+city+state+country fallback', async () => {
    // 5 unit-level rows representing 3 distinct properties:
    //  - "Radius Retreat" appears on 2 rows with the SAME address (different
    //    casing/whitespace) → dedupes to 1.
    //  - "Daydreamer Domes" has a null address and is split across 2 rows;
    //    falls back to name+city+state+country → dedupes to 1.
    //  - "Cheekye Ranch" is a single distinct address → 1.
    const rows = [
      {
        address: '7058 Hwy 95',
        property_name: 'Radius Retreat',
        city: 'Radium',
        state: 'BC',
        country: 'Canada',
        quantity_of_units: 4,
        rate_avg_retail_daily_rate: 250,
      },
      {
        address: ' 7058 hwy 95 ',
        property_name: 'Radius Retreat',
        city: 'Radium',
        state: 'BC',
        country: 'Canada',
        quantity_of_units: 6,
        rate_avg_retail_daily_rate: 350,
      },
      {
        address: null,
        property_name: 'Daydreamer Domes',
        city: 'Tofino',
        state: 'BC',
        country: 'Canada',
        quantity_of_units: 3,
        rate_avg_retail_daily_rate: null,
      },
      {
        address: '',
        property_name: 'Daydreamer Domes',
        city: 'Tofino',
        state: 'BC',
        country: 'Canada',
        quantity_of_units: 2,
        rate_avg_retail_daily_rate: 0,
      },
      {
        address: '60001 Squamish Valley Rd',
        property_name: 'Cheekye Ranch',
        city: 'Squamish',
        state: 'BC',
        country: 'Canada',
        quantity_of_units: 5,
        rate_avg_retail_daily_rate: 500,
      },
    ];
    // Return all rows on the first page; second page returns empty so the
    // pagination loop terminates after one iteration.
    let callCount = 0;
    const supabase = {
      from() {
        const builder = new Proxy({}, {
          get(_t, prop) {
            if (prop === 'then') {
              callCount += 1;
              const result =
                callCount === 1
                  ? { data: rows, error: null }
                  : { data: [], error: null };
              return (resolve: (v: unknown) => unknown) => resolve(result);
            }
            return () => builder;
          },
        });
        return builder;
      },
    };

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.count_unique_properties.execute!(
      { filters: { country: 'Canada', is_glamping_property: 'Yes' } },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as {
      unique_properties: number;
      unit_level_rows: number;
      rows_with_fallback_key: number;
      total_units: number;
      avg_retail_daily_rate: number | null;
      median_retail_daily_rate: number | null;
      rated_rows_counted: number;
    };
    expect(typed.unique_properties).toBe(3);
    expect(typed.unit_level_rows).toBe(5);
    expect(typed.rows_with_fallback_key).toBe(2);
    expect(typed.total_units).toBe(20);
    // 3 rated rows: 250, 350, 500 (rate=0 and rate=null are excluded);
    // avg is unit-weighted by quantity_of_units.
    expect(typed.rated_rows_counted).toBe(3);
    const weighted = (250 * 4 + 350 * 6 + 500 * 5) / (4 + 6 + 5);
    expect(typed.avg_retail_daily_rate).toBeCloseTo(weighted, 5);
    expect(typed.median_retail_daily_rate).toBe(350);
  });

  it('count_unique_properties rejects country names passed in filters.state with a corrective error', async () => {
    const { supabase } = makeSupabaseStub({ data: [], error: null });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.count_unique_properties.execute!(
      { filters: { state: 'Canada' } },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as { error?: string };
    expect(typed.error).toBeDefined();
    expect(typed.error).toMatch(/country, not a state/i);
    expect(typed.error).toMatch(/filters\.country=/);
  });

  it('allows dynamic columns on campspot, rejecting malformed identifiers', async () => {
    const { supabase } = makeSupabaseStub({ data: [{ arbitrary_col: 'x' }], error: null, count: 1 });
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.query_campspot.execute!(
      {
        columns: ['arbitrary_col', 'another_col', '1bad'],
        filters: { arbitrary_col: 'foo', 'foo bar': 'x' },
        limit: 10,
        offset: 0,
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as {
      rejected_columns?: string[];
      rejected_filters?: string[];
    };
    expect(typed.rejected_columns).toEqual(['1bad']);
    expect(typed.rejected_filters).toEqual(['foo bar']);
  });

  it('clarifying_question deduplicates and normalizes options, caps at 6', async () => {
    const { supabase } = makeSupabaseStub({});
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0]
    );
    const res = await tools.clarifying_question.execute!(
      {
        question: '  Which Texas region?  ',
        options: [
          'Whole Texas, statewide',
          '  Hill Country  ',
          'Hill Country',
          'Gulf Coast',
          'DFW',
          'East Texas',
          'West Texas',
          'Panhandle',
        ],
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as { type: string; question: string; options: string[] };
    expect(typed.type).toBe('clarifying_question');
    expect(typed.question).toBe('Which Texas region?');
    expect(typed.options).toEqual([
      'Whole Texas, statewide',
      'Hill Country',
      'Gulf Coast',
      'DFW',
      'East Texas',
      'West Texas',
    ]);
  });
});

describe('scrape_webpage / crawl_website prompt-injection wrapping', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.FIRECRAWL_API_KEY;
  });

  it('wraps scrape_webpage markdown in UNTRUSTED_CONTENT tags and caps size', async () => {
    process.env.FIRECRAWL_API_KEY = 'test';
    const { supabase } = makeSupabaseStub({});
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', webResearchEnabled: true }
    );
    const huge = 'A'.repeat(20_000);
    global.fetch = jest.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({ success: true, data: { markdown: huge } }),
        }) as Response
    );

    const res = await tools.scrape_webpage.execute!(
      {
        url: 'https://example.com',
        formats: ['markdown'],
        only_main_content: true,
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    );
    const typed = res as { content: string; truncated: boolean };
    expect(typed.content).toMatch(/<UNTRUSTED_CONTENT source="https:\/\/example.com">/);
    expect(typed.content).toMatch(/<\/UNTRUSTED_CONTENT>$/);
    expect(typed.truncated).toBe(true);
    expect(typed.content.length).toBeLessThan(huge.length);
  });
});
