import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import { QUALITY_TIERS, type QualityTier } from '@/lib/comps-v2/types';
import { candidateTotalUnitsOrSites } from '@/lib/comps-v2/candidate-total-units';

/** Interpret stored occupancy as 0–100 % (handles 0–1 decimals). */
export function normalizeOccupancyToPercent(value: number): number {
  if (value > 0 && value <= 1) return value * 100;
  return Math.min(100, Math.max(0, value));
}

function emptyTierCounts(): Record<QualityTier, number> {
  return {
    budget: 0,
    economy: 0,
    mid: 0,
    upscale: 0,
    luxury: 0,
  };
}

/** Linear interpolation quantile on sorted ascending array, q in [0, 1]. */
export function quantileSorted(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (pos - lo) * (sorted[hi]! - sorted[lo]!);
}

function pctOfTotal(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((100 * part) / total);
}

export interface CompsV2SummaryStats {
  totalProperties: number;
  totalSites: number | null;
  avgAdr: number | null;
  medianAdr: number | null;
  adrP25: number | null;
  adrP75: number | null;
  adrLow: number | null;
  adrHigh: number | null;
  avgMarketOccupancyPercent: number | null;
  marketOccupancyCount: number;
  meanDistanceMiles: number | null;
  tierCounts: Record<QualityTier, number>;
  tierUnclassified: number;
  coverageAdrPct: number | null;
  coverageUnitsPct: number | null;
  coverageCoordsPct: number | null;
}

export function computeCompsV2SummaryStats(candidates: CompsV2Candidate[]): CompsV2SummaryStats {
  const totalProperties = candidates.length;
  if (totalProperties === 0) {
    return {
      totalProperties: 0,
      totalSites: null,
      avgAdr: null,
      medianAdr: null,
      adrP25: null,
      adrP75: null,
      adrLow: null,
      adrHigh: null,
      avgMarketOccupancyPercent: null,
      marketOccupancyCount: 0,
      meanDistanceMiles: null,
      tierCounts: emptyTierCounts(),
      tierUnclassified: 0,
      coverageAdrPct: null,
      coverageUnitsPct: null,
      coverageCoordsPct: null,
    };
  }

  let sitesSum = 0;
  let sitesCount = 0;
  for (const c of candidates) {
    const u = candidateTotalUnitsOrSites(c);
    if (u != null && u > 0) {
      sitesSum += u;
      sitesCount += 1;
    }
  }
  const totalSites = sitesCount > 0 ? sitesSum : null;

  const adrs = candidates
    .map((c) => c.avg_retail_daily_rate)
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0);
  const sortedAdrs = [...adrs].sort((a, b) => a - b);
  const avgAdr = adrs.length ? adrs.reduce((a, b) => a + b, 0) / adrs.length : null;
  const medianAdr = quantileSorted(sortedAdrs, 0.5);
  const adrP25 = quantileSorted(sortedAdrs, 0.25);
  const adrP75 = quantileSorted(sortedAdrs, 0.75);
  const adrLow = adrs.length ? Math.min(...adrs) : null;
  const adrHigh = adrs.length ? Math.max(...adrs) : null;

  const distances = candidates
    .map((c) => c.distance_miles)
    .filter((d): d is number => d != null && Number.isFinite(d) && d >= 0);
  const meanDistanceMiles =
    distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : null;

  const tierCounts = emptyTierCounts();
  let tierUnclassified = 0;
  for (const c of candidates) {
    const q = c.adr_quality_tier;
    if (q != null && QUALITY_TIERS.includes(q as QualityTier)) {
      tierCounts[q as QualityTier] += 1;
    } else {
      tierUnclassified += 1;
    }
  }

  let withAdr = 0;
  let withUnits = 0;
  let withCoords = 0;
  for (const c of candidates) {
    if (c.avg_retail_daily_rate != null && Number.isFinite(c.avg_retail_daily_rate) && c.avg_retail_daily_rate > 0) {
      withAdr += 1;
    }
    const u = candidateTotalUnitsOrSites(c);
    if (u != null && u > 0) withUnits += 1;
    if (
      c.geo_lat != null &&
      c.geo_lng != null &&
      Number.isFinite(c.geo_lat) &&
      Number.isFinite(c.geo_lng)
    ) {
      withCoords += 1;
    }
  }

  const occValues: number[] = [];
  for (const c of candidates) {
    const raw = c.market_occupancy_rate;
    if (raw == null || !Number.isFinite(raw)) continue;
    occValues.push(normalizeOccupancyToPercent(raw));
  }
  const marketOccupancyCount = occValues.length;
  const avgMarketOccupancyPercent =
    occValues.length > 0 ? occValues.reduce((a, b) => a + b, 0) / occValues.length : null;

  return {
    totalProperties,
    totalSites,
    avgAdr,
    medianAdr,
    adrP25,
    adrP75,
    adrLow,
    adrHigh,
    avgMarketOccupancyPercent,
    marketOccupancyCount,
    meanDistanceMiles,
    tierCounts,
    tierUnclassified,
    coverageAdrPct: pctOfTotal(withAdr, totalProperties),
    coverageUnitsPct: pctOfTotal(withUnits, totalProperties),
    coverageCoordsPct: pctOfTotal(withCoords, totalProperties),
  };
}
