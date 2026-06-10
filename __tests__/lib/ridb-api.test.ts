import { unwrapRidbRecord } from '@/lib/ridb-api';

describe('unwrapRidbRecord', () => {
  it('returns first RECDATA item when paginated', () => {
    const data = {
      RECDATA: [{ FacilityID: '99', FacilityName: 'Test Camp' }],
    };
    const result = unwrapRidbRecord<{ FacilityID: string; FacilityName: string }>(data, [
      'FacilityID',
    ]);
    expect(result?.FacilityID).toBe('99');
    expect(result?.FacilityName).toBe('Test Camp');
  });

  it('returns plain object when not paginated', () => {
    const data = { FacilityID: '42', FacilityName: 'Plain Facility' };
    const result = unwrapRidbRecord<{ FacilityID: string; FacilityName: string }>(data, [
      'FacilityID',
    ]);
    expect(result?.FacilityID).toBe('42');
  });

  it('returns null for empty RECDATA', () => {
    const data = { RECDATA: [] };
    expect(unwrapRidbRecord(data, ['FacilityID'])).toBeNull();
  });

  it('returns null when no id keys present', () => {
    expect(unwrapRidbRecord({ foo: 'bar' }, ['FacilityID'])).toBeNull();
  });

  it('handles CampsiteID on direct object', () => {
    const data = { CampsiteID: '1001', CampsiteName: 'Site A' };
    const result = unwrapRidbRecord<{ CampsiteID: string }>(data, ['CampsiteID', 'CAMPSITEID']);
    expect(result?.CampsiteID).toBe('1001');
  });
});
