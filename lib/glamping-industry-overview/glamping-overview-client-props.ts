import type {
  GlampingIndustryOverviewPageData,
  GlampingIndustryOverviewSlice,
  GlampingOverviewSnapshotInventory,
  GlampingOverviewSnapshotMeta,
} from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';
import type { GlampingOverviewDataSourceFilterKey } from '@/lib/glamping-industry-overview/glamping-overview-data-source-filter';
import {
  resolveGlampingOverviewPayload,
  type GlampingOverviewSourceFilterUnavailable,
} from '@/lib/glamping-industry-overview/glamping-overview-active-payload';
import type { RvOverviewDisplayPreferences } from '@/lib/rv-industry-overview/rv-overview-display-preferences';
import type { RvOverviewScanTransparency } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

export type GlampingIndustryOverviewClientProps = {
  sourceFilter: GlampingOverviewDataSourceFilterKey;
  displayPreferences: RvOverviewDisplayPreferences;
  sourceFilterUnavailable: GlampingOverviewSourceFilterUnavailable;
  slice: GlampingIndustryOverviewSlice;
  rowsScannedTotal: number;
  rowsScannedHipcamp: number;
  rowsScannedSage: number;
  scanTransparency?: RvOverviewScanTransparency;
  snapshotMeta: GlampingOverviewSnapshotMeta;
  snapshotInventory?: GlampingOverviewSnapshotInventory;
};

export function buildGlampingIndustryOverviewClientProps(
  pageData: GlampingIndustryOverviewPageData,
  sourceFilter: GlampingOverviewDataSourceFilterKey,
  displayPreferences: RvOverviewDisplayPreferences,
  snapshotMeta: GlampingOverviewSnapshotMeta
): GlampingIndustryOverviewClientProps {
  const resolved = resolveGlampingOverviewPayload(pageData, sourceFilter);

  return {
    sourceFilter,
    displayPreferences,
    sourceFilterUnavailable: resolved.sourceFilterUnavailable,
    slice: resolved.slice,
    rowsScannedTotal: resolved.rowsScannedTotal,
    rowsScannedHipcamp: resolved.rowsScannedHipcamp,
    rowsScannedSage: resolved.rowsScannedSage,
    scanTransparency: resolved.scanTransparency,
    snapshotMeta,
    snapshotInventory: pageData.snapshotInventory,
  };
}
