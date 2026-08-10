/**
 * Area map helpers — tile math + OSM/Google fetch path.
 */

import {
  buildLocalAreaMapUrl,
  buildStateAreaMapUrl,
  latLngToTileXY,
  renderOsmStaticMap,
} from '@/lib/ai-report-builder/figures';

describe('latLngToTileXY', () => {
  it('maps Peninsula OH into expected OSM tile at z13', () => {
    const { x, y } = latLngToTileXY(41.2382085, -81.5560433, 13);
    expect(x).toBeGreaterThan(2200);
    expect(x).toBeLessThan(2300);
    expect(y).toBeGreaterThan(3000);
    expect(y).toBeLessThan(3100);
  });
});

describe('Google static map URLs', () => {
  const prev = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (prev == null) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = prev;
  });

  it('builds regional and local URLs centered on the subject with a marker', () => {
    const regional = buildStateAreaMapUrl(41.2382085, -81.5560433);
    const local = buildLocalAreaMapUrl(41.2382085, -81.5560433);
    expect(regional).toContain('maps.googleapis.com/maps/api/staticmap');
    expect(regional).toContain('41.2382085');
    expect(regional).toContain('markers=');
    expect(local).toContain('zoom=13');
    expect(regional).toContain('zoom=9');
  });
});

describe('renderOsmStaticMap', () => {
  it(
    'renders a PNG mosaic with Subject overlay for Peninsula OH',
    async () => {
      const img = await renderOsmStaticMap(41.2382085, -81.5560433, {
        zoom: 12,
        width: 320,
        height: 240,
      });
      expect(img).not.toBeNull();
      expect(img!.ext).toBe('png');
      expect(img!.provider).toBe('osm');
      expect(img!.buffer.length).toBeGreaterThan(2000);
      expect(img!.buffer[0]).toBe(0x89);
      expect(img!.buffer[1]).toBe(0x50);
    },
    60_000
  );
});
