import {
  createRvOverviewSnapshotInventoryAccum,
  finalizeRvOverviewSnapshotInventory,
  recordRvOverviewSnapshotInventoryRow,
} from '@/lib/rv-industry-overview/rv-overview-snapshot-inventory';

describe('rv-overview-snapshot-inventory', () => {
  it('counts distinct properties and unit/site rows per source', () => {
    const accum = createRvOverviewSnapshotInventoryAccum();
    const row = (fields: {
      property_name: string;
      state: string;
      city: string;
    }) => fields as import('@/lib/rv-industry-overview/rv-overview-wide-row').RvOverviewWideRow;

    recordRvOverviewSnapshotInventoryRow(
      accum,
      row({ property_name: 'A', state: 'Texas', city: 'Austin' }),
      'campspot'
    );
    recordRvOverviewSnapshotInventoryRow(
      accum,
      row({ property_name: 'A', state: 'Texas', city: 'Austin' }),
      'campspot'
    );
    recordRvOverviewSnapshotInventoryRow(
      accum,
      row({ property_name: 'B', state: 'California', city: 'LA' }),
      'roverpass'
    );

    expect(finalizeRvOverviewSnapshotInventory(accum)).toEqual({
      propertyCount: 2,
      unitSiteCount: 3,
      unitSiteCountCampspot: 2,
      unitSiteCountRoverpass: 1,
    });
  });
});
