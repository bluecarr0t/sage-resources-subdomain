import { normalizePropertyName } from '@/components/map/utils/propertyProcessing';
import { parseNum } from '@/lib/comps-v2/geo';

export type UniquePropertyNameUnitRow = {
  property_name?: string | null;
  unit_type?: string | null;
  quantity_of_units?: unknown;
  property_total_sites?: unknown;
};

function positiveInt(value: unknown): number {
  const n = parseNum(value);
  if (n == null || n <= 0) return 0;
  return Math.round(n);
}

/**
 * One inventory contribution per unique Property Name (trim + lowercase).
 * Rate-tier duplicate rows of the same unit type keep MAX quantity; mixed unit
 * types are summed. Falls back to MAX `property_total_sites` when no quantities.
 * Rows with a blank property name are omitted.
 */
export function sumUnitsByUniquePropertyName(rows: UniquePropertyNameUnitRow[]): number {
  const byName = new Map<string, { maxSites: number; maxQtyByUnitType: Map<string, number> }>();

  for (const row of rows) {
    const key = normalizePropertyName(row.property_name);
    if (!key) continue;

    let agg = byName.get(key);
    if (!agg) {
      agg = { maxSites: 0, maxQtyByUnitType: new Map() };
      byName.set(key, agg);
    }

    const sites = positiveInt(row.property_total_sites);
    if (sites > agg.maxSites) agg.maxSites = sites;

    const qty = positiveInt(row.quantity_of_units);
    if (qty > 0) {
      const unitType = (row.unit_type ?? '').trim().toLowerCase() || '__unspecified__';
      const prev = agg.maxQtyByUnitType.get(unitType) ?? 0;
      if (qty > prev) agg.maxQtyByUnitType.set(unitType, qty);
    }
  }

  let total = 0;
  for (const agg of byName.values()) {
    let qtySum = 0;
    for (const n of agg.maxQtyByUnitType.values()) qtySum += n;
    total += qtySum > 0 ? qtySum : agg.maxSites;
  }
  return total;
}
