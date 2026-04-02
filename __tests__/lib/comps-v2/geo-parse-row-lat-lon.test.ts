import { parseRowLatLon } from '@/lib/comps-v2/geo';

describe('parseRowLatLon', () => {
  it('prefers lat_num / lon_num over text lat / lon', () => {
    expect(
      parseRowLatLon({
        lat_num: 41.5,
        lon_num: -122.25,
        lat: '0',
        lon: '0',
      })
    ).toEqual({ lat: 41.5, lon: -122.25 });
  });

  it('falls back to lat / lon when numeric columns absent', () => {
    expect(parseRowLatLon({ lat: '41.5', lon: '-122.25' })).toEqual({ lat: 41.5, lon: -122.25 });
  });

  it('returns null when coordinates are missing', () => {
    expect(parseRowLatLon({ lat: '', lon: '' })).toBeNull();
  });
});
