/**
 * Sanitize stored error strings when loading RV overview snapshot JSON from Postgres.
 * UI also sanitizes on render; this keeps cached payloads safe if written before redaction rules existed.
 */

import type { CampspotRvOverviewPageData, CampspotRvOverviewSlice } from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';
import { RV_OVERVIEW_CHART_ERROR_FALLBACK } from '@/lib/rv-industry-overview/rv-overview-display-error';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';

function sanitizeOptionalError(error: string | null | undefined): string | null {
  if (error == null) return null;
  return sanitizeAdminDisplayError(error, { fallback: RV_OVERVIEW_CHART_ERROR_FALLBACK });
}

function sanitizeSlice(slice: CampspotRvOverviewSlice): CampspotRvOverviewSlice {
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

export function sanitizeRvOverviewPageDataPayload(
  payload: CampspotRvOverviewPageData
): CampspotRvOverviewPageData {
  const byUnitFilter = {} as CampspotRvOverviewPageData['byUnitFilter'];
  for (const [key, slice] of Object.entries(payload.byUnitFilter)) {
    byUnitFilter[key as keyof typeof byUnitFilter] = sanitizeSlice(slice);
  }

  const unitTypeComparisonResult = {
    ...payload.unitTypeComparisonResult,
    error: sanitizeOptionalError(payload.unitTypeComparisonResult.error),
  };

  let campspotOnly = payload.campspotOnly;
  if (campspotOnly) {
    const csByFilter = {} as typeof campspotOnly.byUnitFilter;
    for (const [key, slice] of Object.entries(campspotOnly.byUnitFilter)) {
      csByFilter[key as keyof typeof csByFilter] = sanitizeSlice(slice);
    }
    campspotOnly = {
      ...campspotOnly,
      unitTypeComparisonResult: {
        ...campspotOnly.unitTypeComparisonResult,
        error: sanitizeOptionalError(campspotOnly.unitTypeComparisonResult.error),
      },
      byUnitFilter: csByFilter,
    };
  }

  return {
    ...payload,
    byUnitFilter,
    unitTypeComparisonResult,
    campspotOnly,
  };
}
