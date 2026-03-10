/**
 * Export raw property data for Anchor Point Insights (full dataset export)
 *
 * Reuses fetch, proximity, and anchor filter; returns paginated raw rows.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PropertyWithProximity } from './types';
import { fetchAnchors } from './fetch-anchors';
import { fetchAndNormalizeProperties } from './fetch-properties';
import {
  aggregateHipcampByPropertyMaxRate,
  deduplicateByCoords,
  deduplicateByNameAndState,
  computeProximity,
  applyAnchorFilter,
} from './aggregate';
import { filterByPropertyType, type PropertyTypeFilter } from './property-type-filter';

export interface ExportAnchorPointInsightsParams {
  stateFilter: string | null;
  anchorType: 'ski' | 'national-parks';
  anchorId: number | null;
  anchorSlug: string | null;
  propertyTypeFilter?: PropertyTypeFilter;
  distanceBandThresholds?: number[] | null;
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 10000;

export interface ExportAnchorPointInsightsResult {
  rows: PropertyWithProximity[];
  total_count: number;
  has_more: boolean;
  page: number;
  limit: number;
}

export async function exportAnchorPointInsightsRaw(
  supabase: SupabaseClient,
  params: ExportAnchorPointInsightsParams
): Promise<ExportAnchorPointInsightsResult> {
  const {
    stateFilter,
    anchorType,
    anchorId,
    anchorSlug,
    propertyTypeFilter = 'glamping',
    distanceBandThresholds,
    page = DEFAULT_PAGE,
    limit = Math.min(DEFAULT_LIMIT, MAX_LIMIT),
  } = params;

  const isNationalParks = anchorType === 'national-parks';

  const anchors = await fetchAnchors(supabase, isNationalParks);
  if (anchors.length === 0) {
    return { rows: [], total_count: 0, has_more: false, page, limit };
  }

  const normalized = await fetchAndNormalizeProperties(supabase, stateFilter);
  const hipcampAggregated = aggregateHipcampByPropertyMaxRate(normalized);
  const filtered = filterByPropertyType(hipcampAggregated, propertyTypeFilter);
  const dedupedCoords = deduplicateByCoords(filtered);
  const deduped = deduplicateByNameAndState(dedupedCoords);
  const withProximity = computeProximity(deduped, anchors, distanceBandThresholds);

  const { proximityForAggregation } = applyAnchorFilter(
    withProximity,
    anchors,
    anchorId,
    anchorSlug,
    isNationalParks
  );

  // When custom bands are used, filter to within max threshold (matches main insights pipeline)
  const withinMiThreshold =
    distanceBandThresholds && distanceBandThresholds.length > 0
      ? Math.max(...distanceBandThresholds)
      : 30;
  const filteredForExport =
    withinMiThreshold !== 30
      ? proximityForAggregation.filter((p) => p.distance_miles <= withinMiThreshold)
      : proximityForAggregation;

  const totalCount = filteredForExport.length;
  const offset = (page - 1) * limit;
  const rows = filteredForExport.slice(offset, offset + limit);
  const hasMore = offset + rows.length < totalCount;

  return {
    rows,
    total_count: totalCount,
    has_more: hasMore,
    page,
    limit,
  };
}
