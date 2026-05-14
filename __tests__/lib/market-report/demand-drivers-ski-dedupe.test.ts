import {
  canonicalSkiResortNameKey,
  dedupeSkiResortsDemandDrivers,
} from '@/lib/market-report/demand-drivers';

describe('canonicalSkiResortNameKey', () => {
  it('treats Mt. and Mount spellings as the same resort', () => {
    expect(canonicalSkiResortNameKey('Mt. Bachelor')).toBe(canonicalSkiResortNameKey('Mount Bachelor'));
    expect(canonicalSkiResortNameKey('MT Bachelor')).toBe(canonicalSkiResortNameKey('mount bachelor'));
  });

  it('does not merge unrelated resorts', () => {
    expect(canonicalSkiResortNameKey('Mt Hood Meadows')).not.toBe(
      canonicalSkiResortNameKey('Timberline Lodge')
    );
  });
});

describe('dedupeSkiResortsDemandDrivers', () => {
  it('keeps one row for Mt. vs Mount Bachelor and prefers Mount spelling', () => {
    const out = dedupeSkiResortsDemandDrivers([
      { name: 'Mt. Bachelor', state: 'OR', distance_miles: 22, rating: 4.5 },
      { name: 'Mount Bachelor', state: 'OR', distance_miles: 22.1, rating: 4.5 },
      { name: 'Mt Hood Meadows', state: 'OR', distance_miles: 55, rating: 4.2 },
    ]);
    expect(out).toHaveLength(2);
    const bachelor = out.find((r) => canonicalSkiResortNameKey(r.name) === 'mount bachelor');
    expect(bachelor?.name).toMatch(/Mount Bachelor/i);
    expect(out.some((r) => r.name.includes('Hood'))).toBe(true);
  });

  it('prefers higher rating when canonical name matches', () => {
    const out = dedupeSkiResortsDemandDrivers([
      { name: 'Mt. Bachelor', state: 'OR', distance_miles: 20, rating: 4 },
      { name: 'Mount Bachelor', state: 'OR', distance_miles: 20, rating: 4.8 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.rating).toBe(4.8);
  });
});
