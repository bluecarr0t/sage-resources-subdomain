/**
 * Types for Anchor Point Insights
 */

import type { SeasonClosedFlags } from '@/lib/glamping-seasonal-rate';

export type PropertySource = 'hipcamp' | 'sage_glamping';

export interface NormalizedProperty {
  source: PropertySource;
  /** Primary key from `hipcamp` or `all_sage_data` for the source row. */
  source_row_id: number;
  property_name: string;
  state: string | null;
  lat: number;
  lon: number;
  /** For type filtering: Glamping vs RV vs All */
  property_type?: string | null;
  property_total_sites?: number | null;
  quantity_of_units?: number | null;
  unit_type?: string | null;
  is_glamping_property?: string | null;
  winter_weekday: number | null;
  winter_weekend: number | null;
  spring_weekday: number | null;
  spring_weekend: number | null;
  summer_weekday: number | null;
  summer_weekend: number | null;
  fall_weekday: number | null;
  fall_weekend: number | null;
  /** Explicit `closed` on seasonal cells (Sage rows). */
  season_closed: SeasonClosedFlags;
  occupancy_2024: number | null;
  occupancy_2025: number | null;
  occupancy_2026: number | null;
  avg_rate_2024: number | null;
  avg_rate_2025: number | null;
  avg_rate_2026: number | null;
}

export interface PropertyWithProximity extends NormalizedProperty {
  distance_miles: number;
  distance_band: string;
  drive_time_hours: number;
  nearest_anchor: string;
}

export interface Anchor {
  id: number;
  name: string;
  lat: number;
  lon: number;
  slug?: string;
}

import type { AnchorPointAnchorType } from './anchor-type';

export interface InsightsParams {
  stateFilter: string | null;
  anchorType: AnchorPointAnchorType;
  anchorId: number | null;
  anchorSlug: string | null;
}
