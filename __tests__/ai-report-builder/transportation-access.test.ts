/**
 * Transportation access — nearest major city + highway copy.
 */

import {
  buildHighwayAccessContent,
  resolveNearestMajorCity,
} from '@/lib/ai-report-builder/transportation-access';
import { buildDriveTimeRouteMapUrl } from '@/lib/ai-report-builder/figures';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

describe('resolveNearestMajorCity', () => {
  it('picks Cleveland for Peninsula, OH', () => {
    const city = resolveNearestMajorCity(41.2382085, -81.5560433, null, 150);
    expect(city).not.toBeNull();
    expect(city!.name).toMatch(/Cleveland/i);
    expect(city!.distance_miles).toBeLessThan(30);
  });
});

describe('buildHighwayAccessContent', () => {
  it('writes I-271 / Cleveland copy for OH subjects (not I-24)', () => {
    const input = {
      property_name: 'Nordic Wellness',
      city: 'Peninsula',
      state: 'OH',
      unit_mix: [],
    } as EnrichedInput;
    const city = resolveNearestMajorCity(41.2382085, -81.5560433, null, 150)!;
    const content = buildHighwayAccessContent(
      input,
      {
        origin: city,
        destination: { latitude: 41.2382085, longitude: -81.5560433 },
        distance_miles: 24,
        duration_minutes: 35,
        duration_text: '35 mins',
        distance_text: '24.0 mi',
        overview_polyline: null,
        source: 'test',
      },
      city
    );
    expect(content.introHtmlPlain).toMatch(/Interstate 271|I-271/i);
    expect(content.introHtmlPlain).toMatch(/Cleveland/i);
    expect(content.introHtmlPlain).not.toMatch(/Interstate 24|I-24/i);
    expect(content.trafficBody).not.toMatch(/48,188|Interstate 24/i);
  });
});

describe('buildDriveTimeRouteMapUrl', () => {
  const prev = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (prev == null) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = prev;
  });

  it('includes city and subject markers and optional path', () => {
    const url = buildDriveTimeRouteMapUrl(41.4993, -81.6944, 41.2382085, -81.5560433, {
      encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    });
    expect(url).toContain('maps.googleapis.com/maps/api/staticmap');
    expect(url).toMatch(/label%3AC|label:C/);
    expect(url).toMatch(/label%3AS|label:S/);
    expect(url).toContain('path=');
  });
});
