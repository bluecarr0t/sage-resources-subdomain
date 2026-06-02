import { parseGeoMapTuple } from '@/lib/comps-unified/parse-geo-map-tuple';
import { GEO_MAP_UNIT_TYPES_SEP } from '@/lib/comps-unified/geo-map-unit-types';

describe('parseGeoMapTuple', () => {
  it('reads study_id and report_year from full tuples', () => {
    const p = parseGeoMapTuple([
      30.1,
      -97.2,
      0,
      'rep:abc',
      'Test',
      null,
      null,
      10,
      5,
      1,
      `Cabin${GEO_MAP_UNIT_TYPES_SEP}Yurt`,
      '25-257A-07',
      '2025',
    ]);
    expect(p.studyId).toBe('25-257A-07');
    expect(p.reportYear).toBe('2025');
    expect(p.unitTypes).toEqual(['Cabin', 'Yurt']);
  });

  it('tolerates legacy tuples without study_id', () => {
    const p = parseGeoMapTuple([
      30.1,
      -97.2,
      0,
      'rep:abc',
      'Test',
      null,
      null,
      10,
      5,
      1,
    ]);
    expect(p.studyId).toBeNull();
  });
});
