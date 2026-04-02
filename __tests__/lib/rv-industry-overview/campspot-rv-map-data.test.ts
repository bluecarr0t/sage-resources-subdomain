import {
  STATE_ADR_CHOROPLETH_MIN_N,
  aggregateCampspotRowsToRvMapData,
  type CampspotRvMapAggRow,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';

describe('aggregateCampspotRowsToRvMapData', () => {
  it('computes regional 2025 means from avg_retail_daily_rate_2025 only', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '90',
        retail_daily_rate_ytd: '200',
      },
    ];
    const { byRegion, stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(rows);
    expect(byRegion.west.meanAdr).toBe(100);
    expect(byRegion.west.meanOccupancyPct).toBe(50);
    expect(stateAdrChoropleth.CA).toEqual({ n: 1, meanAdr: 200 });
  });

  it('uses retail_daily_rate_ytd for state-level 2025 ARDR when present', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '90',
        retail_daily_rate_ytd: '120',
      },
    ];
    const { byState, stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(rows);
    expect(byState.CA.meanAdr2025).toBe(120);
    expect(byState.CA.meanOcc2025).toBe(50);
    expect(stateAdrChoropleth.CA).toEqual({ n: 1, meanAdr: 120 });
  });

  it('falls back to avg_retail_daily_rate_2025 for state 2025 ARDR when YTD missing', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'TX',
        avg_retail_daily_rate_2025: '88',
        occupancy_rate_2025: '30',
        occupancy_rate_2024: '25',
        avg_retail_daily_rate_2024: '70',
        retail_daily_rate_ytd: null,
      },
    ];
    const { byState, stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(rows);
    expect(byState.TX.meanAdr2025).toBe(88);
    expect(stateAdrChoropleth.TX).toEqual({ n: 1, meanAdr: 88 });
  });

  it('accumulates state ADR choropleth without occupancy (regional map still excludes row)', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'OR',
        avg_retail_daily_rate_2025: '55',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
        retail_daily_rate_ytd: null,
      },
    ];
    const { byRegion, stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(rows);
    expect(byRegion.west.siteCount).toBe(0);
    expect(stateAdrChoropleth.OR).toEqual({ n: 1, meanAdr: 55 });
  });

  it('state ADR choropleth counts multiple rows for the same state', () => {
    const row: CampspotRvMapAggRow = {
      state: 'WA',
      avg_retail_daily_rate_2025: '60',
      occupancy_rate_2025: null,
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
      retail_daily_rate_ytd: null,
    };
    const { stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(
      Array.from({ length: STATE_ADR_CHOROPLETH_MIN_N }, () => ({ ...row }))
    );
    expect(stateAdrChoropleth.WA?.n).toBe(STATE_ADR_CHOROPLETH_MIN_N);
    expect(stateAdrChoropleth.WA?.meanAdr).toBe(60);
  });

  it('state metrics use a matched cohort only (2025-only rows do not count)', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'NV',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
        retail_daily_rate_ytd: null,
      },
    ];
    const { byState } = aggregateCampspotRowsToRvMapData(rows);
    expect(byState.NV.nMatched).toBe(0);
    expect(byState.NV.meanOcc2024).toBeNull();
    expect(byState.NV.meanOcc2025).toBeNull();
  });

  it('averages state metrics only over rows present in both years', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'AZ',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '80',
        retail_daily_rate_ytd: null,
      },
      {
        state: 'AZ',
        avg_retail_daily_rate_2025: '200',
        occupancy_rate_2025: '60',
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
        retail_daily_rate_ytd: null,
      },
    ];
    const { byState } = aggregateCampspotRowsToRvMapData(rows);
    expect(byState.AZ.nMatched).toBe(1);
    expect(byState.AZ.meanOcc2024).toBe(40);
    expect(byState.AZ.meanOcc2025).toBe(50);
    expect(byState.AZ.meanAdr2024).toBe(80);
    expect(byState.AZ.meanAdr2025).toBe(100);
  });
});
