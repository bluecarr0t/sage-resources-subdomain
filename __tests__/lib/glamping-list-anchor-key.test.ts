import {
  dedupeRowsToPropertyAnchors,
  propertyListGroupKey,
} from '@/lib/admin/glamping-list-anchor-key';

describe('glamping-list-anchor-key', () => {
  it('groups by property_id', () => {
    const key = propertyListGroupKey({
      property_id: '7aaa5233-9e19-49fd-8568-a7e4f9410b50',
      property_name: 'Serenity Ridge',
    });
    expect(key).toBe('pid:7aaa5233-9e19-49fd-8568-a7e4f9410b50');
  });

  it('keeps lowest id per property', () => {
    const rows = dedupeRowsToPropertyAnchors([
      { id: 12013, property_id: 'abc', property_name: 'Test' },
      { id: 11582, property_id: 'abc', property_name: 'Test' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(11582);
  });
});
