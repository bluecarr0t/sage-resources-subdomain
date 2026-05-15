import { calculateOpportunityScore } from '@/lib/market-report/opportunity-score';

const fullDrivers = {
  nationalParks: { count: 3, top: [], radiusMiles: 100 },
  skiResorts: { count: 5, top: [], radiusMiles: 100 },
  wineries: { count: 20, top: [], radiusMiles: 50 },
  majorOutdoorSites: { count: 4, top: [], radiusMiles: 100 },
  majorAndLargeCities: { count: 5, top: [], radiusMiles: 100 },
};

const emptyDrivers = {
  nationalParks: { count: 0, top: [], radiusMiles: 100 },
  skiResorts: { count: 0, top: [], radiusMiles: 100 },
  wineries: { count: 0, top: [], radiusMiles: 50 },
  majorOutdoorSites: { count: 0, top: [], radiusMiles: 100 },
  majorAndLargeCities: { count: 0, top: [], radiusMiles: 100 },
};

/** `gdp2023` matches `county-gdp.gdp_2023`: thousands of chained dollars (~$5B here). */
const strongCounty = {
  countyName: 'Walworth County, Wisconsin',
  stateAbbr: 'WI',
  population2020: 106478,
  populationChangePct: 4.16,
  gdp2023: 5_000_000,
  gdpGrowthMaaPct: 5.27,
  highConfidence: true,
};

describe('calculateOpportunityScore', () => {
  it('returns 0 with grade F when nothing is available', () => {
    const r = calculateOpportunityScore({
      cohortSize: 0,
      premiumCohortCount: 0,
      demandDrivers: null,
      countyMetrics: null,
    });
    expect(r.score).toBe(0);
    expect(r.grade).toBe('F');
    // All four pillars should be marked unavailable so the denominator collapses to 0.
    expect(r.components.every((c) => !c.available)).toBe(true);
  });

  it('awards a high score (A or B) for a saturated, high-demand market', () => {
    const r = calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 5, // 50% premium → maxes out premium pillar
      demandDrivers: fullDrivers,
      countyMetrics: strongCounty,
    });
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(['A', 'B']).toContain(r.grade);
    expect(r.components.find((c) => c.key === 'demand')?.points).toBe(40);
    expect(r.components.find((c) => c.key === 'premium')?.points).toBe(20);
  });

  it('drops county pillar from denominator when missing (no unfair penalty)', () => {
    const withCounty = calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 5,
      demandDrivers: fullDrivers,
      countyMetrics: strongCounty,
    });
    const withoutCounty = calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 5,
      demandDrivers: fullDrivers,
      countyMetrics: null,
    });
    // Sans county, the denominator drops; the score must stay competitive (>=60), not collapse.
    expect(withoutCounty.score).toBeGreaterThanOrEqual(60);
    // And the economy component must report itself as unavailable.
    expect(withoutCounty.components.find((c) => c.key === 'economy')?.available).toBe(false);
    // With strong county data the score should still beat (or match) the no-county case.
    expect(withCounty.score).toBeGreaterThanOrEqual(withoutCounty.score - 5);
  });

  it('flags a thin market correctly (no drivers, no county, big cohort, no premium)', () => {
    const r = calculateOpportunityScore({
      cohortSize: 50,
      premiumCohortCount: 0,
      demandDrivers: emptyDrivers,
      countyMetrics: null,
    });
    // No drivers + no county + no premium positioning → low score
    expect(r.score).toBeLessThan(40);
    expect(r.grade).toBe('F');
  });

  it('produces a headline that names the strongest pillar', () => {
    const r = calculateOpportunityScore({
      cohortSize: 5,
      premiumCohortCount: 0,
      demandDrivers: fullDrivers,
      countyMetrics: null,
    });
    expect(r.headline).toMatch(/demand|whitespace/i);
  });

  it('every pillar reports a non-empty rationale', () => {
    const r = calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 4,
      demandDrivers: fullDrivers,
      countyMetrics: strongCounty,
    });
    for (const c of r.components) {
      expect(typeof c.detail).toBe('string');
      expect(c.detail.length).toBeGreaterThan(0);
    }
  });

  it('grades scale correctly across thresholds', () => {
    expect(calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 10,
      demandDrivers: fullDrivers,
      countyMetrics: strongCounty,
    }).score).toBeGreaterThanOrEqual(85);
  });

  it('labels county GDP using BEA thousands → $B / $M (not mislabeled billions)', () => {
    const detail = calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 0,
      demandDrivers: null,
      countyMetrics: {
        ...strongCounty,
        gdp2023: 9_940_000,
      },
    }).components.find((c) => c.key === 'economy')?.detail;
    expect(detail).toContain('$9.9B');
  });

  it('uses summed inventory sites for whitespace when totalSites > 0 (lower density vs listings-only)', () => {
    const listingsOnly = calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 0,
      demandDrivers: fullDrivers,
      countyMetrics: null,
    });
    const withSites = calculateOpportunityScore({
      cohortSize: 10,
      totalSites: 200,
      premiumCohortCount: 0,
      demandDrivers: fullDrivers,
      countyMetrics: null,
    });
    const wsListings = listingsOnly.components.find((c) => c.key === 'whitespace')!;
    const wsSites = withSites.components.find((c) => c.key === 'whitespace')!;
    expect(wsSites.points).toBeLessThan(wsListings.points);
    expect(wsSites.detail).toContain('inventory sites');
    expect(wsListings.detail).toContain('distinct listings');
  });

  it('treats totalSites 0 like missing (listings denominator)', () => {
    const a = calculateOpportunityScore({
      cohortSize: 10,
      premiumCohortCount: 0,
      demandDrivers: fullDrivers,
      countyMetrics: null,
    });
    const b = calculateOpportunityScore({
      cohortSize: 10,
      totalSites: 0,
      premiumCohortCount: 0,
      demandDrivers: fullDrivers,
      countyMetrics: null,
    });
    expect(b.components.find((c) => c.key === 'whitespace')?.points).toBe(
      a.components.find((c) => c.key === 'whitespace')?.points,
    );
  });
});
