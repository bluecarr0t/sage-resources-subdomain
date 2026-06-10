/**
 * Build the Proximity Insights aggregation cohort (same rows as data_quality on the admin page).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { anchorUsesYearAvgStateRate, type AnchorPointAnchorType } from './anchor-type';
import { fetchAnchors } from './fetch-anchors';
import { fetchAndNormalizeProperties } from './fetch-properties';
import { filterByPropertyType, type PropertyTypeFilter } from './property-type-filter';
import {
  aggregateHipcampByPropertyMaxRate,
  deduplicateByCoords,
  deduplicateByNameAndState,
  computeProximity,
  applyAnchorFilter,
  buildDataQuality,
} from './aggregate';
import {
  filterAnchorsByArea,
  filterPropertiesByArea,
  type ProximityAreaFilter,
} from './area-filter';
import type { PropertyWithProximity } from './types';
import type { DataQualityMetrics } from './aggregate';

export interface BuildAggregationCohortParams {
  stateFilter?: string | null;
  anchorType?: AnchorPointAnchorType;
  anchorId?: number | null;
  anchorSlug?: string | null;
  propertyTypeFilter?: PropertyTypeFilter;
  distanceBandThresholds?: number[] | null;
  areaFilter?: ProximityAreaFilter | null;
}

export interface AggregationCohortResult {
  cohort: PropertyWithProximity[];
  dataQuality: DataQualityMetrics;
  useYearAvgRate: boolean;
  withinMiThreshold: number;
  anchorType: AnchorPointAnchorType;
}

export async function buildAggregationCohort(
  supabase: SupabaseClient,
  params: BuildAggregationCohortParams = {}
): Promise<AggregationCohortResult> {
  const {
    stateFilter = null,
    anchorType = 'ski',
    anchorId = null,
    anchorSlug = null,
    propertyTypeFilter = 'glamping',
    distanceBandThresholds = null,
    areaFilter = null,
  } = params;

  const useYearAvgRate = anchorUsesYearAvgStateRate(anchorType);

  let anchors = await fetchAnchors(supabase, anchorType);
  const normalized = await fetchAndNormalizeProperties(supabase, stateFilter);
  const hipcampAggregated = aggregateHipcampByPropertyMaxRate(normalized);
  const filtered = filterByPropertyType(hipcampAggregated, propertyTypeFilter);
  const dedupedCoords = deduplicateByCoords(filtered);
  let deduped = deduplicateByNameAndState(dedupedCoords);

  if (areaFilter) {
    deduped = filterPropertiesByArea(deduped, areaFilter);
    anchors = filterAnchorsByArea(anchors, areaFilter);
  }

  const withProximity = computeProximity(deduped, anchors, distanceBandThresholds);
  const { proximityForAggregation } = applyAnchorFilter(
    withProximity,
    anchors,
    anchorId,
    anchorSlug,
    anchorType
  );

  const withinMiThreshold =
    distanceBandThresholds && distanceBandThresholds.length > 0
      ? Math.max(...distanceBandThresholds)
      : 30;

  const cohort =
    withinMiThreshold !== 30
      ? proximityForAggregation.filter((p) => p.distance_miles <= withinMiThreshold)
      : proximityForAggregation;

  const dataQuality = buildDataQuality(cohort, useYearAvgRate);

  return {
    cohort,
    dataQuality,
    useYearAvgRate,
    withinMiThreshold,
    anchorType,
  };
}
