import {
  GLAMPING_SERVICE_TIER_DEFINITIONS,
  glampingServiceTierPublicSummary,
} from '@/lib/glamping-service-tier';

describe('glampingServiceTierPublicSummary', () => {
  it('returns the public definition summary for each tier', () => {
    expect(glampingServiceTierPublicSummary('luxury')).toBe(
      GLAMPING_SERVICE_TIER_DEFINITIONS.luxury.summary
    );
    expect(glampingServiceTierPublicSummary('midscale')).toMatch(/Comfortable beds/i);
    expect(glampingServiceTierPublicSummary('rustic')).toMatch(/Budget-first/i);
  });
});
