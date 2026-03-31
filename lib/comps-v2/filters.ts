import type { ComparableProperty } from '@/lib/ai-report-builder/types';
import { qualityScoreToDisplay } from '@/lib/feasibility-utils';
import type { QualityTier } from '@/lib/comps-v2/types';
import { parseNum } from '@/lib/comps-v2/geo';

/** Representative ADR for filtering (avg retail, or seasonal midpoint, or past report high/low mid). */
export function effectiveAdr(c: ComparableProperty): number | null {
  if (c.avg_retail_daily_rate != null && c.avg_retail_daily_rate > 0) {
    return c.avg_retail_daily_rate;
  }
  const sr = c.seasonal_rates;
  const vals = [
    sr.summer_weekday,
    sr.summer_weekend,
    sr.spring_weekday,
    sr.fall_weekday,
  ].filter((v): v is number => v != null && v > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Heuristic ADR tier for market-sourced rows (not past_reports). */
export function adrToQualityTier(adr: number | null): QualityTier | null {
  if (adr == null || adr <= 0) return null;
  if (adr < 85) return 'budget';
  if (adr < 140) return 'economy';
  if (adr < 220) return 'mid';
  if (adr < 350) return 'upscale';
  return 'luxury';
}

/** Map past-report quality score (0–10 or 0–5 stored) to tier via normalized 0–5 display scale. */
export function qualityScoreToTier(score: number | null): QualityTier | null {
  const display = qualityScoreToDisplay(score);
  if (display == null) return null;
  if (display < 2) return 'budget';
  if (display < 2.8) return 'economy';
  if (display < 3.6) return 'mid';
  if (display < 4.3) return 'upscale';
  return 'luxury';
}

export function passesAdrRange(
  c: ComparableProperty,
  minAdr: number | null,
  maxAdr: number | null
): boolean {
  const adr = effectiveAdr(c);
  if (minAdr != null && minAdr > 0) {
    if (adr == null || adr < minAdr) return false;
  }
  if (maxAdr != null && maxAdr > 0) {
    if (adr == null || adr > maxAdr) return false;
  }
  return true;
}

export function passesQualityTiers(
  c: ComparableProperty,
  tiers: QualityTier[] | null | undefined
): boolean {
  if (!tiers || tiers.length === 0) return true;
  let tier: QualityTier | null = null;
  if (c.source_table === 'past_reports') {
    tier = qualityScoreToTier(parseNum(c.quality_score));
  } else {
    tier = adrToQualityTier(effectiveAdr(c));
  }
  if (tier == null) return true;
  return tiers.includes(tier);
}
