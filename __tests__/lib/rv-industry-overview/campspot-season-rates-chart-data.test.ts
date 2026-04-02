import {
  aggregateCampspotRowsToSeasonRates,
  type CampspotSeasonRatesAggRow,
} from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';

function row(p: Partial<CampspotSeasonRatesAggRow>): CampspotSeasonRatesAggRow {
  return {
    state: 'TX',
    winter_weekday: null,
    winter_weekend: null,
    spring_weekday: null,
    spring_weekend: null,
    summer_weekday: null,
    summer_weekend: null,
    fall_weekday: null,
    fall_weekend: null,
    ...p,
  };
}

describe('aggregateCampspotRowsToSeasonRates', () => {
  it('averages each seasonal column for in-region rows', () => {
    const rows: CampspotSeasonRatesAggRow[] = [
      row({ winter_weekday: '60', winter_weekend: '70' }),
      row({ winter_weekday: '76', winter_weekend: '70' }),
    ];
    const out = aggregateCampspotRowsToSeasonRates(rows);
    const wd = out.find((r) => r.rateKey === 'winter_weekday')!;
    const we = out.find((r) => r.rateKey === 'winter_weekend')!;
    expect(wd.n).toBe(2);
    expect(wd.avgRate).toBe(68);
    expect(we.n).toBe(2);
    expect(we.avgRate).toBe(70);
  });

  it('skips non-positive and blank values', () => {
    const rows: CampspotSeasonRatesAggRow[] = [
      row({ spring_weekday: '0', spring_weekend: 'no data' }),
      row({ spring_weekday: '80' }),
    ];
    const out = aggregateCampspotRowsToSeasonRates(rows);
    const spw = out.find((r) => r.rateKey === 'spring_weekday')!;
    expect(spw.n).toBe(1);
    expect(spw.avgRate).toBe(80);
  });

  it('skips rows outside RV industry regions', () => {
    const rows: CampspotSeasonRatesAggRow[] = [
      row({ state: 'TX', summer_weekday: '50' }),
      row({ state: 'XX', summer_weekday: '999' }),
    ];
    const out = aggregateCampspotRowsToSeasonRates(rows);
    const su = out.find((r) => r.rateKey === 'summer_weekday')!;
    expect(su.n).toBe(1);
    expect(su.avgRate).toBe(50);
  });
});
