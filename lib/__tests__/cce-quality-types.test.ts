/**
 * Unit tests for CCE quality type normalization
 */

import {
  toCanonicalQualityType,
  expandQualityTypeForFilter,
  getCanonicalQualityTypes,
  QUALITY_TIER_CANONICAL,
} from '../cce-quality-types';

describe('cce-quality-types', () => {
  describe('toCanonicalQualityType', () => {
    it('returns null for empty or whitespace', () => {
      expect(toCanonicalQualityType('')).toBeNull();
      expect(toCanonicalQualityType('   ')).toBeNull();
      expect(toCanonicalQualityType(null)).toBeNull();
    });

    it('normalizes known variants to canonical form', () => {
      expect(toCanonicalQualityType('excellent')).toBe('Excellent');
      expect(toCanonicalQualityType('very good')).toBe('Very Good');
      expect(toCanonicalQualityType('verygood')).toBe('Very Good');
      expect(toCanonicalQualityType('good')).toBe('Good');
      expect(toCanonicalQualityType('average')).toBe('Average');
      expect(toCanonicalQualityType('fair')).toBe('Fair');
      expect(toCanonicalQualityType('low cost')).toBe('Low cost');
      expect(toCanonicalQualityType('low-cost')).toBe('Low cost');
      expect(toCanonicalQualityType('cheap')).toBe('Low cost');
      expect(toCanonicalQualityType('low')).toBe('Low cost');
    });

    it('maps Roman numerals to Average', () => {
      expect(toCanonicalQualityType('I')).toBe('Average');
      expect(toCanonicalQualityType('II')).toBe('Average');
      expect(toCanonicalQualityType('VI')).toBe('Average');
    });

    it('maps finish types to tiers', () => {
      expect(toCanonicalQualityType('finished')).toBe('Good');
      expect(toCanonicalQualityType('finished, high-value')).toBe('Excellent');
      expect(toCanonicalQualityType('semi-finished')).toBe('Average');
      expect(toCanonicalQualityType('unfinished')).toBe('Fair');
      expect(toCanonicalQualityType('unfin/util')).toBe('Fair');
    });

    it('returns trimmed value for unknown input', () => {
      expect(toCanonicalQualityType('Custom Tier')).toBe('Custom Tier');
    });
  });

  describe('expandQualityTypeForFilter', () => {
    it('returns variants for known canonical types', () => {
      const variants = expandQualityTypeForFilter('Very Good');
      expect(variants).toContain('Very Good');
      expect(variants).toContain('very good');
      expect(variants).toContain('VERY GOOD');
    });

    it('returns Low cost variants including cheap and low', () => {
      const variants = expandQualityTypeForFilter('Low cost');
      expect(variants).toContain('Low cost');
      expect(variants).toContain('Cheap');
      expect(variants).toContain('cheap');
      expect(variants).toContain('Low');
      expect(variants).toContain('low');
    });

    it('returns single-item array for unknown canonical', () => {
      expect(expandQualityTypeForFilter('Unknown')).toEqual(['Unknown']);
    });
  });

  describe('getCanonicalQualityTypes', () => {
    it('returns deduplicated canonical list from raw values', () => {
      const raw = ['excellent', 'Excellent', 'good', 'cheap', 'low'];
      const result = getCanonicalQualityTypes(raw);
      expect(result).toContain('Excellent');
      expect(result).toContain('Good');
      expect(result).toContain('Low cost');
      expect(result.filter((x) => x === 'Excellent')).toHaveLength(1);
    });

    it('sorts by QUALITY_TIER_CANONICAL order', () => {
      const raw = ['low', 'excellent', 'average'];
      const result = getCanonicalQualityTypes(raw);
      const order = result.map((r) => QUALITY_TIER_CANONICAL.indexOf(r as (typeof QUALITY_TIER_CANONICAL)[number]));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it('filters out unknown/unmapped values', () => {
      const raw = ['excellent', 'CustomUnknown', 'good'];
      const result = getCanonicalQualityTypes(raw);
      expect(result).not.toContain('CustomUnknown');
      expect(result).toContain('Excellent');
      expect(result).toContain('Good');
    });
  });
});
