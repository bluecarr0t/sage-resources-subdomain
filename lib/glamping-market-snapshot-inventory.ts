import { bucketGlampingIsOpenForMetrics } from '@/lib/glamping-is-open';
import { isGlampingMarketSnapshotPropertyType } from '@/lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import { glampingMarketSnapshotUnitsForRow } from '@/lib/glamping-market-snapshot/site-units-for-row';

export type GlampingMarketSnapshotInventoryRow = {
  property_type?: string | null;
  unit_type?: string | null;
  is_open?: string | null;
  quantity_of_units?: unknown;
  property_total_sites?: unknown;
};

/**
 * Same row gate as `/glamping-market-overview` headline units:
 * Glamping `property_type`, not an excluded unit SKU, not cancelled.
 */
export function includeGlampingMarketSnapshotInventoryRow(
  row: GlampingMarketSnapshotInventoryRow
): boolean {
  if (!isGlampingMarketSnapshotPropertyType(row.property_type)) return false;
  if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) return false;
  if (bucketGlampingIsOpenForMetrics(row.is_open) === 'cancelled') return false;
  return true;
}

/** Sum `quantity_of_units` (else `property_total_sites`) for included snapshot rows. */
export function sumGlampingMarketSnapshotInventoryUnits(
  rows: GlampingMarketSnapshotInventoryRow[]
): number {
  let total = 0;
  for (const row of rows) {
    if (!includeGlampingMarketSnapshotInventoryRow(row)) continue;
    total += glampingMarketSnapshotUnitsForRow(row);
  }
  return total;
}
