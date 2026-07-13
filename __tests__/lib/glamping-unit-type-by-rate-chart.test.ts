import {
  filterUnitTypesForRateChart,
  sortUnitTypesForRateChart,
  unitTypeLabelsForRateChart,
  unitTypeRateChartCountLabel,
} from '@/lib/glamping-unit-type-by-rate-chart';
import type { GlampingTopUnitTypeRow } from '@/lib/fetch-glamping-industry-metrics';

function row(
  partial: Pick<GlampingTopUnitTypeRow, 'label' | 'openUnits'> &
    Partial<GlampingTopUnitTypeRow>
): GlampingTopUnitTypeRow {
  return {
    pctOfUnits: 0,
    avgRetailDailyRateMean: 100,
    ratedUnitWeight: 10,
    avgRetailDailyRateProvisional: false,
    ...partial,
  };
}

describe('filterUnitTypesForRateChart', () => {
  it('hides unit types under 15 open units', () => {
    const rows = [
      row({ label: 'Cabin', openUnits: 100 }),
      row({ label: 'Hobbit House', openUnits: 1 }),
      row({ label: 'Tree Tent', openUnits: 3 }),
      row({ label: 'Bell Tent', openUnits: 524 }),
    ];
    expect(filterUnitTypesForRateChart(rows).map((r) => r.label)).toEqual([
      'Cabin',
      'Bell Tent',
    ]);
  });

  it('always hides Cottage, Cave House, Lodge, and Canvas Cabin', () => {
    const rows = [
      row({ label: 'Cottage', openUnits: 41 }),
      row({ label: 'Cave House', openUnits: 19 }),
      row({ label: 'Lodge', openUnits: 80 }),
      row({ label: 'Cabin Tent', openUnits: 82 }),
      row({ label: 'Canvas Cabin', openUnits: 40 }),
      row({ label: 'Dome', openUnits: 343 }),
    ];
    expect(filterUnitTypesForRateChart(rows).map((r) => r.label)).toEqual([
      'Cabin Tent',
      'Dome',
    ]);
  });

  it('keeps Mirror Cabin below 15 and labels count as < 15', () => {
    const mirror = row({ label: 'Mirror Cabin', openUnits: 6 });
    expect(filterUnitTypesForRateChart([mirror])).toHaveLength(1);
    expect(unitTypeRateChartCountLabel(mirror)).toBe('< 15');
  });
});

describe('sortUnitTypesForRateChart / unitTypeLabelsForRateChart', () => {
  it('orders by rate ascending and returns chart labels', () => {
    const rows = [
      row({ label: 'Tipi', openUnits: 100, avgRetailDailyRateMean: 418 }),
      row({ label: 'Bell Tent', openUnits: 100, avgRetailDailyRateMean: 174 }),
      row({ label: 'Safari Tent', openUnits: 100, avgRetailDailyRateMean: 400 }),
    ];
    expect(sortUnitTypesForRateChart(rows).map((r) => r.label)).toEqual([
      'Bell Tent',
      'Safari Tent',
      'Tipi',
    ]);
    expect(unitTypeLabelsForRateChart(rows)).toEqual(['Bell Tent', 'Safari Tent', 'Tipi']);
  });
});
