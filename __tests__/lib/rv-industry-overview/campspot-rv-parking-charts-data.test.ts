import {
  aggregateCampspotRowsToRvParkingCharts,
  classifyRvParkingType,
  type CampspotRvParkingAggRow,
} from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';

describe('classifyRvParkingType', () => {
  it('detects pull-through variants', () => {
    expect(classifyRvParkingType('Pull Thru Site')).toBe('pull_thru');
    expect(classifyRvParkingType('pull-through')).toBe('pull_thru');
  });

  it('detects back-in variants', () => {
    expect(classifyRvParkingType('Back-in Site')).toBe('back_in');
    expect(classifyRvParkingType('back in')).toBe('back_in');
  });

  it('maps empty or unknown to not_listed', () => {
    expect(classifyRvParkingType('')).toBe('not_listed');
    expect(classifyRvParkingType('Parallel')).toBe('not_listed');
  });
});

describe('aggregateCampspotRowsToRvParkingCharts', () => {
  function row(p: Partial<CampspotRvParkingAggRow>): CampspotRvParkingAggRow {
    return {
      state: 'TX',
      city: 'Austin',
      unit_type: 'RV Site',
      description: null,
      property_name: 'P',
      quantity_of_units: null,
      retail_daily_rate_ytd: null,
      avg_retail_daily_rate_2025: '60',
      rv_parking: null,
      ...p,
    };
  }

  it('counts RV rows for distribution and excludes not_listed from rate means', () => {
    const rows: CampspotRvParkingAggRow[] = [
      row({ rv_parking: 'Back-in', avg_retail_daily_rate_2025: '60' }),
      row({ rv_parking: 'Back-in', avg_retail_daily_rate_2025: '66' }),
      row({ rv_parking: 'Pull thru', avg_retail_daily_rate_2025: '70' }),
      row({ rv_parking: '', avg_retail_daily_rate_2025: '99' }),
    ];
    const { distribution, rateBars, totalRvRows } = aggregateCampspotRowsToRvParkingCharts(rows);
    expect(totalRvRows).toBe(4);
    const back = distribution.find((d) => d.parkingKey === 'back_in')!;
    const pull = distribution.find((d) => d.parkingKey === 'pull_thru')!;
    const nl = distribution.find((d) => d.parkingKey === 'not_listed')!;
    expect(back.n).toBe(2);
    expect(pull.n).toBe(1);
    expect(nl.n).toBe(1);
    expect(rateBars.find((b) => b.parkingKey === 'back_in')!.avgAdr2025).toBe(63);
    expect(rateBars.find((b) => b.parkingKey === 'pull_thru')!.avgAdr2025).toBe(70);
  });

  it('excludes non-RV rows', () => {
    const rows: CampspotRvParkingAggRow[] = [
      row({ unit_type: 'Tent Site', rv_parking: 'Back-in' }),
      row({ unit_type: 'RV Site', rv_parking: 'Back-in' }),
    ];
    const { totalRvRows } = aggregateCampspotRowsToRvParkingCharts(rows);
    expect(totalRvRows).toBe(1);
  });
});
