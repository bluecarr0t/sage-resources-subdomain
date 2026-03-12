/**
 * Unit tests for DOCX assembly and template key resolution.
 */

import { getTemplateKeyForMarketType } from '@/lib/ai-report-builder/assemble-docx';

describe('getTemplateKeyForMarketType', () => {
  it('returns rv for null/undefined', () => {
    expect(getTemplateKeyForMarketType(null)).toBe('rv');
    expect(getTemplateKeyForMarketType(undefined)).toBe('rv');
  });

  it('returns glamping for glamping', () => {
    expect(getTemplateKeyForMarketType('glamping')).toBe('glamping');
    expect(getTemplateKeyForMarketType('Glamping')).toBe('glamping');
  });

  it('returns rv for rv and rv_glamping', () => {
    expect(getTemplateKeyForMarketType('rv')).toBe('rv');
    expect(getTemplateKeyForMarketType('rv_glamping')).toBe('rv');
  });

  it('returns rv for unknown market types', () => {
    expect(getTemplateKeyForMarketType('other')).toBe('rv');
    expect(getTemplateKeyForMarketType('')).toBe('rv');
  });
});

