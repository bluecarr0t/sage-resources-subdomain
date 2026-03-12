/**
 * Unit tests for terminology normalization and market-type context.
 */

import {
  normalizeTerminology,
  getMarketTypeContext,
  TERMINOLOGY_CORRECTIONS,
} from '@/lib/ai-report-builder/terminology';

describe('normalizeTerminology', () => {
  it('hyphenates back-in', () => {
    expect(normalizeTerminology('back in RV sites')).toBe('back-in RV sites');
    expect(normalizeTerminology('back-in sites')).toBe('back-in sites');
    expect(normalizeTerminology('BACK IN sites')).toBe('back-in sites');
  });

  it('normalizes pull-thru to pull thru', () => {
    expect(normalizeTerminology('pull-thru sites')).toBe('pull thru sites');
    expect(normalizeTerminology('pull-through sites')).toBe('pull thru sites');
    expect(normalizeTerminology('pull thru sites')).toBe('pull thru sites');
  });

  it('preserves full hookups and FHU', () => {
    expect(normalizeTerminology('full hookups')).toBe('full hookups');
    expect(normalizeTerminology('FHU')).toBe('FHU');
  });

  it('normalizes pro forma', () => {
    expect(normalizeTerminology('pro-forma analysis')).toBe('pro forma analysis');
  });

  it('preserves financial acronyms', () => {
    expect(normalizeTerminology('NOI and IRR')).toBe('NOI and IRR');
    expect(normalizeTerminology('ADR and RevPAR')).toBe('ADR and RevPAR');
  });

  it('normalizes amp ratings', () => {
    expect(normalizeTerminology('50-amp service')).toBe('50 amp service');
    expect(normalizeTerminology('30 amp')).toBe('30 amp');
  });

  it('preserves USPAP', () => {
    expect(normalizeTerminology('USPAP compliance')).toBe('USPAP compliance');
  });

  it('handles empty and whitespace-only input', () => {
    expect(normalizeTerminology('')).toBe('');
    expect(normalizeTerminology('   ')).toBe('   ');
  });

  it('applies multiple corrections in one string', () => {
    const input =
      'The resort features back in and pull-thru sites with full hookups and 50-amp service. Pro-forma shows strong NOI.';
    const result = normalizeTerminology(input);
    expect(result).toContain('back-in');
    expect(result).toContain('pull thru');
    expect(result).toContain('full hookups');
    expect(result).toContain('50 amp');
    expect(result).toContain('pro forma');
    expect(result).toContain('NOI');
  });
});

describe('getMarketTypeContext', () => {
  it('returns glamping context for glamping', () => {
    const ctx = getMarketTypeContext('glamping');
    expect(ctx).toContain('GLAMPING');
    expect(ctx).toContain('glamping sites');
    expect(ctx).toContain('glamping resort');
    expect(ctx).toContain('Safari Tent');
    expect(ctx).toContain('luxury');
  });

  it('returns RV context for rv', () => {
    const ctx = getMarketTypeContext('rv');
    expect(ctx).toContain('RV');
    expect(ctx).toContain('RV sites');
    expect(ctx).toContain('back-in');
    expect(ctx).toContain('pull thru');
    expect(ctx).toContain('full hookups');
  });

  it('returns RV context for rv_glamping', () => {
    const ctx = getMarketTypeContext('rv_glamping');
    expect(ctx).toContain('RV');
  });

  it('returns generic context for unknown market type', () => {
    const ctx = getMarketTypeContext('other');
    expect(ctx).toContain('outdoor hospitality');
    expect(ctx).not.toContain('GLAMPING');
    expect(ctx).not.toContain('RV RESORT');
  });

  it('handles null and undefined', () => {
    expect(getMarketTypeContext(null)).toContain('outdoor hospitality');
    expect(getMarketTypeContext(undefined)).toContain('outdoor hospitality');
  });

  it('is case-insensitive', () => {
    expect(getMarketTypeContext('GLAMPING')).toContain('GLAMPING');
    expect(getMarketTypeContext('RV')).toContain('RV');
  });
});

describe('TERMINOLOGY_CORRECTIONS', () => {
  it('has expected number of correction rules', () => {
    expect(TERMINOLOGY_CORRECTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('each rule is a [RegExp, string] pair', () => {
    for (const [pattern, replacement] of TERMINOLOGY_CORRECTIONS) {
      expect(pattern).toBeInstanceOf(RegExp);
      expect(typeof replacement).toBe('string');
    }
  });
});
