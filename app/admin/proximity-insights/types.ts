export type AnchorType = 'ski' | 'national-parks';
export type PropertyTypeFilter = 'glamping' | 'rv' | 'all';
export type Season = 'winter' | 'spring' | 'summer' | 'fall';

export interface InsightsData {
  anchor_type?: AnchorType;
  summary: {
    total_properties: number;
    total_units: number;
    properties_within_30_mi: number;
    units_within_x_mi?: number;
    within_mi_threshold?: number;
    properties_with_winter_rates?: number;
    units_with_winter_rates?: number;
    anchors_count: number;
    avg_winter_rate: number | null;
    data_sources: number;
    avg_state_population_2020?: number | null;
    combined_state_gdp_2023?: number | null;
  };
  by_band: Array<{
    band: string;
    count: number;
    avg_winter_weekday: number | null;
    avg_winter_weekend: number | null;
    avg_spring_weekday?: number | null;
    avg_spring_weekend?: number | null;
    avg_summer_weekday?: number | null;
    avg_summer_weekend?: number | null;
    avg_fall_weekday?: number | null;
    avg_fall_weekend?: number | null;
    avg_occupancy_2024?: number | null;
    avg_occupancy_2025?: number | null;
    avg_occupancy_2026?: number | null;
  }>;
  by_source: Array<{
    source: string;
    count: number;
    units?: number;
    count_with_winter_rates?: number;
    avg_winter_rate: number | null;
  }>;
  by_state: Array<{
    state: string;
    count: number;
    avg_winter_rate: number | null;
    avg_rate?: number | null;
    population_2020?: number | null;
    gdp_2023?: number | null;
  }>;
  trends: Array<{ year: number; avg: number; count: number }> | null;
  property_sample: Array<{
    property_name: string;
    source: string;
    state: string | null;
    distance_miles: number;
    drive_time_hours: number;
    winter_weekday: number | null;
    winter_weekend: number | null;
    nearest_anchor: string;
    state_population_2020?: number | null;
    state_gdp_2023?: number | null;
  }>;
  anchors_with_property_counts: Array<{
    anchor_id?: number;
    anchor_name: string;
    anchor_slug?: string;
    property_count_15_mi: number;
    units_count_15_mi?: number;
  }>;
  map_properties?: Array<{
    lat: number;
    lon: number;
    property_name: string;
    source: string;
    distance_miles: number;
    nearest_anchor: string;
    winter_weekday: number | null;
    winter_weekend: number | null;
  }>;
  map_anchors?: Array<{ id: number; name: string; lat: number; lon: number; slug?: string }>;
  selected_anchor?: { id: number; name: string; lat: number; lon: number; slug?: string };
}
