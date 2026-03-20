import { computeResults } from '@/lib/site-design/calculator';
import type { SiteTypeConfig } from '@/lib/site-design/types';

describe('site-design calculator integration behavior', () => {
  it('respects explicit partial auto-fill toggle', () => {
    const siteTypes: SiteTypeConfig[] = [
      {
        id: 'fixed',
        name: 'Fixed Count Type',
        width: 35,
        depth: 70,
        adr: 85,
        occupancy: 65,
        count: 25,
        devCost: 25000,
      },
      {
        id: 'open',
        name: 'Open Type',
        width: 45,
        depth: 90,
        adr: 125,
        occupancy: 72,
        count: '',
        devCost: 45000,
      },
    ];

    const withAutoFill = computeResults(20, 70, 24, 0.9, 365, 45, 9, siteTypes, {
      autoFillRemainingLand: true,
    });
    const withoutAutoFill = computeResults(20, 70, 24, 0.9, 365, 45, 9, siteTypes, {
      autoFillRemainingLand: false,
    });

    expect(withAutoFill.hasPartialFill).toBe(true);
    expect(withoutAutoFill.hasPartialFill).toBe(false);
    expect(withAutoFill.totalSites).toBeGreaterThan(withoutAutoFill.totalSites);
  });

  it('flags over-capacity when entered counts exceed available land', () => {
    const siteTypes: SiteTypeConfig[] = [
      {
        id: 'dense',
        name: 'Dense Type',
        width: 45,
        depth: 90,
        adr: 110,
        occupancy: 70,
        count: 600,
        devCost: 45000,
      },
    ];

    const results = computeResults(10, 60, 30, 0.85, 365, 45, 9, siteTypes, {
      autoFillRemainingLand: true,
    });

    expect(results.overCapacity).toBe(true);
    expect(results.overCapacitySqft).toBeGreaterThan(0);
    expect(results.overCapacityAcres).toBeGreaterThan(0);
  });
});
