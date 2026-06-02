import type { GlampingIndustryOverviewPageData, GlampingIndustryOverviewSlice } from '@/lib/glamping-industry-overview/glamping-industry-overview-page-data';
import { RV_OVERVIEW_CHART_ERROR_FALLBACK } from '@/lib/rv-industry-overview/rv-overview-display-error';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';

function sanitizeOptionalError(error: string | null | undefined): string | null {
  if (error == null) return null;
  return sanitizeAdminDisplayError(error, { fallback: RV_OVERVIEW_CHART_ERROR_FALLBACK });
}

function sanitizeSlice(slice: GlampingIndustryOverviewSlice): GlampingIndustryOverviewSlice {
  return {
    ...slice,
    mapResult: {
      ...slice.mapResult,
      error: sanitizeOptionalError(slice.mapResult.error),
    },
    trendsResult: {
      ...slice.trendsResult,
      error: sanitizeOptionalError(slice.trendsResult.error),
    },
    sizeResult: {
      ...slice.sizeResult,
      error: sanitizeOptionalError(slice.sizeResult.error),
    },
    seasonRatesResult: {
      ...slice.seasonRatesResult,
      error: sanitizeOptionalError(slice.seasonRatesResult.error),
    },
    surfaceRatesResult: {
      ...slice.surfaceRatesResult,
      error: sanitizeOptionalError(slice.surfaceRatesResult.error),
    },
    amenityPropsResult: {
      ...slice.amenityPropsResult,
      error: sanitizeOptionalError(slice.amenityPropsResult.error),
    },
    amenityAdrResult: {
      ...slice.amenityAdrResult,
      error: sanitizeOptionalError(slice.amenityAdrResult.error),
    },
    rvParkingChartsResult: {
      ...slice.rvParkingChartsResult,
      error: sanitizeOptionalError(slice.rvParkingChartsResult.error),
    },
  };
}

export function sanitizeGlampingOverviewPageDataPayload(
  payload: GlampingIndustryOverviewPageData
): GlampingIndustryOverviewPageData {
  let hipcampOnly = payload.hipcampOnly;
  if (hipcampOnly) {
    hipcampOnly = {
      ...hipcampOnly,
      slice: sanitizeSlice(hipcampOnly.slice),
    };
  }

  let sageOnly = payload.sageOnly;
  if (sageOnly) {
    sageOnly = {
      ...sageOnly,
      slice: sanitizeSlice(sageOnly.slice),
    };
  }

  return {
    ...payload,
    slice: sanitizeSlice(payload.slice),
    hipcampOnly,
    sageOnly,
  };
}
