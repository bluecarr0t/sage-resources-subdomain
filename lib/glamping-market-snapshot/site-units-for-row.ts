/**
 * Site/unit count for one `all_sage_data` row — same rules as
 * `/glamping-market-overview` ({@link fetchGlampingIndustryMetrics}).
 */

export function parseGlampingMarketSnapshotPositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function glampingMarketSnapshotUnitsForRow(row: {
  quantity_of_units?: unknown;
  property_total_sites?: unknown;
}): number {
  const fromUnits = parseGlampingMarketSnapshotPositiveNumber(row.quantity_of_units);
  const fromTotal = parseGlampingMarketSnapshotPositiveNumber(row.property_total_sites);
  const n = fromUnits ?? fromTotal ?? 0;
  return Math.round(n);
}
