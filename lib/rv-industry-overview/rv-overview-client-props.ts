import type { CampspotRvParkingChartsResult } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import type {
  CampspotRvOverviewPageData,
  CampspotRvOverviewSlice,
  RvOverviewScanTransparency,
  RvOverviewSnapshotMeta,
} from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';
import type { CampspotUnitTypeChartsResult } from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';
import type { RvOverviewDataSourceFilterKey } from '@/lib/rv-industry-overview/rv-overview-data-source-filter';
import type { RvOverviewDisplayPreferences } from '@/lib/rv-industry-overview/rv-overview-display-preferences';
import { resolveRvOverviewPayload } from '@/lib/rv-industry-overview/rv-overview-active-payload';
import type { RvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';

/** Props serialized to the RV Industry Overview client (one unit slice, not all three). */
export type RvIndustryOverviewClientProps = {
  unitFilter: RvOverviewUnitFilterKey;
  sourceFilter: RvOverviewDataSourceFilterKey;
  displayPreferences: RvOverviewDisplayPreferences;
  campspotOnlyUnavailable: boolean;
  unitSlice: CampspotRvOverviewSlice;
  /** Always the RV Sites cohort (independent of `unit` query). */
  rvParkingChartsResult: CampspotRvParkingChartsResult;
  unitTypeComparisonResult: CampspotUnitTypeChartsResult;
  rowsScannedTotal: number;
  rowsScannedCampspot: number;
  rowsScannedRoverpass: number;
  scanTransparency?: RvOverviewScanTransparency;
  snapshotMeta: RvOverviewSnapshotMeta;
  nextCacheRevalidateDays: number;
};

export function buildRvIndustryOverviewClientProps(
  pageData: CampspotRvOverviewPageData,
  unitFilter: RvOverviewUnitFilterKey,
  sourceFilter: RvOverviewDataSourceFilterKey,
  displayPreferences: RvOverviewDisplayPreferences,
  snapshotMeta: RvOverviewSnapshotMeta,
  nextCacheRevalidateDays: number
): RvIndustryOverviewClientProps {
  const resolved = resolveRvOverviewPayload(pageData, unitFilter, sourceFilter);
  const rvParkingChartsResult =
    sourceFilter === 'campspot' && pageData.campspotOnly
      ? pageData.campspotOnly.byUnitFilter.rv.rvParkingChartsResult
      : pageData.byUnitFilter.rv.rvParkingChartsResult;

  return {
    unitFilter,
    sourceFilter,
    displayPreferences,
    campspotOnlyUnavailable: resolved.campspotOnlyUnavailable,
    unitSlice: resolved.unitSlice,
    rvParkingChartsResult,
    unitTypeComparisonResult: resolved.unitTypeComparisonResult,
    rowsScannedTotal: resolved.rowsScannedTotal,
    rowsScannedCampspot: resolved.rowsScannedCampspot,
    rowsScannedRoverpass: resolved.rowsScannedRoverpass,
    scanTransparency: resolved.scanTransparency,
    snapshotMeta,
    nextCacheRevalidateDays,
  };
}
