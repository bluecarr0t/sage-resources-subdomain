/**
 * Park visitation table helpers (Combined NPS + State Parks).
 */

import {
  buildCombinedNpsTableRows,
  buildStateParksTableRows,
  formatDriveTimeFromMiles,
  selectNationalParkRows,
  selectStateParkRows,
  sumVisitors,
} from '@/lib/ai-report-builder/park-visitation';
import type { DemandDriversBlock } from '@/lib/ai-report-builder/types';

const sampleDrivers: DemandDriversBlock = {
  national_parks: {
    count: 3,
    top_names: ['Glacier National Park', 'Yellowstone', 'Big Hole'],
    items: [
      {
        name: 'Glacier National Park',
        state: 'MT',
        distance_miles: 180,
        visitors: 3_136_557,
      },
      {
        name: 'Yellowstone',
        state: 'WY',
        distance_miles: 230,
        visitors: 4_762_988,
      },
      {
        name: 'Big Hole',
        state: 'MT',
        distance_miles: 85,
        visitors: 40_938,
      },
    ],
    radius_miles: 250,
  },
  ski_resorts: { count: 0, top_names: [], items: [], radius_miles: 100 },
  wineries: { count: 0, top_names: [], items: [], radius_miles: 100 },
  major_outdoor_sites: {
    count: 2,
    top_names: ['Fort Owen State Park', 'Lake Elmo State Park'],
    items: [
      {
        name: 'Fort Owen State Park',
        state: 'MT',
        distance_miles: 11,
        visitors: 50_000,
        site_type: 'state_park',
      },
      {
        name: 'Some Trailhead',
        state: 'MT',
        distance_miles: 20,
        visitors: null,
        site_type: 'trailhead',
      },
    ],
    radius_miles: 150,
  },
  major_cities: { count: 0, top_names: [], items: [], radius_miles: 150 },
  source: 'test',
  fetched_at: '2026-01-01T00:00:00Z',
};

describe('park-visitation', () => {
  it('formats drive time ranges from miles', () => {
    expect(formatDriveTimeFromMiles(180)).toMatch(/Hours/i);
    expect(formatDriveTimeFromMiles(10)).toMatch(/miles/i);
  });

  it('builds Combined NPS Visitation rows with total', () => {
    const rows = selectNationalParkRows(sampleDrivers);
    expect(rows).toHaveLength(3);
    // Closest first
    expect(rows[0].name).toBe('Big Hole');
    const table = buildCombinedNpsTableRows(rows);
    expect(table.headers).toEqual(['Name', 'Time to Subject', 'Annual Visitors']);
    expect(table.body[table.body.length - 1][0]).toBe('Total');
    expect(table.totalVisitors).toBe(7_940_483);
    expect(sumVisitors(rows)).toBe(7_940_483);
  });

  it('selects only state_park outdoor sites', () => {
    const rows = selectStateParkRows(sampleDrivers);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toContain('Fort Owen');
    const table = buildStateParksTableRows(rows);
    expect(table.headers[1]).toMatch(/State Park/i);
  });
});
