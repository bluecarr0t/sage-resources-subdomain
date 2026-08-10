/**
 * Unit tests for state-parks web-research parsing + parks proximity map URLs.
 */

import { parseStateParksFromResearchText } from '@/lib/ai-report-builder/state-parks-research';
import {
  buildParksProximityMapUrl,
  buildProximityStaticMapUrl,
} from '@/lib/ai-report-builder/figures';

describe('parseStateParksFromResearchText', () => {
  it('extracts park names, miles, and visitors from research prose', () => {
    const text = `
Closest state parks to Peninsula, Ohio include Portage Lakes State Park (19 miles),
Punderson State Park 23 miles away, and Nelson-Kennedy Ledges State Park 35 miles
with 1.1 million visitors last year. West Branch State Park is 23 miles from the subject.
`;
    const rows = parseStateParksFromResearchText(text, { stateAbbr: 'OH', limit: 6 });
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.some((r) => /Portage Lakes/i.test(r.name))).toBe(true);
    expect(rows.some((r) => /Nelson-Kennedy|Nelson Kennedy/i.test(r.name))).toBe(true);
    const nelson = rows.find((r) => /Nelson/i.test(r.name));
    expect(nelson?.visitors).toBe(1_100_000);
  });
});

describe('parks proximity static map URL', () => {
  const prev = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (prev == null) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = prev;
  });

  it('builds multi-marker URL with Subject + numbered parks', () => {
    const url = buildParksProximityMapUrl(41.2382085, -81.5560433, [
      { latitude: 41.24, longitude: -81.55 },
      { latitude: 40.96917, longitude: -81.55694 },
    ]);
    expect(url).toContain('maps.googleapis.com/maps/api/staticmap');
    expect(url).toContain('markers=');
    expect(url).toMatch(/label%3AS|label:S/);
    expect(url).toMatch(/label%3A1|label:1/);
    // Auto-fit: no fixed center/zoom required when markers present
    expect(buildProximityStaticMapUrl([{ lat: 41.2, lng: -81.5, label: 'S' }])).toContain(
      'markers='
    );
  });
});
