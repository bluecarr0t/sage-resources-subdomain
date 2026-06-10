/**
 * Build API response payload for Anchor Point Insights
 */

import type { AnchorPointAnchorType } from './anchor-type';
import type { ProximityAreaFilter } from './area-filter';
import type { AnchorWithCount, DataQualityMetrics } from './aggregate';

const EMPTY_DATA_QUALITY: DataQualityMetrics = {
  total_properties: 0,
  total_units: 0,
  properties_with_rate: 0,
  properties_missing_rate: 0,
  properties_missing_unit_fields: 0,
  properties_zero_units: 0,
  by_source: [],
};

export function buildEmptyResponse(
  anchorType: AnchorPointAnchorType,
  areaFilter: ProximityAreaFilter | null = null
) {
  return {
    success: true as const,
    insights: {
      anchor_type: anchorType,
      area_filter: areaFilter
        ? {
            lat: areaFilter.lat,
            lng: areaFilter.lng,
            radius_mi: areaFilter.radiusMi,
            label: areaFilter.label,
          }
        : null,
      summary: {
        total_properties: 0,
        total_units: 0,
        properties_within_30_mi: 0,
        units_within_x_mi: 0,
        within_mi_threshold: 30,
        properties_with_winter_rates: 0,
        units_with_winter_rates: 0,
        anchors_count: 0,
        avg_winter_rate: null,
        avg_rate: null,
        uses_blended_seasonal_rate: anchorType !== 'ski',
        data_sources: 2,
        avg_state_population_2020: null,
        combined_state_gdp_2023: null,
      },
      by_band: [],
      by_source: [],
      by_state: [],
      trends: null,
      property_sample: [],
      anchors_with_property_counts: [],
      anchors_for_select: [],
      data_quality: EMPTY_DATA_QUALITY,
      map_properties: [],
      map_anchors: [],
    },
  };
}

export function buildInsightsPayload(params: {
  anchorType: AnchorPointAnchorType;
  summary: object;
  byBand: object[];
  bySource: object[];
  byState: object[];
  trends: object[] | null;
  propertySample: object[];
  anchorsTop: AnchorWithCount[];
  anchorsForSelect: AnchorWithCount[];
  dataQuality: DataQualityMetrics;
  mapProperties: object[];
  mapAnchors: object[];
  selectedAnchor: { id: number; name: string; lat: number; lon: number; slug?: string } | null;
  areaFilter?: ProximityAreaFilter | null;
}) {
  const payload: Record<string, unknown> = {
    anchor_type: params.anchorType,
    area_filter: params.areaFilter
      ? {
          lat: params.areaFilter.lat,
          lng: params.areaFilter.lng,
          radius_mi: params.areaFilter.radiusMi,
          label: params.areaFilter.label,
        }
      : null,
    summary: params.summary,
    by_band: params.byBand,
    by_source: params.bySource,
    by_state: params.byState,
    trends: params.trends,
    property_sample: params.propertySample,
    anchors_with_property_counts: params.anchorsTop,
    anchors_for_select: params.anchorsForSelect,
    data_quality: params.dataQuality,
    map_properties: params.mapProperties,
    map_anchors: params.mapAnchors,
  };
  if (params.selectedAnchor) {
    payload.selected_anchor = params.selectedAnchor;
  }
  return {
    success: true as const,
    insights: payload,
  };
}
