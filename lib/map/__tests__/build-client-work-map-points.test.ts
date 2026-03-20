import { buildClientWorkMapPointsFromReportRows } from '../build-client-work-map-points';

describe('buildClientWorkMapPointsFromReportRows', () => {
  it('builds points with location, resort type, and service label', () => {
    const rows: Record<string, unknown>[] = [
      {
        id: 'a1',
        study_id: '25-001',
        city: 'Vinton',
        state: 'LA',
        latitude: 30.19,
        longitude: -93.58,
        market_type: 'rv',
        service: 'appraisal',
      },
    ];
    const pts = buildClientWorkMapPointsFromReportRows(rows);
    expect(pts).toHaveLength(1);
    expect(pts[0].location).toBe('Vinton, LA');
    expect(pts[0].resortType).toBe('RV');
    expect(pts[0].service).toBe('Appraisal');
    expect(pts[0].id).toBe('a1');
  });

  it('dedupes by study_id job key', () => {
    const rows: Record<string, unknown>[] = [
      {
        id: '1',
        study_id: '25-001',
        city: 'A',
        state: 'TX',
        latitude: 31,
        longitude: -100,
        market_type: 'glamping',
        service: 'feasibility_study',
        has_docx: true,
      },
      {
        id: '2',
        study_id: '25-001__2',
        city: 'B',
        state: 'TX',
        latitude: 32,
        longitude: -101,
        market_type: 'glamping',
        service: 'feasibility_study',
      },
    ];
    const pts = buildClientWorkMapPointsFromReportRows(rows);
    expect(pts).toHaveLength(1);
    expect(pts[0].id).toBe('1');
  });
});
