import {
  runFlatTransformPreflight,
  type FlatOta,
} from '../../../scripts/flat-sites-transform/preflight';

describe('runFlatTransformPreflight', () => {
  const mockQuery = jest.fn();

  const client = {
    query: mockQuery,
  } as unknown as import('pg').PoolClient;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('reports missing tables when empty', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ count: '100' }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ count: '50' }] })
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({ rows: [{ count: '50' }] });

    const result = await runFlatTransformPreflight(client, ['campspot'] as FlatOta[]);

    expect(result.ok).toBe(false);
    expect(result.missing.some((m) => m.includes('propertydetails'))).toBe(true);
  });

  it('requires dims and matview snapshots; does not require base sites', async () => {
    // 4 required tables × (exists + count)
    for (let i = 0; i < 4; i++) {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] });
    }

    const result = await runFlatTransformPreflight(client, ['campspot'] as FlatOta[]);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.counts).sort()).toEqual(
      [
        'campspot.latest_sites',
        'campspot.propertydetails',
        'campspot.site_monthly_analytics',
        'campspot.sitedetails',
      ].sort()
    );
    expect(Object.keys(result.counts).some((k) => k.endsWith('.sites'))).toBe(false);
  });
});
