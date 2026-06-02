import {
  RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
  STATE_ADR_CHOROPLETH_MIN_N,
  aggregateCampspotRowsToRvMapData,
  regionalMapLabelDiagnostics,
  type CampspotRvMapAggRow,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';
import { normalizeRoverpassRowToOverviewWide } from '@/lib/rv-industry-overview/rv-overview-wide-row';

describe('aggregateCampspotRowsToRvMapData', () => {
  it('uses avg_retail_daily_rate_2025 only for regional 2025 ARDR and choropleth (ignores YTD in source)', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '90',
      },
    ];
    const { byRegion, stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(rows);
    expect(byRegion.west.meanAdr).toBe(100);
    expect(byRegion.west.meanOccupancyPct).toBe(50);
    expect(stateAdrChoropleth.CA).toEqual({
      n: 1,
      nUnits: 1,
      nProperties: 0,
      meanAdr: 100,
    });
  });

  it('parses 2025 ARDR with currency and thousands separators (headline columns)', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '$1,250.00',
        occupancy_rate_2025: '55',
        occupancy_rate_2024: '50',
        avg_retail_daily_rate_2024: '90',
      },
    ];
    const { byRegion } = aggregateCampspotRowsToRvMapData(rows);
    expect(byRegion.west.siteCount).toBe(1);
    expect(byRegion.west.meanAdr).toBe(1250);
  });

  it('excludes regional row when avg_retail_daily_rate_2025 is blank (seasonal columns on row are not used)', () => {
    const rows = [
      {
        state: 'MT',
        avg_retail_daily_rate_2025: null,
        occupancy_rate_2025: '45',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '80',
        summer_weekend: '220',
        summer_weekday: '180',
      },
    ] as unknown as CampspotRvMapAggRow[];
    const { byRegion } = aggregateCampspotRowsToRvMapData(rows);
    expect(byRegion.west.siteCount).toBe(0);
  });

  it('matched cohort and choropleth both use avg_retail_daily_rate_2025', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '90',
      },
    ];
    const { byState, stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(rows);
    expect(byState.CA.meanAdr2025).toBe(100);
    expect(byState.CA.meanOcc2025).toBe(50);
    expect(stateAdrChoropleth.CA).toEqual({
      n: 1,
      nUnits: 1,
      nProperties: 0,
      meanAdr: 100,
    });
  });

  it('sums quantity_of_units on state ADR choropleth when unit count mode is quantity_of_units', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'TX',
        property_name: 'Ranch',
        city: 'Austin',
        quantity_of_units: '10',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
      {
        state: 'TX',
        property_name: 'Ranch',
        city: 'Austin',
        quantity_of_units: '5',
        avg_retail_daily_rate_2025: '200',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
    ];
    const { stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(
      rows,
      RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
      'adr_only',
      'quantity_of_units'
    );
    expect(stateAdrChoropleth.TX).toEqual({
      n: 2,
      nUnits: 15,
      nProperties: 1,
      meanAdr: 150,
    });
  });

  it('counts distinct properties and units on state ADR choropleth', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        property_name: 'Alpine',
        city: 'Bend',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
      {
        state: 'CA',
        property_name: 'Alpine',
        city: 'Bend',
        avg_retail_daily_rate_2025: '200',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
      {
        state: 'CA',
        property_name: 'Coastal',
        city: 'SF',
        avg_retail_daily_rate_2025: '300',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
    ];
    const { stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(
      rows,
      RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
      'adr_only'
    );
    expect(stateAdrChoropleth.CA).toEqual({
      n: 3,
      nUnits: 3,
      nProperties: 2,
      meanAdr: 200,
    });
  });

  it('accumulates state ADR choropleth without occupancy (regional map still excludes row)', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'OR',
        avg_retail_daily_rate_2025: '55',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
    ];
    const { byRegion, stateAdrChoropleth } = aggregateCampspotRowsToRvMapData(rows);
    expect(byRegion.west.siteCount).toBe(0);
    expect(stateAdrChoropleth.OR).toEqual({
      n: 1,
      nUnits: 1,
      nProperties: 0,
      meanAdr: 55,
    });
  });

  it('includes regional ARDR label without occupancy when labelMode is adr_only', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'OR',
        avg_retail_daily_rate_2025: '155',
        occupancy_rate_2025: null,
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
    ];
    const { byRegion } = aggregateCampspotRowsToRvMapData(
      rows,
      RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
      'adr_only'
    );
    expect(byRegion.west.siteCount).toBe(1);
    expect(byRegion.west.meanAdr).toBe(155);
    expect(byRegion.west.meanOccupancyPct).toBeNull();
  });

  it('state ADR choropleth counts multiple rows for the same state', () => {
    const row: CampspotRvMapAggRow = {
      state: 'WA',
      avg_retail_daily_rate_2025: '60',
      occupancy_rate_2025: null,
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
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
      },
    ];
    const { byState } = aggregateCampspotRowsToRvMapData(rows);
    expect(byState.NV.nMatched).toBe(0);
    expect(byState.NV.meanOcc2024).toBeNull();
    expect(byState.NV.meanOcc2025).toBeNull();
  });

  it('excludes row from matched cohort when 2025 ARDR column is blank', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'ME',
        avg_retail_daily_rate_2025: null,
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '80',
      },
    ];
    const { byState } = aggregateCampspotRowsToRvMapData(rows);
    expect(byState.ME?.nMatched ?? 0).toBe(0);
  });

  it('excludes regional and matched-cohort rows outside standard occupancy or ARDR bands', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '5',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '80',
      },
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '80',
      },
    ];
    const { byRegion, byState } = aggregateCampspotRowsToRvMapData(rows);
    expect(byRegion.west.siteCount).toBe(1);
    expect(byState.CA.nMatched).toBe(1);
  });

  it('averages state metrics only over rows present in both years', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'AZ',
        avg_retail_daily_rate_2025: '100',
        occupancy_rate_2025: '50',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '80',
      },
      {
        state: 'AZ',
        avg_retail_daily_rate_2025: '200',
        occupancy_rate_2025: '60',
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
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

describe('regionalMapLabelDiagnostics', () => {
  it('includes row when ADR and occupancy are in standard bands', () => {
    const row: CampspotRvMapAggRow = {
      state: 'CA',
      avg_retail_daily_rate_2025: '100',
      occupancy_rate_2025: '50',
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
    };
    expect(regionalMapLabelDiagnostics(row)).toEqual({
      included: true,
      adr2025: 100,
      occ2025: 50,
    });
  });

  it('reports adr_above_standard_maximum_usd when rate exceeds cap', () => {
    const row: CampspotRvMapAggRow = {
      state: 'CA',
      avg_retail_daily_rate_2025: '3500',
      occupancy_rate_2025: '50',
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
    };
    const d = regionalMapLabelDiagnostics(row);
    expect(d).toEqual({
      included: false,
      reason: 'adr_above_standard_maximum_usd',
      adr2025: 3500,
      occ2025: 50,
    });
  });

  it('includes premium glamping ARDR when using Lodging regional rate bands', () => {
    const row: CampspotRvMapAggRow = {
      state: 'CA',
      avg_retail_daily_rate_2025: '3500',
      occupancy_rate_2025: '50',
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
    };
    expect(regionalMapLabelDiagnostics(row, RV_MAP_REGIONAL_RATE_BANDS_GLAMPING)).toEqual({
      included: true,
      adr2025: 3500,
      occ2025: 50,
    });
  });

  it('counts West regional row above $3k only when using glamping regional bands', () => {
    const rows: CampspotRvMapAggRow[] = [
      {
        state: 'CA',
        avg_retail_daily_rate_2025: '4000',
        occupancy_rate_2025: '45',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '90',
      },
    ];
    expect(aggregateCampspotRowsToRvMapData(rows).byRegion.west.siteCount).toBe(0);
    expect(aggregateCampspotRowsToRvMapData(rows, RV_MAP_REGIONAL_RATE_BANDS_GLAMPING).byRegion.west.siteCount).toBe(
      1
    );
  });

  it('reports missing_occupancy when ADR is valid but occupancy absent', () => {
    const row: CampspotRvMapAggRow = {
      state: 'OR',
      avg_retail_daily_rate_2025: '55',
      occupancy_rate_2025: null,
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
    };
    const d = regionalMapLabelDiagnostics(row);
    expect(d).toEqual({
      included: false,
      reason: 'missing_occupancy',
      adr2025: 55,
      occ2025: null,
    });
  });

  it('includes RoverPass rows when occupancy is tagged 2024 but mirrored to 2025', () => {
    const row = normalizeRoverpassRowToOverviewWide({
      state: 'TX',
      unit_type: 'RV Site',
      roverpass_occupancy_rate: 62,
      roverpass_occupancy_year: 2024,
      rate_avg_retail_daily_rate: 95,
    });
    expect(regionalMapLabelDiagnostics(row)).toEqual({
      included: true,
      adr2025: 95,
      occ2025: 62,
    });
  });
});
