import { calculateDistance } from '@/lib/proximity-utils';

export type ProximityPropertyRow = {
  propertyName: string;
  lat: number;
  lon: number;
  openUnits: number;
  /** Unit-weighted mean retail ADR when rated; null if no rates. */
  avgRetailDailyRate: number | null;
};

export type ProximityAnchor = {
  lat: number;
  lon: number;
};

/** Distance-band row for the public proximity band chart. */
export type ProximityDistanceBand = {
  /** Inclusive lower bound (miles). */
  startMiles: number;
  /** Exclusive upper bound (miles), except the last band which is inclusive of max. */
  endMiles: number;
  /** Display label, e.g. "0–25". */
  label: string;
  /** Midpoint of the band (miles). */
  midpointMiles: number;
  /** True when the band’s upper bound is ≤ threshold (matches KPI cut). */
  withinThreshold: boolean;
  /** Open units with coords in this band (rated + unrated). */
  openUnits: number;
  /**
   * Unit-weighted mean ARDR among rated inventory.
   * Null when zero rated properties (may still be `meanRateInconclusive`).
   */
  meanRate: number | null;
  /** True when mean is published from fewer than `minRatedPropertiesPerBand`. */
  meanRateProvisional: boolean;
  /**
   * True when the band has open units but no published retail rates
   * (chart shows a muted placeholder).
   */
  meanRateInconclusive: boolean;
  /** Count of rated properties contributing to meanRate. */
  ratedPropertyCount: number;
};

export type GlampingProximityAnalysis = {
  thresholdMiles: number;
  /**
   * When set, rate impact “beyond” side is capped at this distance
   * (threshold < d ≤ max). Null means all properties beyond threshold.
   */
  rateImpactComparisonMaxMiles: number | null;
  maxChartMiles: number;
  bandWidthMiles: number;
  unitsWithin: number;
  /** Distinct geocoded properties within threshold. */
  propertiesWithin: number;
  /**
   * Share of geocoded properties within threshold (0–100), rounded.
   * Null when there are no geocoded properties.
   */
  propertiesWithinPct: number | null;
  /**
   * How `rateImpact` is signed:
   * - `nearerMinusFarther`: within − beyond (closeness premium; National Parks)
   * - `fartherMinusNearer`: beyond − within (distance premium; airports)
   */
  rateImpactDirection: 'nearerMinusFarther' | 'fartherMinusNearer';
  /**
   * Unit-weighted mean ADR delta per `rateImpactDirection`
   * (null if either side empty).
   */
  rateImpact: number | null;
  withinMeanRate: number | null;
  beyondMeanRate: number | null;
  overallMeanRate: number | null;
  distanceBands: ProximityDistanceBand[];
  /**
   * Suggested left-axis max for band mean rates (nice-rounded).
   * Derived from band means with headroom — not raw property outliers.
   */
  rateAxisMax: number | null;
  propertiesWithCoords: number;
  propertiesWithRates: number;
};

export type BuildProximityAnalysisOptions = {
  thresholdMiles: number;
  /**
   * Cap the rate-impact comparison cohort at this distance (miles).
   * Useful when far luxury inventory would otherwise dominate “beyond”.
   */
  rateImpactComparisonMaxMiles?: number;
  /**
   * Rate-impact sign. Default `fartherMinusNearer` (beyond − within).
   * Use `nearerMinusFarther` for a closeness premium (within − beyond).
   */
  rateImpactDirection?: 'nearerMinusFarther' | 'fartherMinusNearer';
  /** Max distance included in band chart (default 150). */
  maxChartMiles?: number;
  /** Band width in miles (default 25). */
  bandWidthMiles?: number;
  /** Min rated properties required to publish a band mean. */
  minRatedPropertiesPerBand?: number;
};

function nearestAnchorMiles(
  lat: number,
  lon: number,
  anchors: ProximityAnchor[]
): number | null {
  if (anchors.length === 0) return null;
  let min = Infinity;
  for (const a of anchors) {
    const d = calculateDistance(lat, lon, a.lat, a.lon);
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? min : null;
}

function unitWeightedMean(
  rows: { openUnits: number; avgRetailDailyRate: number }[]
): number | null {
  let rateTimesUnits = 0;
  let units = 0;
  for (const r of rows) {
    const w = r.openUnits > 0 ? r.openUnits : 1;
    rateTimesUnits += r.avgRetailDailyRate * w;
    units += w;
  }
  if (units <= 0) return null;
  return rateTimesUnits / units;
}

/** Round up to a clean chart tick ceiling. */
export function niceRateAxisMax(rawMax: number): number {
  if (!(rawMax > 0)) return 100;
  const padded = rawMax * 1.15;
  if (padded <= 100) return Math.ceil(padded / 25) * 25;
  if (padded <= 500) return Math.ceil(padded / 50) * 50;
  if (padded <= 1000) return Math.ceil(padded / 100) * 100;
  return Math.ceil(padded / 250) * 250;
}

function bandLabel(start: number, end: number): string {
  return `${start}–${end}`;
}

/**
 * Nearest-anchor distance → within/beyond KPIs + distance-band series for the
 * glamping market overview National Parks / Transportation sections.
 */
export function buildGlampingProximityAnalysis(
  properties: ProximityPropertyRow[],
  anchors: ProximityAnchor[],
  options: BuildProximityAnalysisOptions
): GlampingProximityAnalysis {
  const thresholdMiles = options.thresholdMiles;
  const rateImpactComparisonMaxMiles =
    options.rateImpactComparisonMaxMiles ?? null;
  const rateImpactDirection = options.rateImpactDirection ?? 'fartherMinusNearer';
  const maxChartMiles = options.maxChartMiles ?? 150;
  const bandWidthMiles = options.bandWidthMiles ?? 25;
  const minRatedPropertiesPerBand = options.minRatedPropertiesPerBand ?? 3;

  const withDistance: Array<
    ProximityPropertyRow & { distanceMiles: number }
  > = [];

  for (const p of properties) {
    const d = nearestAnchorMiles(p.lat, p.lon, anchors);
    if (d == null) continue;
    withDistance.push({ ...p, distanceMiles: d });
  }

  let unitsWithin = 0;
  let propertiesWithin = 0;
  const withinRated: { openUnits: number; avgRetailDailyRate: number }[] = [];
  const beyondRated: { openUnits: number; avgRetailDailyRate: number }[] = [];
  const allRated: { openUnits: number; avgRetailDailyRate: number }[] = [];

  for (const p of withDistance) {
    if (p.distanceMiles <= thresholdMiles) {
      unitsWithin += p.openUnits;
      propertiesWithin += 1;
    }
    if (p.avgRetailDailyRate != null) {
      const rated = {
        openUnits: p.openUnits,
        avgRetailDailyRate: p.avgRetailDailyRate,
      };
      allRated.push(rated);
      if (p.distanceMiles <= thresholdMiles) {
        withinRated.push(rated);
      } else if (
        rateImpactComparisonMaxMiles == null ||
        p.distanceMiles <= rateImpactComparisonMaxMiles
      ) {
        beyondRated.push(rated);
      }
    }
  }

  const withinMean = unitWeightedMean(withinRated);
  const beyondMean = unitWeightedMean(beyondRated);
  const overallMeanRate = unitWeightedMean(allRated);
  const rateImpact =
    withinMean != null && beyondMean != null
      ? Math.round(
          rateImpactDirection === 'nearerMinusFarther'
            ? withinMean - beyondMean
            : beyondMean - withinMean
        )
      : null;

  const inChart = withDistance.filter((p) => p.distanceMiles <= maxChartMiles);

  const distanceBands: ProximityDistanceBand[] = [];
  for (let start = 0; start < maxChartMiles; start += bandWidthMiles) {
    const end = Math.min(start + bandWidthMiles, maxChartMiles);
    const midpointMiles = (start + end) / 2;
    // Last band is inclusive of maxChartMiles; earlier bands are [start, end).
    const isLast = end >= maxChartMiles;
    const inBand = inChart.filter((p) =>
      isLast
        ? p.distanceMiles >= start && p.distanceMiles <= end
        : p.distanceMiles >= start && p.distanceMiles < end
    );

    let openUnits = 0;
    const ratedRows: { openUnits: number; avgRetailDailyRate: number }[] = [];
    for (const p of inBand) {
      openUnits += p.openUnits;
      if (p.avgRetailDailyRate != null && p.avgRetailDailyRate > 0) {
        ratedRows.push({
          openUnits: p.openUnits,
          avgRetailDailyRate: p.avgRetailDailyRate,
        });
      }
    }

    const roundedOpenUnits = Math.round(openUnits);
    let meanRate: number | null = null;
    let meanRateProvisional = false;
    let meanRateInconclusive = false;

    if (ratedRows.length >= minRatedPropertiesPerBand) {
      const mean = unitWeightedMean(ratedRows);
      meanRate = mean != null ? Math.round(mean) : null;
    } else if (ratedRows.length >= 1) {
      const mean = unitWeightedMean(ratedRows);
      meanRate = mean != null ? Math.round(mean) : null;
      meanRateProvisional = meanRate != null;
    } else if (roundedOpenUnits > 0) {
      meanRateInconclusive = true;
    }

    distanceBands.push({
      startMiles: start,
      endMiles: end,
      label: bandLabel(start, end),
      midpointMiles,
      withinThreshold: end <= thresholdMiles,
      openUnits: roundedOpenUnits,
      meanRate,
      meanRateProvisional,
      meanRateInconclusive,
      ratedPropertyCount: ratedRows.length,
    });
  }

  const publishedBandRates = distanceBands
    .map((b) => b.meanRate)
    .filter((r): r is number => r != null && r > 0);
  const rateAxisMax =
    publishedBandRates.length > 0
      ? niceRateAxisMax(Math.max(...publishedBandRates))
      : null;

  return {
    thresholdMiles,
    rateImpactComparisonMaxMiles,
    rateImpactDirection,
    maxChartMiles,
    bandWidthMiles,
    unitsWithin: Math.round(unitsWithin),
    propertiesWithin,
    propertiesWithinPct:
      withDistance.length > 0
        ? Math.round((propertiesWithin / withDistance.length) * 100)
        : null,
    rateImpact,
    withinMeanRate: withinMean != null ? Math.round(withinMean) : null,
    beyondMeanRate: beyondMean != null ? Math.round(beyondMean) : null,
    overallMeanRate: overallMeanRate != null ? Math.round(overallMeanRate) : null,
    distanceBands,
    rateAxisMax,
    propertiesWithCoords: withDistance.length,
    propertiesWithRates: allRated.length,
  };
}
