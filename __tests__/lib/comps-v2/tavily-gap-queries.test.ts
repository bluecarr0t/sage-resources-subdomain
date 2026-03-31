/**
 * @jest-environment node
 */

import {
  buildGapFillQueries,
  extractCityFromPropertyName,
  extractRateFromWebText,
  extractRateRangeFromWebText,
  extractSiteCountFromWebText,
  isLikelyAggregateWebResult,
  normalizeWebResearchPropertyTitle,
  radiusSearchContext,
} from '@/lib/comps-v2/tavily-gap';
import type { QualityTier } from '@/lib/comps-v2/types';

describe('radiusSearchContext', () => {
  it('includes rounded radius and city + state', () => {
    expect(radiusSearchContext('Austin', 'TX', 100)).toBe('within 100 miles of Austin TX');
  });

  it('uses central state when city empty', () => {
    expect(radiusSearchContext('', 'OR', 50)).toBe('within 50 miles of central OR');
  });

  it('clamps radius to 10–400', () => {
    expect(radiusSearchContext('x', 'CA', 5)).toContain('within 10 miles');
    expect(radiusSearchContext('x', 'CA', 900)).toContain('within 400 miles');
  });
});

describe('buildGapFillQueries', () => {
  const base = {
    city: 'Bend',
    stateAbbr: 'OR',
    radiusMiles: 75,
    qualityTiers: null as QualityTier[] | null,
  };

  it('embeds radius context and Glamping in/around/near phrasing for glamping', () => {
    const qs = buildGapFillQueries({
      ...base,
      propertyKinds: ['glamping'],
      qualityTiers: null,
    });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.includes('within 75 miles of Bend OR'))).toBe(true);
    expect(qs.some((q) => /^Glamping in /i.test(q) && /Bend OR/i.test(q))).toBe(true);
    expect(qs.some((q) => /^Glamping around /i.test(q))).toBe(true);
    expect(qs.some((q) => /^Glamping near /i.test(q))).toBe(true);
  });

  it('adds tier keywords when quality tiers are set', () => {
    const qs = buildGapFillQueries({
      ...base,
      propertyKinds: ['glamping'],
      qualityTiers: ['luxury'],
    });
    const hasLuxury = qs.some((q) => q.includes('luxury high-end'));
    expect(hasLuxury).toBe(true);
  });

  it('includes RV in/around location phrasing for rv kind', () => {
    const qs = buildGapFillQueries({
      ...base,
      propertyKinds: ['rv'],
      qualityTiers: null,
    });
    expect(qs.some((q) => /RV parks in /i.test(q) && /Bend OR/i.test(q))).toBe(true);
    expect(qs.some((q) => /Campgrounds around /i.test(q))).toBe(true);
  });

  it('includes luxury glamping query for glamping kind', () => {
    const qs = buildGapFillQueries({
      ...base,
      propertyKinds: ['glamping'],
      qualityTiers: null,
    });
    expect(qs.some((q) => /luxury glamping.*Bend OR/i.test(q))).toBe(true);
  });

  it('respects maxQueries cap', () => {
    const full = buildGapFillQueries({
      ...base,
      propertyKinds: ['glamping'],
      qualityTiers: null,
    });
    const capped = buildGapFillQueries({
      ...base,
      propertyKinds: ['glamping'],
      qualityTiers: null,
      maxQueries: 2,
    });
    expect(capped.length).toBe(2);
    expect(capped[0]).toBe(full[0]);
    expect(capped[1]).toBe(full[1]);
  });
});

describe('extractRateRangeFromWebText', () => {
  it('parses nightly dollar range', () => {
    const r = extractRateRangeFromWebText('Stays from $199-$349 per night including breakfast.');
    expect(r).not.toBeNull();
    expect(r!.low).toBe(199);
    expect(r!.high).toBe(349);
    expect(r!.mid).toBe(274);
  });
});

describe('extractSiteCountFromWebText (glamping)', () => {
  it('finds glamping unit counts', () => {
    expect(extractSiteCountFromWebText('Our resort features 12 yurts and a lodge.')).toBe(12);
    expect(extractSiteCountFromWebText('We offer 14 luxury glamping domes in Texas.')).toBe(14);
  });
});

describe('isLikelyAggregateWebResult', () => {
  const okUrl = 'https://example.com/meadow-ranch';

  it('rejects user-reported listicle and directory titles', () => {
    expect(
      isLikelyAggregateWebResult('The best luxury camping near Johnson City', okUrl)
    ).toBe(true);
    expect(isLikelyAggregateWebResult('Glamping Near Johnson City, TX, US', okUrl)).toBe(true);
    expect(
      isLikelyAggregateWebResult(
        'Best Campgrounds near Johnson City, TX - Texas - The Dyrt',
        okUrl
      )
    ).toBe(true);
    expect(
      isLikelyAggregateWebResult('Cabins & Hotels in Johnson City TX | Hill Country Lodging', okUrl)
    ).toBe(true);
    expect(
      isLikelyAggregateWebResult('20 Best Cabin Rentals Near Johnson City, TX, US 2026', okUrl)
    ).toBe(true);
    expect(isLikelyAggregateWebResult('RV Camping Near Johnson City, TX, US', okUrl)).toBe(true);
    expect(
      isLikelyAggregateWebResult('THE BEST 10 RV PARKS near JOHNSON CITY, TX 78636', okUrl)
    ).toBe(true);
  });

  it('allows plausible single-property style titles', () => {
    expect(
      isLikelyAggregateWebResult('Honey Tree Retreat — Luxury Domes | Johnson City, TX', okUrl)
    ).toBe(false);
    expect(
      isLikelyAggregateWebResult('Miller Creek RV Park in Johnson City, TX', okUrl)
    ).toBe(false);
    expect(isLikelyAggregateWebResult('The Best Little Glamp Site in Texas', okUrl)).toBe(false);
  });

  it('flags /best-/ paths', () => {
    expect(
      isLikelyAggregateWebResult('Some title', 'https://blog.example.com/best-glamping-texas')
    ).toBe(true);
  });
});

describe('normalizeWebResearchPropertyTitle', () => {
  const u = 'https://example.com/listing';

  it('strips Campground Reviews and parenthetical location', () => {
    expect(
      normalizeWebResearchPropertyTitle(
        'ROADRUNNER RV PARK - Campground Reviews (Johnson City, TX)',
        u
      )
    ).toBe('ROADRUNNER RV PARK');
  });

  it('keeps slash-style branded names', () => {
    expect(normalizeWebResearchPropertyTitle('Round Mountain / Johnson City KOA Journey', u)).toBe(
      'Round Mountain / Johnson City KOA Journey'
    );
  });
});

describe('extractRateFromWebText', () => {
  it('parses nightly rate phrases', () => {
    expect(extractRateFromWebText('Nightly rates from $55 per night.')).toBe(55);
  });

  it('uses midpoint for dollar range', () => {
    expect(extractRateFromWebText('Sites $45-$65 / night plus tax')).toBe(55);
  });
});

describe('extractSiteCountFromWebText', () => {
  it('finds RV site counts', () => {
    expect(extractSiteCountFromWebText('Our park features 88 full hookup RV sites.')).toBe(88);
    expect(extractSiteCountFromWebText('Over 150 pull-through sites available')).toBe(150);
  });
});

describe('extractCityFromPropertyName', () => {
  it('parses parenthetical City, ST', () => {
    expect(extractCityFromPropertyName('ROADRUNNER RV PARK (Johnson City, TX)', 'TX')).toBe(
      'Johnson City'
    );
  });

  it('parses "in City, ST"', () => {
    expect(extractCityFromPropertyName('Miller Creek RV Park in Johnson City, TX', 'TX')).toBe(
      'Johnson City'
    );
  });
});
