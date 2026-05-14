import { demandDriverStatePassesRegionalFilter } from '@/lib/market-report/demand-drivers';

describe('demandDriverStatePassesRegionalFilter (OR anchor)', () => {
  it('allows Oregon in any casing', () => {
    expect(demandDriverStatePassesRegionalFilter('Oregon', 'OR')).toBe(true);
    expect(demandDriverStatePassesRegionalFilter('oregon', 'OR')).toBe(true);
    expect(demandDriverStatePassesRegionalFilter('OR', 'OR')).toBe(true);
  });

  it('allows blank or null state (coords-only rows)', () => {
    expect(demandDriverStatePassesRegionalFilter('', 'OR')).toBe(true);
    expect(demandDriverStatePassesRegionalFilter('   ', 'OR')).toBe(true);
    expect(demandDriverStatePassesRegionalFilter(null, 'OR')).toBe(true);
  });

  it('rejects states outside the anchor + border set', () => {
    expect(demandDriverStatePassesRegionalFilter('Texas', 'OR')).toBe(false);
    expect(demandDriverStatePassesRegionalFilter('TX', 'OR')).toBe(false);
  });

  it('skips filtering when anchor state is unknown', () => {
    expect(demandDriverStatePassesRegionalFilter('Texas', 'XX')).toBe(true);
    expect(demandDriverStatePassesRegionalFilter('Texas', null)).toBe(true);
  });
});
