import {
  decodeGeoMapUnitTypes,
  encodeGeoMapUnitTypes,
  formatGeoMapUnitTypesDisplay,
  GEO_MAP_UNIT_TYPES_SEP,
} from '@/lib/comps-unified/geo-map-unit-types';

describe('geo-map-unit-types', () => {
  it('round-trips distinct unit types', () => {
    const encoded = encodeGeoMapUnitTypes(['Yurt', 'Safari Tent']);
    expect(encoded).toBe(`Yurt${GEO_MAP_UNIT_TYPES_SEP}Safari Tent`);
    expect(decodeGeoMapUnitTypes(encoded)).toEqual(['Yurt', 'Safari Tent']);
  });

  it('formats normalized labels for popup', () => {
    expect(formatGeoMapUnitTypesDisplay(['yurts', 'Safari Tent Glamping Resort'])).toBe(
      'Yurt, Safari Tent'
    );
  });
});
