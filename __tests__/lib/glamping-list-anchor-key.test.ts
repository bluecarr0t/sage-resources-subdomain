import {
  dedupeRowsToOutpostAnchors,
  dedupeRowsToPropertyAnchors,
  propertyListGroupKey,
  propertyOutpostGroupKey,
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

describe('propertyOutpostGroupKey / dedupeRowsToOutpostAnchors', () => {
  it('collapses unit-level property_id rows for the same outpost', () => {
    const rows = [
      {
        id: 11501,
        property_id: 'unit-c',
        slug: 'timberline-glamping-at-birmingham-standard-safari-tent',
        property_name: 'Timberline Glamping at Birmingham',
        city: 'Birmingham',
        state: 'AL',
      },
      {
        id: 11499,
        property_id: 'unit-a',
        slug: 'timberline-glamping-at-birmingham-deluxe-safari-tent',
        property_name: 'Timberline Glamping at Birmingham',
        city: 'Birmingham',
        state: 'AL',
      },
      {
        id: 11500,
        property_id: 'unit-b',
        slug: 'timberline-glamping-at-birmingham-double-safari-tent',
        property_name: 'Timberline Glamping at Birmingham',
        city: 'Birmingham',
        state: 'AL',
      },
    ];

    expect(propertyOutpostGroupKey(rows[0])).toBe(
      'legacy:timberline glamping at birmingham|birmingham|al'
    );
    const anchors = dedupeRowsToOutpostAnchors(rows);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.id).toBe(11499);
  });

  it('keeps separate outposts with different names', () => {
    const anchors = dedupeRowsToOutpostAnchors([
      {
        id: 1,
        property_id: 'a',
        property_name: 'Timberline Glamping at Birmingham',
        city: 'Birmingham',
        state: 'AL',
      },
      {
        id: 2,
        property_id: 'b',
        property_name: 'Timberline Glamping at Cheaha',
        city: 'Lineville',
        state: 'AL',
      },
    ]);
    expect(anchors).toHaveLength(2);
  });
});
