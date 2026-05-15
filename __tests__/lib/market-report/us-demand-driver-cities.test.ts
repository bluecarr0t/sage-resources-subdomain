import { computeMajorLargeCitiesNear, filterMajorLargeCityRows } from '@/lib/market-report/us-demand-driver-cities';

describe('us-demand-driver-cities', () => {
  it('keeps only cities at or above the large-city population floor', () => {
    const rows = filterMajorLargeCityRows();
    expect(rows.length).toBeGreaterThan(40);
    expect(rows.every((r) => r[4] >= 250_000)).toBe(true);
  });

  it('finds multiple Texas metros near Austin within 200 miles', () => {
    const { count, top } = computeMajorLargeCitiesNear(30.2672, -97.7431, 200);
    expect(count).toBeGreaterThanOrEqual(3);
    const names = top.map((c) => c.name);
    expect(names.some((n) => n.includes('Houston'))).toBe(true);
    expect(names.some((n) => n.includes('Dallas'))).toBe(true);
    expect(top[0].siteType).toMatch(/Major city|Large city/);
  });
});
