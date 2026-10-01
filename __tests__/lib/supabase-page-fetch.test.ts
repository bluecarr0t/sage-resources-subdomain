import { isTransientSupabaseFetchError, readSupabasePage } from '@/lib/supabase-page-fetch';

describe('readSupabasePage', () => {
  it('treats a dropped fetch as transient', () => {
    expect(isTransientSupabaseFetchError('TypeError: fetch failed')).toBe(true);
    expect(isTransientSupabaseFetchError('column does not exist')).toBe(false);
  });

  it('retries a transient fetch failure and returns the next page', async () => {
    let calls = 0;
    const rows = await readSupabasePage<{ id: number }>(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve({ data: null, error: { message: 'TypeError: fetch failed' } });
      }
      return Promise.resolve({ data: [{ id: 1 }], error: null });
    });
    expect(calls).toBe(2);
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('does not retry a query error', async () => {
    let calls = 0;
    await expect(
      readSupabasePage(() => {
        calls += 1;
        return Promise.resolve({ data: null, error: { message: 'column does not exist' } });
      })
    ).rejects.toThrow('column does not exist');
    expect(calls).toBe(1);
  });
});
