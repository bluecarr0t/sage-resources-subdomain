import {
  buildAnchorsWithCounts,
  buildDataQuality,
  getPropertyRateForState,
  isPropertyRateMissingForQuality,
} from '@/lib/anchor-point-insights/aggregate';
import { buildCompareDiffRows } from '@/lib/anchor-point-insights/compare-diff';
import type { PropertyWithProximity } from '@/lib/anchor-point-insights/types';

function prop(overrides: Partial<PropertyWithProximity> = {}): PropertyWithProximity {
  return {
    source: 'hipcamp',
    source_row_id: 1,
    property_name: 'Test',
    state: 'CO',
    lat: 39,
    lon: -105,
    winter_weekday: 100,
    winter_weekend: 120,
    spring_weekday: 110,
    spring_weekend: 130,
    summer_weekday: null,
    summer_weekend: null,
    fall_weekday: null,
    fall_weekend: null,
    occupancy_2024: null,
    occupancy_2025: null,
    occupancy_2026: null,
    avg_rate_2024: null,
    avg_rate_2025: null,
    avg_rate_2026: null,
    distance_miles: 5,
    distance_band: '0-10',
    drive_time_hours: 0.2,
    nearest_anchor: 'Anchor A',
    season_closed: {},
    ...overrides,
  };
}

describe('buildAnchorsWithCounts', () => {
  it('returns full list for select and top slice for table', () => {
    const anchors = [
      { id: 1, name: 'A', lat: 39, lon: -105 },
      { id: 2, name: 'B', lat: 40, lon: -106 },
    ];
    const withProximity = [
      prop({ lat: 39, lon: -105, nearest_anchor: 'A', quantity_of_units: 2 }),
      prop({ lat: 40, lon: -106, nearest_anchor: 'B', quantity_of_units: 3 }),
    ];
    const { top, all } = buildAnchorsWithCounts(anchors, withProximity);
    expect(all.length).toBe(2);
    expect(top.length).toBeLessThanOrEqual(10);
    expect(all[0].units_count_15_mi).toBeGreaterThan(0);
  });
});

describe('buildDataQuality', () => {
  it('counts missing rates and unit fields', () => {
    const q = buildDataQuality(
      [
        prop({ winter_weekday: null, winter_weekend: null, quantity_of_units: null, property_total_sites: null }),
        prop({ quantity_of_units: 2, property_total_sites: 4 }),
      ],
      false
    );
    expect(q.total_properties).toBe(2);
    expect(q.properties_missing_rate).toBe(1);
    expect(q.properties_missing_unit_fields).toBe(1);
  });
});

describe('getPropertyRateForState blended mode', () => {
  it('averages seasonal rates when useYearAvg is true', () => {
    const rate = getPropertyRateForState(prop(), true);
    expect(rate).toBe((100 + 120 + 110 + 130) / 4);
  });
});

describe('isPropertyRateMissingForQuality', () => {
  it('treats winter closed cells as documented (not missing)', () => {
    expect(
      isPropertyRateMissingForQuality(
        prop({
          winter_weekday: null,
          winter_weekend: null,
          season_closed: { winter_weekday: true, winter_weekend: true },
        }),
        false
      )
    ).toBe(false);
  });
});

describe('buildCompareDiffRows', () => {
  it('computes delta between summaries', () => {
    const rows = buildCompareDiffRows(
      {
        total_units: 100,
        properties_within_30_mi: 10,
        anchors_count: 5,
        avg_winter_rate: 200,
      },
      {
        total_units: 120,
        properties_within_30_mi: 12,
        anchors_count: 5,
        avg_winter_rate: 220,
      },
      {
        totalUnits: 'Units',
        unitsWithin: 'Within',
        propertiesWithin: 'Props',
        anchors: 'Anchors',
        avgRate: 'Rate',
      }
    );
    expect(rows[0].delta).toBe('+20');
    expect(rows.find((r) => r.label === 'Rate')?.delta).toBe('+$20');
  });
});
