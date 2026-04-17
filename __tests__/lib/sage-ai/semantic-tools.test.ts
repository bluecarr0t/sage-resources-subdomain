/**
 * @jest-environment node
 */
import { createSageAiTools } from '@/lib/sage-ai/tools';
import {
  buildPropertyEmbeddingText,
  hashEmbeddingContent,
} from '@/lib/sage-ai/embeddings';

function makeSupabase() {
  const calls: Array<{ kind: string; table?: string; rpc?: string; args?: unknown }> = [];
  const tableResponders: Record<string, unknown> = {};
  const rpcResponders: Record<string, unknown> = {};

  function makeChain(result: unknown) {
    const chain: Record<string, unknown> = {};
    const impl = (_m: string) => () => chain;
    for (const m of ['select', 'eq', 'ilike', 'not', 'is', 'order', 'range']) {
      chain[m] = impl(m);
    }
    chain.maybeSingle = () => result;
    chain.single = () => result;
    chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
    chain.upsert = () => ({ error: null });
    return chain;
  }

  const supabase = {
    from(table: string) {
      calls.push({ kind: 'from', table });
      return makeChain(tableResponders[table] ?? { data: null, error: null });
    },
    rpc(name: string, args: unknown) {
      calls.push({ kind: 'rpc', rpc: name, args });
      return Promise.resolve(
        rpcResponders[name] ?? { data: [], error: null }
      );
    },
  };

  return {
    supabase,
    calls,
    setTableResult(table: string, r: unknown) {
      tableResponders[table] = r;
    },
    setRpcResult(name: string, r: unknown) {
      rpcResponders[name] = r;
    },
  };
}

describe('buildPropertyEmbeddingText', () => {
  it('omits empty/null fields and trims', () => {
    const text = buildPropertyEmbeddingText({
      id: 1,
      property_name: '  Camp Example  ',
      description: 'Hot tub cabins in the woods',
      amenities: '',
      unit_type: 'Cabin',
      property_type: null,
      city: 'Austin',
      state: 'TX',
    });
    expect(text).toContain('Name: Camp Example');
    expect(text).toContain('Location: Austin, TX');
    expect(text).toContain('Unit type: Cabin');
    expect(text).not.toContain('Amenities');
    expect(text).not.toContain('Property type');
  });
});

describe('hashEmbeddingContent', () => {
  it('is deterministic and 32 hex chars', () => {
    const a = hashEmbeddingContent('hello world');
    const b = hashEmbeddingContent('hello world');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{32}$/);
    expect(hashEmbeddingContent('other')).not.toBe(a);
  });
});

describe('semantic_search_properties tool', () => {
  it('is not registered unless semanticSearchEnabled', () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1' }
    );
    expect(Object.keys(tools)).not.toContain('semantic_search_properties');
  });

  it('is registered when semanticSearchEnabled=true', () => {
    const { supabase } = makeSupabase();
    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', semanticSearchEnabled: true }
    );
    expect(Object.keys(tools)).toContain('semantic_search_properties');
  });

  it('returns error when no embedding exists for similar_to_property_id', async () => {
    const { supabase, setTableResult } = makeSupabase();
    setTableResult('property_embeddings', { data: null, error: null });

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', semanticSearchEnabled: true }
    );

    const res = (await tools.semantic_search_properties.execute!(
      { similar_to_property_id: 99, limit: 5, min_similarity: 0.3 },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as { error?: string };
    expect(res.error).toMatch(/No embedding found/);
  });

  it('calls the RPC with filters when an embedding exists', async () => {
    const { supabase, setTableResult, setRpcResult, calls } = makeSupabase();
    const vec = Array.from({ length: 1536 }, (_, i) => i / 1536);
    setTableResult('property_embeddings', {
      data: { embedding: vec },
      error: null,
    });
    setRpcResult('semantic_search_properties_v1', {
      data: [
        {
          id: 7,
          property_name: 'Match',
          city: 'Austin',
          state: 'TX',
          country: 'USA',
          unit_type: 'Cabin',
          property_type: null,
          url: null,
          description: null,
          similarity: 0.83,
        },
      ],
      error: null,
    });

    const tools = createSageAiTools(
      supabase as unknown as Parameters<typeof createSageAiTools>[0],
      { userId: 'u1', semanticSearchEnabled: true }
    );

    const res = (await tools.semantic_search_properties.execute!(
      {
        similar_to_property_id: 42,
        limit: 5,
        min_similarity: 0.5,
        filters: { state: 'TX' },
      },
      { messages: [], toolCallId: 't', abortSignal: new AbortController().signal }
    )) as {
      mode: string;
      results: Array<{ id: number; similarity: string }>;
    };

    expect(res.mode).toBe('by_property');
    expect(res.results).toHaveLength(1);
    expect(res.results[0].similarity).toBe('0.830');
    const rpcCall = calls.find(
      (c) => c.kind === 'rpc' && c.rpc === 'semantic_search_properties_v1'
    );
    expect(rpcCall).toBeDefined();
    expect((rpcCall?.args as { filter_state?: string }).filter_state).toBe('TX');
  });
});
