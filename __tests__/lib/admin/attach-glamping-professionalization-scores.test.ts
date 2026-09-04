import { scoreRowsAndCollectIds } from '@/lib/admin/attach-glamping-professionalization-scores';

describe('scoreRowsAndCollectIds', () => {
  it('scores sibling inventory together and collects ids', () => {
    const { score, ids } = scoreRowsAndCollectIds([
      {
        id: 1,
        property_type: 'RV Park',
        unit_type: 'RV Site',
        quantity_of_units: 100,
        property_total_sites: 115,
      },
      {
        id: 2,
        property_type: 'RV Park',
        unit_type: 'Yurt',
        quantity_of_units: 15,
        property_total_sites: 115,
      },
    ]);

    expect(ids).toEqual(['1', '2']);
    expect(score.inventory).toBe(41);
    expect(score.total).toBeGreaterThanOrEqual(41);
  });
});
