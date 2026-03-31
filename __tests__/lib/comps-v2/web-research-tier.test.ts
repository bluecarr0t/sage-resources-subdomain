import { resolveWebResearchQualityTier, tierFromWebKeywords } from '@/lib/comps-v2/web-research-tier';

describe('tierFromWebKeywords', () => {
  it('detects luxury and boutique language', () => {
    expect(tierFromWebKeywords('An ultra-lux glamping retreat in the Hill Country.')).toBe('luxury');
    expect(tierFromWebKeywords('Boutique canvas tents with premium amenities.')).toBe('upscale');
  });

  it('detects budget phrasing', () => {
    expect(tierFromWebKeywords('Budget-friendly family glamping from $79.')).toBe('budget');
  });
});

describe('resolveWebResearchQualityTier', () => {
  it('uses keywords when ADR is missing', () => {
    expect(
      resolveWebResearchQualityTier(null, 'Exclusive luxury resort with private hot tubs.')
    ).toBe('luxury');
  });

  it('caps luxury claims when ADR is implausibly low', () => {
    expect(
      resolveWebResearchQualityTier(45, 'Luxury glamping experience — book now.')
    ).toBe('budget');
  });

  it('prefers stronger keyword tier when ADR supports mid range', () => {
    expect(
      resolveWebResearchQualityTier(200, 'Premium boutique domes and spa.')
    ).toBe('upscale');
  });
});
