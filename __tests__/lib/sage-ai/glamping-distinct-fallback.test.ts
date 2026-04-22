/**
 * @jest-environment node
 */
import {
  isAllowlistBlockedDistinctError,
  scanGlampingColumnDistinctFrequencies,
} from '@/lib/sage-ai/glamping-distinct-fallback';

describe('glamping-distinct-fallback', () => {
  it('isAllowlistBlockedDistinctError matches Postgres allowlist errors', () => {
    expect(isAllowlistBlockedDistinctError('column foo is not in the allowlist')).toBe(true);
    expect(isAllowlistBlockedDistinctError('group_by bar is not in the allowlist')).toBe(true);
    expect(isAllowlistBlockedDistinctError('connection refused')).toBe(false);
  });

  it('scanGlampingColumnDistinctFrequencies aggregates non-nulls and orders by frequency', async () => {
    const rows = [
      { unit_private_bathroom: 'Yes' },
      { unit_private_bathroom: 'Yes' },
      { unit_private_bathroom: 'No' },
      { unit_private_bathroom: null },
    ];
    const supabase = {
      from() {
        const builder = {
          select(_c: string) {
            return builder;
          },
          range(o: number, _hi: number) {
            const slice = rows.slice(o, o + 1000);
            return Promise.resolve({ data: slice, error: null });
          },
        };
        return builder;
      },
    };
    const res = await scanGlampingColumnDistinctFrequencies(
      supabase as never,
      'unit_private_bathroom',
      50
    );
    expect(res.rows_scanned).toBe(4);
    expect(res.value_rows[0]).toEqual({ value: 'Yes', row_count: 2 });
    expect(res.value_rows[1]).toEqual({ value: 'No', row_count: 1 });
    expect(res.scan_truncated).toBe(false);
  });
});
