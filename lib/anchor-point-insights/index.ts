/**
 * Anchor Point Insights - main pipeline
 *
 * Orchestrates fetch, transform, aggregate, and response building.
 */

import type { Anchor, NormalizedProperty, PropertyWithProximity } from './types';
import { anchorUsesYearAvgStateRate, type AnchorPointAnchorType } from './anchor-type';
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
  buildDataQuality,
  buildMapData,
  buildSummary,
} from './aggregate';
import { buildEmptyResponse, buildInsightsPayload } from './response-builder';
import {
  filterAnchorsByArea,
  filterPropertiesByArea,
  type ProximityAreaFilter,
} from './area-filter';

export interface ComputeInsightsParams {
  stateFilter: string | null;
  anchorType: AnchorPointAnchorType;
  anchorId: number | null;
  anchorSlug: string | null;
  /** Property type filter: glamping (default), rv, or all */
  propertyTypeFilter?: PropertyTypeFilter;
  /** Custom distance band thresholds (miles), e.g. [10, 25, 50] for 0-10, 10-25, 25-50, 50+ */
  distanceBandThresholds?: number[] | null;
  /** Only include properties (and map anchors) within this circle from a geocoded city/ZIP */
  areaFilter?: ProximityAreaFilter | null;
}

export type { ProximityAreaFilter } from './area-filter';

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
    areaFilter = null,
  } = params;

  const useYearAvgRate = anchorUsesYearAvgStateRate(anchorType);

  let anchors = await fetchAnchors(supabase, anchorType);
  if (anchors.length === 0) {
    return buildEmptyResponse(anchorType);
  }

  const normalized = await fetchAndNormalizeProperties(supabase, stateFilter);
  const hipcampAggregated = aggregateHipcampByPropertyMaxRate(normalized);
  const filtered = filterByPropertyType(hipcampAggregated, propertyTypeFilter);
  const dedupedCoords = deduplicateByCoords(filtered);
  let deduped = deduplicateByNameAndState(dedupedCoords);

  if (areaFilter) {
    deduped = filterPropertiesByArea(deduped, areaFilter);
    anchors = filterAnchorsByArea(anchors, areaFilter);
    if (deduped.length === 0) {
      return buildEmptyResponse(anchorType, areaFilter);
    }
  }
  const withProximity = computeProximity(deduped, anchors, distanceBandThresholds);

  const { proximityForAggregation, selectedAnchor } = applyAnchorFilter(
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
  const filteredForAggregation =
    withinMiThreshold !== 30
      ? proximityForAggregation.filter((p) => p.distance_miles <= withinMiThreshold)
      : proximityForAggregation;

  const countyLookups = await fetchCountyLookups(supabase);

  const byBand = aggregateByBand(proximityForAggregation, distanceBandThresholds);
  const bySource = aggregateBySource(filteredForAggregation);
  const byState = aggregateByState(filteredForAggregation, countyLookups, useYearAvgRate);
  const trends = buildTrends(filteredForAggregation);
  const propertySample = buildPropertySample(filteredForAggregation, countyLookups, withinMiThreshold);
  const { top: anchorsTop, all: anchorsForSelect } = buildAnchorsWithCounts(anchors, withProximity);
  const dataQuality = buildDataQuality(filteredForAggregation, useYearAvgRate);
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
    withinMiThreshold,
    useYearAvgRate
  );

  return buildInsightsPayload({
    anchorType,
    summary,
    byBand,
    bySource,
    byState,
    trends,
    propertySample,
    anchorsTop,
    anchorsForSelect,
    dataQuality,
    mapProperties,
    mapAnchors,
    selectedAnchor,
    areaFilter,
  });
}
