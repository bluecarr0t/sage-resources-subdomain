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

  it('all_glamping_properties: uses lat/lon only (ignores lat_num/lon_num)', () => {
    expect(
      parseRowLatLon(
        { lat_num: 0, lon_num: 0, lat: 41.5, lon: -122.25 },
        { columns: 'all_glamping_properties' }
      )
    ).toEqual({ lat: 41.5, lon: -122.25 });
  });
});
