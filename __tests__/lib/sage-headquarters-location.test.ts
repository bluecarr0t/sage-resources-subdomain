import {
  SAGE_HQ_PLACE_QUERY,
  getSageHqGoogleMapsUrl,
  getSageHqMapEmbedUrl,
} from '@/lib/sage-headquarters-location';

describe('sage-headquarters-location', () => {
  it('builds embed URL for HQ', () => {
    const url = getSageHqMapEmbedUrl();
    expect(url).toBeTruthy();
    expect(url).toMatch(/google\.com\/maps/);
  });

  it('builds Google Maps place search URL', () => {
    const url = getSageHqGoogleMapsUrl();
    expect(url).toContain('google.com/maps');
    expect(url).toContain(encodeURIComponent(SAGE_HQ_PLACE_QUERY));
  });
});
