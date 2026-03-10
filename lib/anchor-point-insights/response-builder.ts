/**
 * Build API response payload for Anchor Point Insights
 */

export function buildEmptyResponse(isNationalParks: boolean) {
  return {
    success: true as const,
    insights: {
      anchor_type: isNationalParks ? 'national-parks' : 'ski',
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
      map_properties: [],
      map_anchors: [],
    },
  };
}

export function buildInsightsPayload(params: {
  isNationalParks: boolean;
  summary: object;
  byBand: object[];
  bySource: object[];
  byState: object[];
  trends: object[] | null;
  propertySample: object[];
  anchorsWithPropertyCounts: object[];
  mapProperties: object[];
  mapAnchors: object[];
  selectedAnchor: { id: number; name: string; lat: number; lon: number; slug?: string } | null;
}) {
  const payload: Record<string, unknown> = {
    anchor_type: params.isNationalParks ? 'national-parks' : 'ski',
    summary: params.summary,
    by_band: params.byBand,
    by_source: params.bySource,
    by_state: params.byState,
    trends: params.trends,
    property_sample: params.propertySample,
    anchors_with_property_counts: params.anchorsWithPropertyCounts,
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
