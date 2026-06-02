import {
  glampingOverviewDataSourceQueryValue,
  parseGlampingOverviewDataSourceFilterKey,
} from '@/lib/glamping-industry-overview/glamping-overview-data-source-filter';
import { resolveGlampingOverviewPayload } from '@/lib/glamping-industry-overview/glamping-overview-active-payload';
import type { GlampingIndustryOverviewPageData } from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';

function emptySlice() {
  const err = { rows: [], rowsScanned: 0, error: null };
  return {
    mapResult: { ...err, regional: [], stateAdrChoropleth: [] },
    trendsResult: err,
    sizeResult: err,
    seasonRatesResult: err,
    surfaceRatesResult: err,
    amenityPropsResult: err,
    amenityAdrResult: err,
    rvParkingChartsResult: err,
  };
}

describe('glamping overview data source filter', () => {
  it('parses sage query param', () => {
    expect(parseGlampingOverviewDataSourceFilterKey('sage')).toBe('sage');
    expect(glampingOverviewDataSourceQueryValue('sage')).toBe('sage');
  });

  it('resolves sage-only slice when present', () => {
    const pageData = {
      rowsScannedTotal: 100,
      rowsScannedHipcamp: 60,
      rowsScannedSage: 40,
      slice: emptySlice(),
      sageOnly: {
        rowsScannedTotal: 40,
        slice: emptySlice(),
      },
    } as GlampingIndustryOverviewPageData;

    const resolved = resolveGlampingOverviewPayload(pageData, 'sage');
    expect(resolved.rowsScannedTotal).toBe(40);
    expect(resolved.rowsScannedHipcamp).toBe(0);
    expect(resolved.rowsScannedSage).toBe(40);
    expect(resolved.sourceFilterUnavailable).toBeNull();
    expect(resolved.slice).toBe(pageData.sageOnly!.slice);
  });

  it('flags sage unavailable when snapshot lacks sageOnly', () => {
    const pageData = {
      rowsScannedTotal: 100,
      rowsScannedHipcamp: 60,
      rowsScannedSage: 40,
      slice: emptySlice(),
    } as GlampingIndustryOverviewPageData;

    const resolved = resolveGlampingOverviewPayload(pageData, 'sage');
    expect(resolved.sourceFilterUnavailable).toBe('sage');
    expect(resolved.slice).toBe(pageData.slice);
  });
});
