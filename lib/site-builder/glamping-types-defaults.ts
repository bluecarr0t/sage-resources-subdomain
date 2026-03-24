/**
 * Canonical Site Builder glamping unit types (seed + API fallback).
 * The admin UI loads types from Supabase; rows missing after migrations get merged from here
 * so options like House Boat still appear.
 */

export interface SiteBuilderGlampingTypeSeedRow {
  slug: string;
  name: string;
  default_sqft: number | null;
  default_diameter_ft: number | null;
  cce_occupancy_code: number | null;
  default_quality_type: string;
}

/** Alphabetical by name (matches seed script ordering intent). */
export const SITE_BUILDER_GLAMPING_TYPE_SEED_ROWS: SiteBuilderGlampingTypeSeedRow[] = [
  { slug: 'a-frame', name: 'A-Frame', default_sqft: 350, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Premium' },
  { slug: 'airstream', name: 'Airstream', default_sqft: 200, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Luxury' },
  { slug: 'bell-tent', name: 'Bell Tent', default_sqft: 200, default_diameter_ft: 16, cce_occupancy_code: null, default_quality_type: 'Premium' },
  { slug: 'cabin', name: 'Cabin', default_sqft: 500, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Luxury' },
  { slug: 'canvas-tent', name: 'Canvas Tent', default_sqft: 250, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Premium' },
  { slug: 'dome', name: 'Dome', default_sqft: 700, default_diameter_ft: 30, cce_occupancy_code: null, default_quality_type: 'Ultra Luxury' },
  { slug: 'house-boat', name: 'House Boat', default_sqft: 450, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Luxury' },
  { slug: 'mirror-cabin', name: 'Mirror Cabin', default_sqft: 450, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Ultra Luxury' },
  { slug: 'pod', name: 'Pod', default_sqft: 300, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Luxury' },
  { slug: 'safari-tent', name: 'Safari Tent', default_sqft: 400, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Premium' },
  { slug: 'tiny-home', name: 'Tiny Home', default_sqft: 400, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Luxury' },
  { slug: 'treehouse', name: 'Treehouse', default_sqft: 450, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Luxury' },
  { slug: 'vintage-trailer', name: 'Vintage Trailer', default_sqft: 200, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Premium' },
  { slug: 'wagon', name: 'Wagon', default_sqft: 300, default_diameter_ft: null, cce_occupancy_code: null, default_quality_type: 'Premium' },
  { slug: 'yurt', name: 'Yurt', default_sqft: 350, default_diameter_ft: 20, cce_occupancy_code: null, default_quality_type: 'Luxury' },
];
