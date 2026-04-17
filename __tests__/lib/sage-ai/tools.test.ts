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
    const { supabase, calls } = makeSupabaseStub({ data: [], error: null, count: 0 });
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

  it('allows dynamic columns on campspot, rejecting malformed identifiers', async () => {
    const { supabase } = makeSupabaseStub({ data: [], error: null, count: 0 });
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
