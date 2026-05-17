import { medianSorted } from '@/lib/fetch-glamping-industry-metrics';

describe('fetch-glamping-industry-metrics helpers', () => {
  it('medianSorted returns middle for odd length', () => {
    expect(medianSorted([1, 2, 9])).toBe(2);
  });

  it('medianSorted averages two middles for even length', () => {
    expect(medianSorted([10, 20, 30, 40])).toBe(25);
  });
});
