/**
 * @jest-environment node
 */
import {
  stableStringify,
  toolResultCacheHash,
  withToolResultCache,
  clearToolResultMemoryCacheForTests,
  CACHEABLE_SAGE_AI_TOOLS,
} from '@/lib/sage-ai/tool-result-cache';

describe('tool-result-cache', () => {
  beforeEach(() => {
    clearToolResultMemoryCacheForTests();
  });

  it('stableStringify is order-independent', () => {
    const a = { b: 2, a: 1, nested: { z: 3, y: 2 } };
    const b = { nested: { y: 2, z: 3 }, a: 1, b: 2 };
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(toolResultCacheHash('query_properties', a)).toBe(
      toolResultCacheHash('query_properties', b)
    );
  });

  it('returns cache hit with marker on repeated calls', async () => {
    const execute = jest.fn(async () => ({ data: [{ id: 1 }], total_count: 1 }));
    const wrapped = withToolResultCache(
      'query_properties',
      { userId: 'u1', sessionId: 's1' },
      execute
    );

    const first = await wrapped({ filters: { state: 'TX' } });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ data: [{ id: 1 }], total_count: 1 });

    const second = await wrapped({ filters: { state: 'TX' } });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({
      data: [{ id: 1 }],
      total_count: 1,
      _cache: { hit: true },
    });
  });

  it('does not cache error results', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ error: 'bad filter', data: null })
      .mockResolvedValueOnce({ data: [{ id: 2 }] });
    const wrapped = withToolResultCache(
      'count_rows',
      { userId: 'u1', sessionId: 's1' },
      execute
    );

    await wrapped({ table: 'all_sage_data' });
    await wrapped({ table: 'all_sage_data' });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('passthrough when sessionId missing', async () => {
    const execute = jest.fn(async () => ({ ok: true }));
    const wrapped = withToolResultCache('query_ota', null, execute);
    await wrapped({ source: 'hipcamp' });
    await wrapped({ source: 'hipcamp' });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not cache non-allowlisted tools', async () => {
    expect(CACHEABLE_SAGE_AI_TOOLS.has('web_search')).toBe(false);
    const execute = jest.fn(async () => ({ results: [] }));
    const wrapped = withToolResultCache(
      'web_search',
      { userId: 'u1', sessionId: 's1' },
      execute
    );
    await wrapped({ query: 'glamping' });
    await wrapped({ query: 'glamping' });
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
