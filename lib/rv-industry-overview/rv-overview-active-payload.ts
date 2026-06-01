import type {
  CampspotRvOverviewPageData,
  CampspotRvOverviewSlice,
  RvOverviewCampspotOnlyPayload,
} from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';
import type { CampspotUnitTypeChartsResult } from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';
import type { RvOverviewDataSourceFilterKey } from '@/lib/rv-industry-overview/rv-overview-data-source-filter';
import type { RvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';
import type { RvOverviewScanTransparency } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

export type RvOverviewResolvedPayload = {
  unitSlice: CampspotRvOverviewSlice;
  unitTypeComparisonResult: CampspotUnitTypeChartsResult;
  rowsScannedTotal: number;
  rowsScannedCampspot: number;
  rowsScannedRoverpass: number;
  scanTransparency?: RvOverviewScanTransparency;
  /** True when user asked for Campspot-only but snapshot lacks precomputed variant. */
  campspotOnlyUnavailable: boolean;
};

export function resolveRvOverviewPayload(
  pageData: CampspotRvOverviewPageData,
  unitFilter: RvOverviewUnitFilterKey,
  sourceFilter: RvOverviewDataSourceFilterKey
): RvOverviewResolvedPayload {
  if (sourceFilter === 'campspot') {
    const cs: RvOverviewCampspotOnlyPayload | undefined = pageData.campspotOnly;
    if (cs) {
      return {
        unitSlice: cs.byUnitFilter[unitFilter],
        unitTypeComparisonResult: cs.unitTypeComparisonResult,
        rowsScannedTotal: cs.rowsScannedTotal,
        rowsScannedCampspot: cs.rowsScannedTotal,
        rowsScannedRoverpass: 0,
        scanTransparency: cs.scanTransparency,
        campspotOnlyUnavailable: false,
      };
    }
  }

  return {
    unitSlice: pageData.byUnitFilter[unitFilter],
    unitTypeComparisonResult: pageData.unitTypeComparisonResult,
    rowsScannedTotal: pageData.rowsScannedTotal,
    rowsScannedCampspot: pageData.rowsScannedCampspot,
    rowsScannedRoverpass: pageData.rowsScannedRoverpass,
    scanTransparency: pageData.scanTransparency,
    campspotOnlyUnavailable: sourceFilter === 'campspot',
  };
}
