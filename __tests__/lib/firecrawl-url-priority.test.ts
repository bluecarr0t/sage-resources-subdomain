/**
 * @jest-environment node
 */

import {
  buildFirecrawlTargetsByCanonicalKey,
  firecrawlUrlPriorityScore,
} from '@/lib/comps-v2/firecrawl-url-priority';

describe('firecrawlUrlPriorityScore', () => {
  it('ranks property-style URLs above tripadvisor list pages', () => {
    const hip = firecrawlUrlPriorityScore('https://www.hipcamp.com/en-US/texas/foo-campground/p/bar');
    const trip = firecrawlUrlPriorityScore('https://www.tripadvisor.com/Hotels-g12345-Reviews.html');
    expect(hip).toBeGreaterThan(trip);
  });
});

describe('buildFirecrawlTargetsByCanonicalKey', () => {
  it('keeps at most N distinct canonical URLs, preferring higher scores', () => {
    const rows = [
      { url: 'https://www.tripadvisor.com/Attraction_Review-g1-d1.html' },
      { url: 'https://camp.example.com/sites/oak' },
      { url: 'https://camp.example.com/sites/maple' },
    ];
    const m = buildFirecrawlTargetsByCanonicalKey(rows, 1);
    expect(m.size).toBe(1);
    const only = [...m.values()][0];
    expect(only).toContain('camp.example.com');
  });
});
