/**
 * Compare-mode deltas between two insights payloads (client-safe).
 */

import type { DataQualityMetrics } from './aggregate';

export interface InsightsSummaryLike {
  total_units: number;
  units_within_x_mi?: number;
  properties_within_30_mi: number;
  anchors_count: number;
  avg_winter_rate: number | null;
  avg_rate?: number | null;
  uses_blended_seasonal_rate?: boolean;
}

export interface CompareDiffRow {
  label: string;
  valueA: string;
  valueB: string;
  delta: string;
  deltaNumeric: number | null;
}

function displayRate(summary: InsightsSummaryLike): number | null {
  if (summary.uses_blended_seasonal_rate) return summary.avg_rate ?? null;
  return summary.avg_winter_rate ?? summary.avg_rate ?? null;
}

function formatNum(n: number | null | undefined, suffix = ''): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toLocaleString()}${suffix}`;
}

function formatRate(n: number | null): string {
  if (n == null) return '—';
  return `$${n}`;
}

function deltaLabel(a: number | null, b: number | null, opts?: { prefix?: string; suffix?: string }): {
  text: string;
  numeric: number | null;
} {
  if (a == null || b == null) return { text: '—', numeric: null };
  const d = b - a;
  const sign = d > 0 ? '+' : '';
  const prefix = opts?.prefix ?? '';
  const suffix = opts?.suffix ?? '';
  return { text: `${sign}${prefix}${d.toLocaleString()}${suffix}`, numeric: d };
}

export function buildCompareDiffRows(
  summaryA: InsightsSummaryLike,
  summaryB: InsightsSummaryLike,
  labels: {
    totalUnits: string;
    unitsWithin: string;
    propertiesWithin: string;
    anchors: string;
    avgRate: string;
  }
): CompareDiffRow[] {
  const rateA = displayRate(summaryA);
  const rateB = displayRate(summaryB);
  const unitsWithinA = summaryA.units_within_x_mi ?? summaryA.properties_within_30_mi;
  const unitsWithinB = summaryB.units_within_x_mi ?? summaryB.properties_within_30_mi;
  const rateDelta = deltaLabel(rateA, rateB, { prefix: '$' });

  return [
    {
      label: labels.totalUnits,
      valueA: formatNum(summaryA.total_units),
      valueB: formatNum(summaryB.total_units),
      delta: deltaLabel(summaryA.total_units, summaryB.total_units).text,
      deltaNumeric: deltaLabel(summaryA.total_units, summaryB.total_units).numeric,
    },
    {
      label: labels.unitsWithin,
      valueA: formatNum(unitsWithinA),
      valueB: formatNum(unitsWithinB),
      delta: deltaLabel(unitsWithinA, unitsWithinB).text,
      deltaNumeric: deltaLabel(unitsWithinA, unitsWithinB).numeric,
    },
    {
      label: labels.propertiesWithin,
      valueA: formatNum(summaryA.properties_within_30_mi),
      valueB: formatNum(summaryB.properties_within_30_mi),
      delta: deltaLabel(summaryA.properties_within_30_mi, summaryB.properties_within_30_mi).text,
      deltaNumeric: deltaLabel(summaryA.properties_within_30_mi, summaryB.properties_within_30_mi)
        .numeric,
    },
    {
      label: labels.anchors,
      valueA: formatNum(summaryA.anchors_count),
      valueB: formatNum(summaryB.anchors_count),
      delta: deltaLabel(summaryA.anchors_count, summaryB.anchors_count).text,
      deltaNumeric: deltaLabel(summaryA.anchors_count, summaryB.anchors_count).numeric,
    },
    {
      label: labels.avgRate,
      valueA: formatRate(rateA),
      valueB: formatRate(rateB),
      delta: rateDelta.text,
      deltaNumeric: rateDelta.numeric,
    },
  ];
}

export type { DataQualityMetrics };
