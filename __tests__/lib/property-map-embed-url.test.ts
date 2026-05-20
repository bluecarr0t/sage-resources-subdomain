import {
  buildPropertyGoogleMapsUrl,
  buildPropertyMapEmbedUrl,
} from '@/lib/property-map-embed-url';
import { buildPropertyMapQueryLabel } from '@/lib/property-map-location';

describe('buildPropertyMapEmbedUrl', () => {
  const origKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  afterEach(() => {
    if (origKey === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = origKey;
    }
  });

  it('returns null when no coordinates or place query', () => {
    expect(buildPropertyMapEmbedUrl({ lat: NaN, lon: 0 })).toBeNull();
    expect(buildPropertyMapEmbedUrl({ lat: 91, lon: 0 })).toBeNull();
    expect(buildPropertyMapEmbedUrl({})).toBeNull();
  });

  it('uses embed v1 API when key is set', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    const url = buildPropertyMapEmbedUrl({
      lat: 52.268,
      lon: -113.811,
      propertyName: 'Collinswood Retreat',
      addressLine: 'Red Deer, AB',
    });
    expect(url).toContain('maps/embed/v1/place');
    expect(url).toContain('key=test-key');
    expect(url).toContain('Collinswood');
  });

  it('embeds by place query when lat/lon are missing', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const url = buildPropertyMapEmbedUrl({
      placeQuery: 'Collinswood Retreat, Red Deer, AB, Canada',
    });
    expect(url).toContain('google.com/maps?');
    expect(url).toContain('Collinswood');
    expect(url).toContain('output=embed');
  });

  it('falls back to coordinate embed without API key', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const url = buildPropertyMapEmbedUrl({ lat: 40.1, lon: -105.2 });
    expect(url).toContain('google.com/maps?');
    expect(url).toContain('output=embed');
  });
});

describe('buildPropertyMapQueryLabel', () => {
  it('builds a label for Collinswood-style rows', () => {
    expect(
      buildPropertyMapQueryLabel({
        property_name: 'Collinswood Retreat',
        city: 'Red Deer',
        state: 'AB',
        country: 'Canada',
        address: null,
      })
    ).toBe('Collinswood Retreat, Red Deer, AB, Canada');
  });
});

describe('buildPropertyGoogleMapsUrl', () => {
  it('builds a coordinate link', () => {
    expect(buildPropertyGoogleMapsUrl({ lat: 52.26, lon: -113.81, zoom: 12 })).toBe(
      'https://www.google.com/maps?q=52.26,-113.81&z=12'
    );
  });

  it('builds a place search link', () => {
    expect(
      buildPropertyGoogleMapsUrl({ placeQuery: 'Collinswood Retreat, Red Deer, AB' })
    ).toContain('maps/search');
  });
});
