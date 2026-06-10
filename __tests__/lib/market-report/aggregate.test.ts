import type { CohortPropertyRow } from '@/lib/market-report/types';
import {
  buildAmenityAnalysis,
  buildMarketReportSections,
  buildRateAnalysis,
  buildSiteUnitAnalysis,
} from '@/lib/market-report/aggregate';
import { isAffirmative, mean, medianSorted, percentileSorted } from '@/lib/market-report/normalize';

describe('market-report normalize helpers', () => {
  it('isAffirmative handles yes variants', () => {
    expect(isAffirmative('Yes')).toBe(true);
    expect(isAffirmative('no')).toBe(false);
    expect(isAffirmative('')).toBe(false);
  });

  it('mean and medianSorted', () => {
    expect(mean([])).toBeNull();
    expect(mean([2, 4])).toBe(3);
    expect(medianSorted([1, 2, 3])).toBe(2);
    expect(medianSorted([1, 2, 3, 4])).toBe(2.5);
  });

  it('percentileSorted', () => {
    expect(percentileSorted([], 0.5)).toBeNull();
    const s = [10, 20, 30, 40];
    expect(percentileSorted(s, 0.5)).toBe(25);
  });
});

function row(over: Partial<CohortPropertyRow> & Pick<CohortPropertyRow, 'property_name'>): CohortPropertyRow {
  return {
    source: 'all_sage_data',
    sourceId: '1',
    geo_lat: 35.5,
    geo_lng: -97.3,
    city: 'A',
    state: 'TX',
    property_type: 'Resort',
    unit_type: 'Yurt',
    property_total_sites: 10,
    quantity_of_units: null,
    distance_miles: 5,
    rate_avg: 100,
    winter_weekday: null,
    winter_weekend: null,
    spring_weekday: null,
    spring_weekend: null,
    summer_weekday: 200,
    summer_weekend: 220,
    fall_weekday: null,
    fall_weekend: null,
    occupancy: null,
    operating_season_months: null,
    url: null,
    raw: { property_pool: 'Yes', property_laundry: 'No' },
    ...over,
  };
}

describe('buildRateAnalysis', () => {
  it('returns nulls for empty cohort', () => {
    const r = buildRateAnalysis([]);
    expect(r.propertiesWithPrimaryRate).toBe(0);
    expect(r.meanAdr).toBeNull();
  });

  it('computes stats from primary rate', () => {
    const r = buildRateAnalysis([
      row({ property_name: 'a', rate_avg: 100 }),
      row({ property_name: 'b', rate_avg: 200 }),
    ]);
    expect(r.propertiesWithPrimaryRate).toBe(2);
    expect(r.meanAdr).toBe(150);
    expect(r.medianAdr).toBe(150);
  });

  it('summarizes occupancy when present', () => {
    const r = buildRateAnalysis([
      row({ property_name: 'a', occupancy: 60 }),
      row({ property_name: 'b', occupancy: 80 }),
    ]);
    expect(r.occupancySummary?.countWithOccupancy).toBe(2);
    expect(r.occupancySummary?.meanOccupancy).toBe(70);
    expect(r.occupancySummary?.medianOccupancy).toBe(70);
  });
});

describe('buildAmenityAnalysis', () => {
  it('rv segment uses limited mode', () => {
    const r = buildAmenityAnalysis('rv_resort', [row({ property_name: 'x', raw: null })]);
    expect(r.mode).toBe('rv_limited');
    expect(r.amenityRates).toBeUndefined();
  });

  it('glamping aggregates amenity yes share with cohort and known denominators', () => {
    const r = buildAmenityAnalysis('glamping', [
      row({ property_name: 'a', raw: { property_pool: 'Yes', property_laundry: 'No' } }),
      row({ property_name: 'b', raw: { property_pool: 'Yes', property_laundry: 'Yes' } }),
    ]);
    expect(r.mode).toBe('glamping');
    expect(r.cohortSize).toBe(2);
    const pool = r.amenityRates?.find((x) => x.column === 'property_pool');
    expect(pool?.pctOfCohort).toBe(100);
    expect(pool?.pctOfKnown).toBe(100);
    const laundry = r.amenityRates?.find((x) => x.column === 'property_laundry');
    expect(laundry?.pctOfKnown).toBe(50);
    expect(laundry?.pctOfCohort).toBe(50);
  });

  it('amenity cohort size uses distinct listings when one property has multiple unit-type rows', () => {
    const r = buildAmenityAnalysis('glamping', [
      row({
        property_name: 'Same Camp',
        unit_type: 'Yurt',
        raw: { property_pool: 'Yes', property_laundry: 'No' },
      }),
      row({
        property_name: 'Same Camp',
        unit_type: 'Cabin',
        raw: { property_pool: 'Yes', property_laundry: 'Yes' },
      }),
    ]);
    expect(r.cohortSize).toBe(1);
    const laundry = r.amenityRates?.find((x) => x.column === 'property_laundry');
    expect(laundry?.withKnownValue).toBe(1);
    expect(laundry?.yesCount).toBe(1);
    expect(laundry?.pctOfCohort).toBe(100);
    expect(laundry?.pctOfKnown).toBe(100);
  });

  it('omits amenities with 0% Yes among known values', () => {
    const r = buildAmenityAnalysis('glamping', [
      row({ property_name: 'a', raw: { property_pool: 'No', property_laundry: 'Yes' } }),
      row({ property_name: 'b', raw: { property_pool: 'No', property_laundry: 'Yes' } }),
    ]);
    expect(r.amenityRates?.some((x) => x.column === 'property_pool')).toBe(false);
    expect(r.amenityRates?.find((x) => x.column === 'property_laundry')).toBeTruthy();
  });
});

describe('buildSiteUnitAnalysis', () => {
  it('attaches mean, median, min, and max ARDR to each top unit type', () => {
    const r = buildSiteUnitAnalysis('glamping', [
      row({ property_name: 'a', unit_type: 'Yurt', rate_avg: 200 }),
      row({ property_name: 'b', unit_type: 'Yurt', rate_avg: 400 }),
      row({ property_name: 'c', unit_type: 'Cabin', rate_avg: 300 }),
    ]);
    const yurt = r.topUnitTypes.find((u) => u.unit_type === 'Yurt');
    const cabin = r.topUnitTypes.find((u) => u.unit_type === 'Cabin');
    expect(yurt?.count).toBe(2);
    expect(yurt?.meanAdr).toBe(300);
    expect(yurt?.medianAdr).toBe(300);
    expect(yurt?.minAdr).toBe(200);
    expect(yurt?.maxAdr).toBe(400);
    expect(cabin?.count).toBe(1);
    expect(cabin?.meanAdr).toBe(300);
    expect(cabin?.medianAdr).toBe(300);
    expect(cabin?.minAdr).toBe(300);
    expect(cabin?.maxAdr).toBe(300);
  });

  it('excludes Unspecified from top unit types (chart noise)', () => {
    const r = buildSiteUnitAnalysis('glamping', [
      row({ property_name: 'a', unit_type: 'Unspecified', rate_avg: 230 }),
      row({ property_name: 'b', unit_type: 'Yurt', rate_avg: 200 }),
    ]);
    expect(r.topUnitTypes.some((u) => u.unit_type === 'Unspecified')).toBe(false);
    expect(r.topUnitTypes.find((u) => u.unit_type === 'Yurt')?.count).toBe(1);
  });

  it('returns null rates when no priced rows exist for a unit type', () => {
    const r = buildSiteUnitAnalysis('glamping', [
      row({ property_name: 'a', unit_type: 'Tent', rate_avg: null }),
      row({ property_name: 'b', unit_type: 'Tent', rate_avg: 0 }),
    ]);
    const tent = r.topUnitTypes.find((u) => u.unit_type === 'Tent');
    expect(tent?.count).toBe(2);
    expect(tent?.meanAdr).toBeNull();
    expect(tent?.medianAdr).toBeNull();
  });

  it('preserves count ordering (most rows first)', () => {
    const r = buildSiteUnitAnalysis('glamping', [
      row({ property_name: 'a', unit_type: 'Cabin', rate_avg: 250 }),
      row({ property_name: 'b', unit_type: 'Cabin', rate_avg: 250 }),
      row({ property_name: 'c', unit_type: 'Cabin', rate_avg: 250 }),
      row({ property_name: 'd', unit_type: 'Yurt', rate_avg: 500 }),
    ]);
    expect(r.topUnitTypes[0]?.unit_type).toBe('Cabin');
    expect(r.topUnitTypes[1]?.unit_type).toBe('Yurt');
  });

  it('excludes Unknown from site bucket histogram (missing site counts stay out of the grid)', () => {
    const r = buildSiteUnitAnalysis('glamping', [
      row({ property_name: 'a', unit_type: 'Yurt', property_total_sites: null }),
      row({ property_name: 'b', unit_type: 'Yurt', property_total_sites: 5 }),
    ]);
    expect(r.siteBuckets.some((b) => b.label === 'Unknown')).toBe(false);
    expect(r.siteBuckets.find((b) => b.label === '1–25')?.count).toBe(1);
  });

  it('omits Vehicles and RV Site from glamping top unit types but not from RV resort', () => {
    const glamping = buildSiteUnitAnalysis('glamping', [
      row({ property_name: 'a', unit_type: 'Cabin', rate_avg: 100 }),
      row({ property_name: 'b', unit_type: 'Vehicles', rate_avg: null }),
      row({ property_name: 'c', unit_type: 'RV Site', rate_avg: 500 }),
    ]);
    const glTypes = glamping.topUnitTypes.map((u) => u.unit_type);
    expect(glTypes).toContain('Cabin');
    expect(glTypes).not.toContain('Vehicles');
    expect(glTypes).not.toContain('RV Site');

    const rv = buildSiteUnitAnalysis('rv_resort', [
      row({ property_name: 'x', unit_type: 'RV Site', rate_avg: 400 }),
    ]);
    expect(rv.topUnitTypes.some((u) => u.unit_type === 'RV Site')).toBe(true);
  });
});

describe('buildMarketSummary topUnitTypesWithAdr', () => {
  it('excludes Vehicles and RV Site rows from glamping unit-type rollups only', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'a', unit_type: 'Cabin', quantity_of_units: 2, rate_avg: 300 }),
      row({ property_name: 'b', unit_type: 'Vehicles', quantity_of_units: 10, rate_avg: null }),
      row({ property_name: 'c', unit_type: 'RV Site', quantity_of_units: 26, rate_avg: 500 }),
    ]);
    const types = sections.marketSummary.topUnitTypesWithAdr.map((u) => u.unit_type);
    expect(types).toContain('Cabin');
    expect(types).not.toContain('Vehicles');
    expect(types).not.toContain('RV Site');
    const cabin = sections.marketSummary.topUnitTypesWithAdr.find((u) => u.unit_type === 'Cabin');
    expect(cabin?.count).toBe(1);
    expect(cabin?.unitCount).toBe(2);
    expect(cabin?.details).toHaveLength(1);
    expect(cabin?.details?.[0]?.property_name).toBe('a');
    expect(cabin?.details?.[0]?.rate_avg).toBe(300);
  });

  it('passes site_name into top unit type detail rows', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({
        property_name: 'Resort',
        site_name: 'Lakeside Cabin',
        unit_type: 'Cabin',
        quantity_of_units: 1,
        rate_avg: 250,
      }),
    ]);
    const cabin = sections.marketSummary.topUnitTypesWithAdr.find((u) => u.unit_type === 'Cabin');
    expect(cabin?.details?.[0]?.site_name).toBe('Lakeside Cabin');
  });

  it('keeps RV Site in rollups for the RV resort segment', () => {
    const sections = buildMarketReportSections('rv_resort', 50, [
      row({ property_name: 'a', unit_type: 'RV Site', quantity_of_units: 5, rate_avg: 400 }),
    ]);
    expect(sections.marketSummary.topUnitTypesWithAdr.some((u) => u.unit_type === 'RV Site')).toBe(true);
  });

  it('excludes Unspecified from market summary top unit types', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'a', unit_type: 'Unspecified', rate_avg: 215 }),
      row({ property_name: 'b', unit_type: 'Yurt', rate_avg: 200 }),
    ]);
    expect(sections.marketSummary.topUnitTypesWithAdr.some((u) => u.unit_type === 'Unspecified')).toBe(
      false,
    );
    expect(sections.marketSummary.topUnitTypesWithAdr.some((u) => u.unit_type === 'Yurt')).toBe(true);
  });

  it('sums quantity_of_units across rows for each unit type and exposes it as unitCount', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'a', unit_type: 'Yurt', quantity_of_units: 5, rate_avg: 200 }),
      row({ property_name: 'b', unit_type: 'Yurt', quantity_of_units: 3, rate_avg: 400 }),
      row({ property_name: 'c', unit_type: 'Cabin', quantity_of_units: 12, rate_avg: 300 }),
    ]);
    const yurt = sections.marketSummary.topUnitTypesWithAdr.find((r) => r.unit_type === 'Yurt');
    const cabin = sections.marketSummary.topUnitTypesWithAdr.find((r) => r.unit_type === 'Cabin');
    expect(yurt?.count).toBe(2);
    expect(yurt?.unitCount).toBe(8);
    expect(yurt?.details).toHaveLength(2);
    expect(cabin?.count).toBe(1);
    expect(cabin?.unitCount).toBe(12);
    expect(cabin?.details).toHaveLength(1);
  });

  it('returns unitCount=null when no row reports a positive quantity', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'a', unit_type: 'Tent', quantity_of_units: null, rate_avg: 100 }),
      row({ property_name: 'b', unit_type: 'Tent', quantity_of_units: 0, rate_avg: 100 }),
    ]);
    const tent = sections.marketSummary.topUnitTypesWithAdr.find((r) => r.unit_type === 'Tent');
    expect(tent?.count).toBe(2);
    expect(tent?.unitCount).toBeNull();
  });

  it('skips rows with null quantity but still counts rows with a positive quantity', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'a', unit_type: 'Dome', quantity_of_units: 4, rate_avg: 350 }),
      row({ property_name: 'b', unit_type: 'Dome', quantity_of_units: null, rate_avg: 350 }),
    ]);
    const dome = sections.marketSummary.topUnitTypesWithAdr.find((r) => r.unit_type === 'Dome');
    expect(dome?.count).toBe(2);
    expect(dome?.unitCount).toBe(4);
  });
});

describe('buildMarketReportSections', () => {
  it('wires radius into market summary', () => {
    const sections = buildMarketReportSections('glamping', 42, [row({ property_name: 'only' })]);
    expect(sections.marketSummary.radiusMiles).toBe(42);
    expect(sections.marketSummary.inventoryRowCount).toBe(1);
    expect(sections.marketSummary.distinctListingCount).toBe(1);
  });

  it('counts inventory rows separately from distinct listings for the same property', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'Same Lodge', unit_type: 'Yurt' }),
      row({ property_name: 'Same Lodge', unit_type: 'Cabin' }),
    ]);
    expect(sections.marketSummary.inventoryRowCount).toBe(2);
    expect(sections.marketSummary.distinctListingCount).toBe(1);
  });

  it('labels source counts for display', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'a' }),
      row({ property_name: 'b', source: 'campspot', raw: null }),
    ]);
    const sage = sections.marketSummary.sourceCounts.find((s) => s.source === 'all_sage_data');
    const camp = sections.marketSummary.sourceCounts.find((s) => s.source === 'campspot');
    expect(sage?.sourceLabel).toBe('Sage');
    expect(camp?.sourceLabel).toBe('Campspot');
    expect(sections.propertyAnalysis.sample[0]?.sourceLabel).toBe('Sage');
  });

  it('builds per-source breakdown with sites, ADR, and occupancy', () => {
    const sections = buildMarketReportSections('glamping', 50, [
      row({ property_name: 'a', rate_avg: 100, occupancy: 50, property_total_sites: 10 }),
      row({ property_name: 'b', source: 'all_roverpass_data_new', raw: null, rate_avg: 200, occupancy: 70, quantity_of_units: 5 }),
    ]);
    const bd = sections.marketSummary.sourceBreakdown;
    expect(bd).toHaveLength(2);
    const sage = bd.find((r) => r.source === 'all_sage_data');
    const rp = bd.find((r) => r.source === 'all_roverpass_data_new');
    expect(sage?.inventoryRowCount).toBe(1);
    expect(sage?.distinctListingCount).toBe(1);
    expect(sage?.totalSites).toBe(10);
    expect(sage?.avgRetailDailyRate).toBe(100);
    expect(sage?.avgOccupancy).toBe(50);
    expect(rp?.inventoryRowCount).toBe(1);
    expect(rp?.distinctListingCount).toBe(1);
    expect(rp?.totalUnits).toBe(5);
    expect(rp?.avgRetailDailyRate).toBe(200);
    expect(rp?.avgOccupancy).toBe(70);
  });
});
