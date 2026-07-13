import type { GlampingTopUnitTypeRow } from '@/lib/fetch-glamping-industry-metrics';

/** Minimum open-unit weight to appear on the Unit Type by Rate chart. */
export const UNIT_TYPE_BY_RATE_MIN_UNITS = 15;

/** Always omitted from the chart, even when above the min-unit floor. */
export const UNIT_TYPE_BY_RATE_HIDDEN_LABELS = new Set([
  'Cottage',
  'Cave House',
  'Lodge',
  'Canvas Cabin',
]);

/**
 * Shown when below the min-unit floor; count label/tooltip render as "< 15".
 * Bar height still uses the real open-unit weight.
 */
export const UNIT_TYPE_BY_RATE_LOW_COUNT_EXCEPTION = 'Mirror Cabin';

/**
 * Display rules for `/glamping-market-overview` Unit Type by Rate:
 * - hide types with openUnits &lt; 15 (except Mirror Cabin)
 * - always hide Cottage, Cave House, Lodge, and Canvas Cabin
 * - ARDR excludes all_inclusive via {@link isComparableMarketArdrRateBasis}
 */
export function filterUnitTypesForRateChart(
  rows: GlampingTopUnitTypeRow[]
): GlampingTopUnitTypeRow[] {
  return rows.filter((r) => {
    const openUnits = Number(r.openUnits);
    if (!Number.isFinite(openUnits) || openUnits <= 0) return false;
    if (UNIT_TYPE_BY_RATE_HIDDEN_LABELS.has(r.label)) return false;
    if (openUnits >= UNIT_TYPE_BY_RATE_MIN_UNITS) return true;
    return r.label === UNIT_TYPE_BY_RATE_LOW_COUNT_EXCEPTION;
  });
}

/** Chart / glossary order: rate ascending; types without a published rate last. */
export function sortUnitTypesForRateChart(
  rows: GlampingTopUnitTypeRow[]
): GlampingTopUnitTypeRow[] {
  return [...rows].sort((a, b) => {
    const aRate = a.avgRetailDailyRateMean;
    const bRate = b.avgRetailDailyRateMean;
    if (aRate == null && bRate == null) return a.label.localeCompare(b.label);
    if (aRate == null) return 1;
    if (bRate == null) return -1;
    return aRate - bRate;
  });
}

/** Labels for types shown on the chart, in chart left-to-right order. */
export function unitTypeLabelsForRateChart(rows: GlampingTopUnitTypeRow[]): string[] {
  return sortUnitTypesForRateChart(filterUnitTypesForRateChart(rows)).map((r) => r.label);
}

export function unitTypeRateChartCountLabel(row: GlampingTopUnitTypeRow): string {
  const openUnits = Number(row.openUnits);
  if (
    row.label === UNIT_TYPE_BY_RATE_LOW_COUNT_EXCEPTION &&
    Number.isFinite(openUnits) &&
    openUnits < UNIT_TYPE_BY_RATE_MIN_UNITS
  ) {
    return '< 15';
  }
  return openUnits.toLocaleString('en-US');
}
