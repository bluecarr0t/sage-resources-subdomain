import { computeResults, roadAllocationPct } from '@/lib/site-design/calculator';
import type { SiteTypeConfig } from '@/lib/site-design/types';

const baseSiteTypes: SiteTypeConfig[] = [
  {
    id: 'a',
    name: 'Type A',
    width: 35,
    depth: 70,
    adr: 90,
    occupancy: 60,
    count: '',
    devCost: 25000,
  },
  {
    id: 'b',
    name: 'Type B',
    width: 45,
    depth: 90,
    adr: 115,
    occupancy: 68,
    count: '',
    devCost: 45000,
  },
];

describe('site-design calculator', () => {
  it('clamps road allocation percentage', () => {
    expect(roadAllocationPct(10)).toBeCloseTo(0.1, 5);
    expect(roadAllocationPct(18)).toBeCloseTo(0.12, 5);
    expect(roadAllocationPct(40)).toBeCloseTo(0.296, 5);
    expect(roadAllocationPct(90)).toBeCloseTo(0.3, 5);
  });

  it('auto-fills with best type when no counts are entered', () => {
    const results = computeResults(50, 75, 24, 0.9, 365, 45, 9, baseSiteTypes, {
      autoFillRemainingLand: true,
    });

    expect(results.hasCounts).toBe(false);
    expect(results.bestTypeName).toBe('Type A');
    expect(results.totalSites).toBeGreaterThan(0);
    expect(results.annualRevenue).toBeGreaterThan(0);
    expect(results.estimatedValue).not.toBeNull();
  });
});
