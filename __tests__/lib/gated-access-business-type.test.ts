/**
 * @jest-environment node
 */

import {
  GATED_ACCESS_BUSINESS_TYPES,
  gatedAccessBusinessTypeLabel,
  isGatedAccessBusinessType,
  parseGatedAccessBusinessType,
} from '@/lib/gated-access-business-type';

describe('gated-access-business-type', () => {
  it('accepts known slugs case-insensitively', () => {
    expect(parseGatedAccessBusinessType('Investor')).toBe('investor');
    expect(parseGatedAccessBusinessType('DEVELOPER')).toBe('developer');
    expect(isGatedAccessBusinessType('operator')).toBe(true);
  });

  it('rejects unknown or empty values', () => {
    expect(parseGatedAccessBusinessType('')).toBeNull();
    expect(parseGatedAccessBusinessType('owner')).toBeNull();
    expect(parseGatedAccessBusinessType(null)).toBeNull();
    expect(isGatedAccessBusinessType('brand')).toBe(false);
  });

  it('labels every known type', () => {
    for (const type of GATED_ACCESS_BUSINESS_TYPES) {
      expect(gatedAccessBusinessTypeLabel(type).length).toBeGreaterThan(0);
    }
    expect(gatedAccessBusinessTypeLabel('investor')).toBe('Investor');
    expect(gatedAccessBusinessTypeLabel('media')).toBe('Media');
  });
});
