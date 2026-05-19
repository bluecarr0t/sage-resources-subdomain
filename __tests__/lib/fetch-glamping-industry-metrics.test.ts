import {
  meanAndMedianAdr,
  medianSorted,
  propertyLevelAdrValues,
  recordPropertyAdrSample,
} from '@/lib/fetch-glamping-industry-metrics';
import { bucketGlampingIsOpenForMetrics } from '@/lib/glamping-is-open';

describe('fetch-glamping-industry-metrics helpers', () => {
  it('bucketGlampingIsOpenForMetrics recognizes proposed development', () => {
    expect(bucketGlampingIsOpenForMetrics('Proposed Development')).toBe('proposed_development');
    expect(bucketGlampingIsOpenForMetrics('Under Construction')).toBe('under_construction');
    expect(bucketGlampingIsOpenForMetrics('Yes')).toBe('yes');
  });

  it('medianSorted returns middle for odd length', () => {
    expect(medianSorted([1, 2, 9])).toBe(2);
  });

  it('medianSorted averages two middles for even length', () => {
    expect(medianSorted([10, 20, 30, 40])).toBe(25);
  });

  it('propertyLevelAdrValues uses one median ADR per property', () => {
    const byProperty = new Map<string, number[]>();
    for (const adr of [96, 96, 96, 80]) {
      recordPropertyAdrSample(byProperty, 'Tarantula Ranch', adr);
    }
    recordPropertyAdrSample(byProperty, 'Mustang Monument', 2400);
    recordPropertyAdrSample(byProperty, 'Mustang Monument', 2600);

    const samples = propertyLevelAdrValues(byProperty);
    expect(samples).toEqual([96, 2500]);
    const { median } = meanAndMedianAdr(samples);
    expect(median).toBe(1298);
  });
});
