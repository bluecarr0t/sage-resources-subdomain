/**
 * @jest-environment node
 */

import { extractLatLngFromWebContent } from '@/lib/comps-v2/extract-geo-from-web-scrape';

describe('extractLatLngFromWebContent', () => {
  it('reads JSON-LD GeoCoordinates from HTML', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {"@type":"LodgingBusiness","name":"Test","geo":{"@type":"GeoCoordinates","latitude":30.25,"longitude":-97.75}}
      </script>
      </head></html>`;
    const r = extractLatLngFromWebContent(html, '');
    expect(r).toEqual({ lat: 30.25, lng: -97.75 });
  });

  it('reads Google Maps !3d!4d pattern from markdown', () => {
    const md = 'See map https://www.google.com/maps/place/Foo/data=!3d44.0582!4d-121.3153';
    expect(extractLatLngFromWebContent('', md)).toEqual({ lat: 44.0582, lng: -121.3153 });
  });

  it('reads sibling latitude/longitude in text', () => {
    const t = '"latitude": 40.7128, "longitude": -74.006';
    expect(extractLatLngFromWebContent('', t)).toEqual({ lat: 40.7128, lng: -74.006 });
  });

  it('returns null when nothing matches', () => {
    expect(extractLatLngFromWebContent('<p>no coords</p>', 'plain text')).toBeNull();
  });
});
