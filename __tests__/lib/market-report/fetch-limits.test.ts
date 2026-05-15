import {
  MARKET_REPORT_FETCH_CAP_MAX,
  MARKET_REPORT_MAX_ID_CHUNKS,
  bboxFetchLimitForRadius,
  resolveNationalHipcampMaxChunks,
  resolveNationalHipcampPageSize,
  resolveNationalRvMaxChunks,
  resolveNationalRvPageSize,
} from '@/lib/market-report/fetch-limits';

describe('bboxFetchLimitForRadius', () => {
  it('stays within min and max', () => {
    expect(bboxFetchLimitForRadius(1)).toBeGreaterThanOrEqual(800);
    expect(bboxFetchLimitForRadius(1)).toBeLessThanOrEqual(MARKET_REPORT_FETCH_CAP_MAX);
    expect(bboxFetchLimitForRadius(250)).toBe(MARKET_REPORT_FETCH_CAP_MAX);
  });

  it('increases with radius', () => {
    expect(bboxFetchLimitForRadius(50)).toBeGreaterThan(bboxFetchLimitForRadius(10));
  });
});

describe('MARKET_REPORT_MAX_ID_CHUNKS', () => {
  it('is a positive integer cap for id paging', () => {
    expect(MARKET_REPORT_MAX_ID_CHUNKS).toBeGreaterThanOrEqual(2);
    expect(MARKET_REPORT_MAX_ID_CHUNKS).toBeLessThanOrEqual(32);
  });
});

describe('resolveNationalRvPageSize / resolveNationalRvMaxChunks', () => {
  it('returns sane defaults', () => {
    expect(resolveNationalRvPageSize({})).toBe(5000);
    expect(resolveNationalRvMaxChunks({})).toBe(800);
  });

  it('respects env overrides within bounds', () => {
    expect(resolveNationalRvPageSize({ MARKET_REPORT_NATIONAL_RV_PAGE_SIZE: '20000' })).toBe(15000);
    expect(resolveNationalRvPageSize({ MARKET_REPORT_NATIONAL_RV_PAGE_SIZE: '100' })).toBe(500);
    expect(resolveNationalRvMaxChunks({ MARKET_REPORT_NATIONAL_RV_MAX_CHUNKS: '99999' })).toBe(2000);
  });
});

describe('resolveNationalHipcampPageSize / resolveNationalHipcampMaxChunks', () => {
  it('defaults to RV page size and a high chunk ceiling', () => {
    expect(resolveNationalHipcampPageSize({})).toBe(5000);
    expect(resolveNationalHipcampMaxChunks({})).toBe(25_000);
  });

  it('respects Hipcamp-specific env overrides within bounds', () => {
    expect(
      resolveNationalHipcampPageSize({ MARKET_REPORT_NATIONAL_HIPCAMP_PAGE_SIZE: '9000' }),
    ).toBe(9000);
    expect(
      resolveNationalHipcampMaxChunks({ MARKET_REPORT_NATIONAL_HIPCAMP_MAX_CHUNKS: '999999' }),
    ).toBe(100_000);
    expect(
      resolveNationalHipcampMaxChunks({ MARKET_REPORT_NATIONAL_HIPCAMP_MAX_CHUNKS: '10' }),
    ).toBe(500);
  });
});
