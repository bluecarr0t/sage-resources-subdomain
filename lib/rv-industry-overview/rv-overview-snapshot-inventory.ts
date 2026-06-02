import type { RvOverviewDataSource } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';
import type { RvOverviewWideRow } from '@/lib/rv-industry-overview/rv-overview-wide-row';
import { normalizeState } from '@/lib/anchor-point-insights/utils';

export type RvOverviewSnapshotInventory = {
  propertyCount: number;
  unitSiteCount: number;
  unitSiteCountCampspot: number;
  unitSiteCountRoverpass: number;
};

type InventoryAccum = {
  propertyKeys: Set<string>;
  campspot: number;
  roverpass: number;
};

export function createRvOverviewSnapshotInventoryAccum(): InventoryAccum {
  return { propertyKeys: new Set(), campspot: 0, roverpass: 0 };
}

function snapshotPropertyKey(row: RvOverviewWideRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

/** Count every scanned inventory row (one row ≈ one site/unit line in source tables). */
export function recordRvOverviewSnapshotInventoryRow(
  accum: InventoryAccum,
  row: RvOverviewWideRow,
  source: RvOverviewDataSource
): void {
  if (source === 'campspot') accum.campspot += 1;
  else accum.roverpass += 1;
  const pk = snapshotPropertyKey(row);
  if (pk) accum.propertyKeys.add(pk);
}

export function finalizeRvOverviewSnapshotInventory(
  accum: InventoryAccum
): RvOverviewSnapshotInventory {
  const unitSiteCount = accum.campspot + accum.roverpass;
  return {
    propertyCount: accum.propertyKeys.size,
    unitSiteCount,
    unitSiteCountCampspot: accum.campspot,
    unitSiteCountRoverpass: accum.roverpass,
  };
}
