import { buildSiteDesignUrlParams, parseSitesFromUrl } from '@/lib/site-design/url-state';
import type { SiteTypeConfig } from '@/lib/site-design/types';

const makeSite = (id: string): SiteTypeConfig => ({
  id,
  name: `Type ${id}`,
  width: 35,
  depth: 70,
  adr: 90,
  occupancy: 60,
  count: 12,
  devCost: 25000,
});

describe('site-design url state helpers', () => {
  it('round-trips site types when query stays within size limit', () => {
    const siteTypes = [makeSite('1'), makeSite('2')];
    const { params, didOmitSites } = buildSiteDesignUrlParams({
      activePreset: '',
      grossAcres: 50,
      usablePct: 75,
      roadWidth: 24,
      blockEfficiency: 0.9,
      operatingNights: 365,
      operatingExpenseRatio: 45,
      capRate: 9,
      autoFillRemainingLand: true,
      siteTypes,
    });

    expect(didOmitSites).toBe(false);
    const parsed = parseSitesFromUrl(params.get('sites'));
    expect(parsed).toEqual(siteTypes);
  });

  it('omits site types when query payload is too large', () => {
    const oversizedSiteTypes = Array.from({ length: 25 }, (_, i) => ({
      ...makeSite(String(i + 1)),
      name: `Extremely long site type name to force URL truncation ${i + 1}`.repeat(4),
    }));

    const { params, didOmitSites } = buildSiteDesignUrlParams({
      activePreset: '',
      grossAcres: 50,
      usablePct: 75,
      roadWidth: 24,
      blockEfficiency: 0.9,
      operatingNights: 365,
      operatingExpenseRatio: 45,
      capRate: 9,
      autoFillRemainingLand: true,
      siteTypes: oversizedSiteTypes,
    });

    expect(didOmitSites).toBe(true);
    expect(params.get('sites')).toBeNull();
  });
});
