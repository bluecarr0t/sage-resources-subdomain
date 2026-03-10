/**
 * Anchor Point Insights - main pipeline
 *
 * Orchestrates fetch, transform, aggregate, and response building.
 */

import type { Anchor, NormalizedProperty, PropertyWithProximity } from './types';
import { fetchAnchors } from './fetch-anchors';
import { fetchAndNormalizeProperties } from './fetch-properties';
import { filterByPropertyType, type PropertyTypeFilter } from './property-type-filter';
import { fetchCountyLookups } from './fetch-county-data';
import {
  aggregateHipcampByPropertyMaxRate,
  deduplicateByCoords,
  deduplicateByNameAndState,
  computeProximity,
  applyAnchorFilter,
  aggregateByBand,
  aggregateBySource,
  aggregateByState,
  buildTrends,
  buildPropertySample,
  buildAnchorsWithCounts,
  buildMapData,
  buildSummary,
} from './aggregate';
import { buildEmptyResponse, buildInsightsPayload } from './response-builder';

export interface ComputeInsightsParams {
  stateFilter: string | null;
  anchorType: 'ski' | 'national-parks';
  anchorId: number | null;
  anchorSlug: string | null;
  /** Property type filter: glamping (default), rv, or all */
  propertyTypeFilter?: PropertyTypeFilter;
  /** Custom distance band thresholds (miles), e.g. [10, 25, 50] for 0-10, 10-25, 25-50, 50+ */
  distanceBandThresholds?: number[] | null;
}

import type { SupabaseClient } from '@supabase/supabase-js';

export async function computeAnchorPointInsights(
  supabase: SupabaseClient,
  params: ComputeInsightsParams
) {
  const {
    stateFilter,
    anchorType,
    anchorId,
    anchorSlug,
    propertyTypeFilter = 'glamping',
    distanceBandThresholds,
  } = params;
  const isNationalParks = anchorType === 'national-parks';

  const anchors = await fetchAnchors(supabase, isNationalParks);
  if (anchors.length === 0) {
    return buildEmptyResponse(isNationalParks);
  }

  const normalized = await fetchAndNormalizeProperties(supabase, stateFilter);
  const hipcampAggregated = aggregateHipcampByPropertyMaxRate(normalized);
  const filtered = filterByPropertyType(hipcampAggregated, propertyTypeFilter);
  const dedupedCoords = deduplicateByCoords(filtered);
  const deduped = deduplicateByNameAndState(dedupedCoords);
  const withProximity = computeProximity(deduped, anchors, distanceBandThresholds);

  const { proximityForAggregation, selectedAnchor } = applyAnchorFilter(
    withProximity,
    anchors,
    anchorId,
    anchorSlug,
    isNationalParks
  );

  const withinMiThreshold =
    distanceBandThresholds && distanceBandThresholds.length > 0
      ? Math.max(...distanceBandThresholds)
      : 30;
  const filteredForAggregation =
    withinMiThreshold !== 30
      ? proximityForAggregation.filter((p) => p.distance_miles <= withinMiThreshold)
      : proximityForAggregation;

  const countyLookups = await fetchCountyLookups(supabase);

  const byBand = aggregateByBand(proximityForAggregation, distanceBandThresholds);
  const bySource = aggregateBySource(filteredForAggregation);
  const byState = aggregateByState(filteredForAggregation, countyLookups, isNationalParks);
  const trends = buildTrends(filteredForAggregation);
  const propertySample = buildPropertySample(filteredForAggregation, countyLookups, withinMiThreshold);
  const anchorsWithPropertyCounts = buildAnchorsWithCounts(anchors, withProximity);
  const { mapProperties, mapAnchors } = buildMapData(
    filteredForAggregation,
    anchors,
    selectedAnchor,
    withinMiThreshold
  );
  const summary = buildSummary(
    filteredForAggregation,
    anchors,
    selectedAnchor,
    countyLookups,
    withinMiThreshold
  );

  return buildInsightsPayload({
    isNationalParks,
    summary,
    byBand,
    bySource,
    byState,
    trends,
    propertySample,
    anchorsWithPropertyCounts,
    mapProperties,
    mapAnchors,
    selectedAnchor,
  });
}
