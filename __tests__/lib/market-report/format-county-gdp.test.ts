import { formatCountyGdpThousands } from '@/lib/market-report/format-county-gdp';

describe('formatCountyGdpThousands', () => {
  it('formats >= $1B as billions with one decimal', () => {
    expect(formatCountyGdpThousands(1_000_000)).toBe('$1.0B');
    expect(formatCountyGdpThousands(9_940_000)).toBe('$9.9B');
    expect(formatCountyGdpThousands(5_000_000)).toBe('$5.0B');
  });

  it('formats < $1B as millions with one decimal', () => {
    expect(formatCountyGdpThousands(500_000)).toBe('$500.0M');
    expect(formatCountyGdpThousands(994_000)).toBe('$994.0M');
  });
});
