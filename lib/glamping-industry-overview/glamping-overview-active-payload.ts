import type {
  GlampingIndustryOverviewPageData,
  GlampingIndustryOverviewSlice,
} from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';
import type { GlampingOverviewDataSourceFilterKey } from '@/lib/glamping-industry-overview/glamping-overview-data-source-filter';
import type { RvOverviewScanTransparency } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

export type GlampingOverviewSourceFilterUnavailable = 'hipcamp' | 'sage' | null;

export type GlampingOverviewResolvedPayload = {
  slice: GlampingIndustryOverviewSlice;
  rowsScannedTotal: number;
  rowsScannedHipcamp: number;
  rowsScannedSage: number;
  scanTransparency?: RvOverviewScanTransparency;
  /** Set when analyst picked a single-source filter but the snapshot lacks that pre-fold. */
  sourceFilterUnavailable: GlampingOverviewSourceFilterUnavailable;
};

export function resolveGlampingOverviewPayload(
  pageData: GlampingIndustryOverviewPageData,
  sourceFilter: GlampingOverviewDataSourceFilterKey
): GlampingOverviewResolvedPayload {
  if (sourceFilter === 'hipcamp') {
    const hip = pageData.hipcampOnly;
    if (hip) {
      return {
        slice: hip.slice,
        rowsScannedTotal: hip.rowsScannedTotal,
        rowsScannedHipcamp: hip.rowsScannedTotal,
        rowsScannedSage: 0,
        scanTransparency: hip.scanTransparency,
        sourceFilterUnavailable: null,
      };
    }
  }

  if (sourceFilter === 'sage') {
    const sage = pageData.sageOnly;
    if (sage) {
      return {
        slice: sage.slice,
        rowsScannedTotal: sage.rowsScannedTotal,
        rowsScannedHipcamp: 0,
        rowsScannedSage: sage.rowsScannedTotal,
        scanTransparency: sage.scanTransparency,
        sourceFilterUnavailable: null,
      };
    }
  }

  return {
    slice: pageData.slice,
    rowsScannedTotal: pageData.rowsScannedTotal,
    rowsScannedHipcamp: pageData.rowsScannedHipcamp,
    rowsScannedSage: pageData.rowsScannedSage,
    scanTransparency: pageData.scanTransparency,
    sourceFilterUnavailable:
      sourceFilter === 'hipcamp' ? 'hipcamp' : sourceFilter === 'sage' ? 'sage' : null,
  };
}
