import { pickCountyPopRowByCountyHint } from '@/lib/market-report/county-metrics';

describe('pickCountyPopRowByCountyHint', () => {
  const rows = [
    { name: 'Walworth County, Wisconsin', population_2020: 67_000 },
    { name: 'Dane County, Wisconsin', population_2020: 561_000 },
  ];

  it('matches geocoded admin_level_2 county name to census table row', () => {
    const hit = pickCountyPopRowByCountyHint(rows, 'Walworth County');
    expect(hit?.name).toBe('Walworth County, Wisconsin');
  });

  it('matches when hint includes state phrasing stripped by normalizer', () => {
    const hit = pickCountyPopRowByCountyHint(rows, 'Walworth County, WI');
    expect(hit?.name).toBe('Walworth County, Wisconsin');
  });

  it('returns null when token does not match any row', () => {
    expect(pickCountyPopRowByCountyHint(rows, 'Cook County, IL')).toBeNull();
  });

  it('returns null for empty hint', () => {
    expect(pickCountyPopRowByCountyHint(rows, '')).toBeNull();
    expect(pickCountyPopRowByCountyHint(rows, null)).toBeNull();
  });
});
