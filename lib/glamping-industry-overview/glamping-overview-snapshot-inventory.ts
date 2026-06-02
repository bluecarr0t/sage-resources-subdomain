import type { RvOverviewWideRow } from '@/lib/rv-industry-overview/rv-overview-wide-row';

type GlampingInventorySource = 'hipcamp' | 'sage';
import { normalizeState } from '@/lib/anchor-point-insights/utils';

export type GlampingOverviewSnapshotInventory = {
  propertyCount: number;
  unitSiteCount: number;
  unitSiteCountHipcamp: number;
  unitSiteCountSage: number;
};

type InventoryAccum = {
  propertyKeys: Set<string>;
  hipcamp: number;
  sage: number;
};

export function createGlampingOverviewSnapshotInventoryAccum(): InventoryAccum {
  return { propertyKeys: new Set(), hipcamp: 0, sage: 0 };
}

function snapshotPropertyKey(row: RvOverviewWideRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

export function recordGlampingOverviewSnapshotInventoryRow(
  accum: InventoryAccum,
  row: RvOverviewWideRow,
  source: GlampingInventorySource
): void {
  if (source === 'hipcamp') accum.hipcamp += 1;
  else accum.sage += 1;
  const pk = snapshotPropertyKey(row);
  if (pk) accum.propertyKeys.add(pk);
}

export function finalizeGlampingOverviewSnapshotInventory(
  accum: InventoryAccum
): GlampingOverviewSnapshotInventory {
  const unitSiteCount = accum.hipcamp + accum.sage;
  return {
    propertyCount: accum.propertyKeys.size,
    unitSiteCount,
    unitSiteCountHipcamp: accum.hipcamp,
    unitSiteCountSage: accum.sage,
  };
}
