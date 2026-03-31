import type { ComparableProperty } from '@/lib/ai-report-builder/types';

export const COMPS_V2_PROPERTY_KINDS = [
  'glamping',
  'rv',
  'marina',
  'landscape_hotel',
  'campground',
] as const;

export type CompsV2PropertyKind = (typeof COMPS_V2_PROPERTY_KINDS)[number];

export const QUALITY_TIERS = ['budget', 'economy', 'mid', 'upscale', 'luxury'] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];

export interface CompsV2Candidate extends ComparableProperty {
  stable_id: string;
  property_type?: string | null;
  source_row_id?: string | null;
  /** Heuristic tier from ADR (market rows) or quality_score (past reports) */
  adr_quality_tier?: QualityTier | null;
}

export interface SourceToggles {
  pastReports: boolean;
  all_glamping_properties: boolean;
  hipcamp: boolean;
  all_roverpass_data_new: boolean;
  campspot: boolean;
  /** Tavily + optional Firecrawl gap fill (not Supabase). */
  web_search: boolean;
}

/** All sources off — API merges this with `parseSourceToggles` (opt-in per flag). */
export const ALL_SOURCES_DISABLED: SourceToggles = {
  pastReports: false,
  all_glamping_properties: false,
  hipcamp: false,
  all_roverpass_data_new: false,
  campspot: false,
  web_search: false,
};

/** Default for admin UI: every source enabled until the user toggles. */
export const DEFAULT_SOURCE_TOGGLES: SourceToggles = {
  pastReports: true,
  all_glamping_properties: true,
  hipcamp: true,
  all_roverpass_data_new: true,
  campspot: true,
  web_search: true,
};
