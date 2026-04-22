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
        filters: { state: 'Texas', is_glamping_property: 'Yes', is_closed: 'No' },
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
    expect(typed.data).toEqual([{ id: 1, property_name: 'Some TX Glamp', state: 'TX' }]);
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
    const { builder } = makeBuilder({ data: [], error: null, count: 0 });
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
      unsupported_filters?: string[];
    };
    expect(typed.data.map((r) => r.id).sort()).toEqual([1, 3]);
    expect(typed.total_count).toBe(2);
    expect(typed.unsupported_filters).toEqual(['is_glamping_property']);
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
