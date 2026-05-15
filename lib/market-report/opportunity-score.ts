import type { CountyMetricsResult } from '@/lib/market-report/county-metrics';
import type { DemandDriversResult } from '@/lib/market-report/demand-drivers';

/**
 * Opportunity Score (0–100) — proxy for how attractive a market is for a
 * high-end glamping development. Composed of four pillars; each pillar's
 * weight drops out of the denominator when its inputs are unavailable so
 * sparse-data markets still get a meaningful number.
 *
 *   1. Demand drivers (40 pts) — natural attractions in the catchment
 *      (national parks, ski, wineries, major outdoor / state-park POIs, nearby major/large cities)
 *   2. Economic strength (25 pts) — county GDP + population growth
 *   3. Premium positioning (20 pts) — how much of the cohort already prices ≥ $300
 *   4. Market white space (15 pts) — demand drivers ÷ competitor density
 */

export interface OpportunityScoreInputs {
  /** Number of distinct listings inside the search radius (see cohort listing identity). */
  cohortSize: number;
  /** Number of cohort rows priced at or above $300/night. */
  premiumCohortCount: number;
  /** Demand drivers fetched from external tables; null when unavailable. */
  demandDrivers: DemandDriversResult | null;
  /** County metrics; null when no high-confidence match. */
  countyMetrics: CountyMetricsResult | null;
}

export type OpportunityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface OpportunityScoreComponent {
  key: 'demand' | 'economy' | 'premium' | 'whitespace';
  label: string;
  /** Earned points for this pillar (0..maxPoints). */
  points: number;
  /** Max points this pillar contributed to the denominator. */
  maxPoints: number;
  /** When false, this pillar's max was excluded from the denominator (insufficient data). */
  available: boolean;
  /** Brief plain-English rationale shown under each pillar in the UI. */
  detail: string;
}

export interface OpportunityScore {
  /** Final score, 0–100 inclusive. */
  score: number;
  grade: OpportunityGrade;
  /** Single-sentence summary used as the hero line in the scorecard. */
  headline: string;
  components: OpportunityScoreComponent[];
}

const MAX_POINTS = {
  demand: 40,
  economy: 25,
  premium: 20,
  whitespace: 15,
} as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function letterFor(score: number): OpportunityGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function scoreDemandPillar(
  drivers: DemandDriversResult | null
): { points: number; available: boolean; detail: string } {
  if (!drivers) {
    return { points: 0, available: false, detail: 'No demand driver data available.' };
  }
  // Sub-weights summing to MAX_POINTS.demand (40):
  //   National parks:       12  (max at 3+ parks; high-visitor parks bump faster)
  //   Ski resorts:           8  (max at 5+ resorts)
  //   Wineries:             12  (max at 20+ wineries)
  //   Major outdoor sites:   8  (state parks / recreation POIs; max at 4+ sites)
  const np = drivers.nationalParks.count;
  const ski = drivers.skiResorts.count;
  const win = drivers.wineries.count;
  const outdoor = drivers.majorOutdoorSites.count;
  const cities = drivers.majorAndLargeCities.count;
  const npPts = clamp(np / 3, 0, 1) * 12;
  const skiPts = clamp(ski / 5, 0, 1) * 8;
  const winPts = clamp(win / 20, 0, 1) * 12;
  const outPts = clamp(outdoor / 4, 0, 1) * 8;
  const points = Math.round(npPts + skiPts + winPts + outPts);
  const detail = `${np} national park${np === 1 ? '' : 's'}, ${ski} ski resort${ski === 1 ? '' : 's'}, ${win} winer${win === 1 ? 'y' : 'ies'}, ${outdoor} major outdoor site${outdoor === 1 ? '' : 's'}, ${cities} major/large cit${cities === 1 ? 'y' : 'ies'} within catchment.`;
  return { points, available: true, detail };
}

function scoreEconomyPillar(
  county: CountyMetricsResult | null
): { points: number; available: boolean; detail: string } {
  if (!county || (county.gdp2023 == null && county.populationChangePct == null)) {
    return { points: 0, available: false, detail: 'County metrics not matched for anchor.' };
  }
  // GDP: 0–15 pts. $1B is the soft anchor (≈ median rural-tourism county). Scale linearly to $5B.
  const gdpPts =
    county.gdp2023 != null ? clamp((Math.log10(county.gdp2023) - 5) / (Math.log10(5_000_000) - 5), 0, 1) * 15 : 0;
  // Population change 2010 → 2020. -5% → 0 pts, +10% → 10 pts.
  const popPts =
    county.populationChangePct != null ? clamp((county.populationChangePct + 5) / 15, 0, 1) * 10 : 0;
  const points = Math.round(gdpPts + popPts);
  const popLabel =
    county.populationChangePct != null ? `${county.populationChangePct.toFixed(1)}% pop. change` : 'pop. change unknown';
  const gdpLabel = county.gdp2023 != null ? `$${(county.gdp2023 / 1000).toFixed(1)}B GDP` : 'GDP unknown';
  return {
    points,
    available: true,
    detail: `${county.countyName}: ${gdpLabel}, ${popLabel} (2010→2020).`,
  };
}

function scorePremiumPillar(
  cohortSize: number,
  premiumCohortCount: number
): { points: number; available: boolean; detail: string } {
  if (cohortSize === 0) {
    return { points: 0, available: false, detail: 'No cohort to evaluate.' };
  }
  const pct = premiumCohortCount / cohortSize;
  // Linear: 0% → 0 pts, 40%+ → 20 pts. Beyond 40% the market is saturated at premium tier.
  const points = Math.round(clamp(pct / 0.4, 0, 1) * MAX_POINTS.premium);
  return {
    points,
    available: true,
    detail: `${premiumCohortCount} of ${cohortSize} (${Math.round(pct * 100)}%) competitors price ≥ $300/night.`,
  };
}

function scoreWhitespacePillar(
  cohortSize: number,
  drivers: DemandDriversResult | null
): { points: number; available: boolean; detail: string } {
  if (!drivers) {
    return { points: 0, available: false, detail: 'No demand driver data to compare against.' };
  }
  const totalDrivers =
    drivers.nationalParks.count +
    drivers.skiResorts.count +
    drivers.wineries.count +
    drivers.majorOutdoorSites.count +
    drivers.majorAndLargeCities.count;
  if (totalDrivers === 0 && cohortSize === 0) {
    return { points: 0, available: false, detail: 'No drivers and no cohort to compare.' };
  }
  // Higher = more demand per competitor = more whitespace. Anchor: 1.0 ratio (parity) → 7.5 pts.
  // 3.0+ ratio (3x more drivers than competitors) → max 15 pts.
  const ratio = (totalDrivers + 1) / (cohortSize + 1);
  const points = Math.round(clamp(ratio / 3, 0, 1) * MAX_POINTS.whitespace);
  return {
    points,
    available: true,
    detail: `${totalDrivers} demand drivers vs ${cohortSize} competitors (ratio ${ratio.toFixed(2)}).`,
  };
}

function buildHeadline(
  score: number,
  grade: OpportunityGrade,
  components: OpportunityScoreComponent[]
): string {
  const pillarLabel: Record<OpportunityScoreComponent['key'], string> = {
    demand: 'Demand drivers',
    economy: 'Economic strength',
    premium: 'Premium positioning',
    whitespace: 'Market whitespace',
  };
  const ranked = [...components]
    .filter((c) => c.available)
    .sort((a, b) => b.points / b.maxPoints - a.points / a.maxPoints);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  if (!strongest) return `${grade} (${score}/100) — limited data, score is best-effort.`;
  if (!weakest || strongest === weakest) {
    return `${grade} (${score}/100) — ${pillarLabel[strongest.key].toLowerCase()} leads the pack.`;
  }
  return `${grade} (${score}/100) — strongest on ${pillarLabel[strongest.key].toLowerCase()}, weakest on ${pillarLabel[weakest.key].toLowerCase()}.`;
}

export function calculateOpportunityScore(inputs: OpportunityScoreInputs): OpportunityScore {
  const demand = scoreDemandPillar(inputs.demandDrivers);
  const economy = scoreEconomyPillar(inputs.countyMetrics);
  const premium = scorePremiumPillar(inputs.cohortSize, inputs.premiumCohortCount);
  const whitespace = scoreWhitespacePillar(inputs.cohortSize, inputs.demandDrivers);

  const componentsRaw: Array<
    OpportunityScoreComponent & { _maxConst: number }
  > = [
    {
      key: 'demand',
      label: 'Demand drivers',
      points: demand.points,
      maxPoints: MAX_POINTS.demand,
      available: demand.available,
      detail: demand.detail,
      _maxConst: MAX_POINTS.demand,
    },
    {
      key: 'economy',
      label: 'Economic strength',
      points: economy.points,
      maxPoints: MAX_POINTS.economy,
      available: economy.available,
      detail: economy.detail,
      _maxConst: MAX_POINTS.economy,
    },
    {
      key: 'premium',
      label: 'Premium positioning',
      points: premium.points,
      maxPoints: MAX_POINTS.premium,
      available: premium.available,
      detail: premium.detail,
      _maxConst: MAX_POINTS.premium,
    },
    {
      key: 'whitespace',
      label: 'Market whitespace',
      points: whitespace.points,
      maxPoints: MAX_POINTS.whitespace,
      available: whitespace.available,
      detail: whitespace.detail,
      _maxConst: MAX_POINTS.whitespace,
    },
  ];

  const earned = componentsRaw.reduce((acc, c) => acc + (c.available ? c.points : 0), 0);
  const denom = componentsRaw.reduce((acc, c) => acc + (c.available ? c._maxConst : 0), 0);
  const score = denom === 0 ? 0 : Math.round((earned / denom) * 100);
  const grade = letterFor(score);

  // Drop the internal _maxConst before exposing.
  const components: OpportunityScoreComponent[] = componentsRaw.map(
    ({ _maxConst, ...rest }) => rest
  );

  return {
    score,
    grade,
    headline: buildHeadline(score, grade, components),
    components,
  };
}
