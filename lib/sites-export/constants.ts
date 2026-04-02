/** Paged fetch size per Supabase request. */
export const SITES_EXPORT_PAGE_SIZE = 1000;

const HARD_CAP = 10_000_000;

function parseSitesExportPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(HARD_CAP, n);
}

/**
 * Max property-level rows scanned per count/export (all sources combined).
 * Override with `SITES_EXPORT_MAX_ROWS_SCANNED` (default raised for large single-source exports).
 */
export function sitesExportMaxRowsScanned(): number {
  return parseSitesExportPositiveIntEnv('SITES_EXPORT_MAX_ROWS_SCANNED', 750_000);
}

/**
 * Max expanded site rows (one row per site for Hipcamp/Campspot/Sage glamping) per request.
 * Override with `SITES_EXPORT_MAX_EXPANDED_ROWS` (default raised; full Campspot often exceeds 500k).
 */
export function sitesExportMaxExpandedRows(): number {
  return parseSitesExportPositiveIntEnv('SITES_EXPORT_MAX_EXPANDED_ROWS', 2_500_000);
}

/**
 * Ref lists larger than this are not written to Redis/memory cache; count still succeeds, export rescans.
 * Override with `SITES_EXPORT_MAX_REFS_TO_CACHE`.
 */
export function sitesExportMaxRefsToCache(): number {
  return parseSitesExportPositiveIntEnv('SITES_EXPORT_MAX_REFS_TO_CACHE', 400_000);
}

/** Hydrate refs in this batch size for streaming export (memory vs round-trips). */
export const SITES_EXPORT_HYDRATE_CHUNK = 400;

/**
 * Use generated `lat_num` / `lon_num` for Hipcamp/Campspot SQL bbox (requires migration
 * `add-hipcamp-campspot-lat-lon-numeric.sql`). Default on; set `SITES_EXPORT_LAT_LON_NUM_GEO=0` if those
 * columns are not deployed yet (export still filters in-app but scans the full table).
 */
export function sitesExportUseLatLonNumericGeo(): boolean {
  return process.env.SITES_EXPORT_LAT_LON_NUM_GEO !== '0';
}

export const SITE_EXPORT_TABLES = [
  'hipcamp',
  'campspot',
  'all_glamping_properties',
  'all_roverpass_data_new',
] as const;

export type SiteExportTable = (typeof SITE_EXPORT_TABLES)[number];

/** DB column names aligned to `SITES_TEMPLATE_HEADERS` indices 0–60 (hipcamp/campspot shape). */
export const HIPCAMPSPOT_TEMPLATE_DB_KEYS: (string | null)[] = [
  'duplicatenote',
  'source',
  'date_added',
  'date_updated',
  'property_name',
  'site_name',
  'unit_type',
  'property_type',
  'property_total_sites',
  'quantity_of_units',
  'unit_capacity',
  'year_site_opened',
  'of_locations',
  'address',
  'city',
  'state',
  'zip_code',
  'country',
  'occupancy_rate_2024',
  'avg_retail_daily_rate_2024',
  'high_rate_2024',
  'low_rate_2024',
  'occupancy_rate_2025',
  'avg_retail_daily_rate_2025',
  'high_rate_2025',
  'low_rate_2025',
  'retail_daily_rate_fees_2025',
  'revpar_2025',
  'high_month_2025',
  'high_avg_occupancy_2025',
  'low_month_2025',
  'low_avg_occupancy_2025',
  'occupancy_rate_2026',
  'retail_daily_rate_ytd',
  'retail_daily_rate_fees_ytd',
  'high_rate_2026',
  'low_rate_2026',
  'revpar_2026',
  'high_month_2026',
  'high_avg_occupancy_2026',
  'low_month_2026',
  'low_avg_occupancy_2026',
  'operating_season_months',
  'operating_season_excel_format',
  'avg_rate_next_12_months',
  'high_rate_next_12_months',
  'low_rate_next_12_months',
  'winter_weekday',
  'winter_weekend',
  'spring_weekday',
  'spring_weekend',
  'summer_weekday',
  'summer_weekend',
  'fall_weekday',
  'fall_weekend',
  'url',
  'description',
  'minimum_nights',
  'getting_there',
  'lon',
  'lat',
];

/** Amenity columns in hipcamp/campspot order → template indices 61.. */
export const HIPCAMPSPOT_AMENITY_DB_KEYS: string[] = [
  'toilet',
  'hot_tub_sauna',
  'pool',
  'pets',
  'water',
  'shower',
  'trash',
  'cooking_equipment',
  'picnic_table',
  'wifi',
  'laundry',
  'campfires',
  'playground',
  'rv_vehicle_length',
  'rv_parking',
  'rv_accommodates_slideout',
  'rv_surface_type',
  'rv_surface_level',
  'rv_vehicles_fifth_wheels',
  'rv_vehicles_class_a_rvs',
  'rv_vehicles_class_b_rvs',
  'rv_vehicles_class_c_rvs',
  'rv_vehicles_toy_hauler',
  'fishing',
  'surfing',
  'horseback_riding',
  'paddling',
  'climbing',
  'off_roading_ohv',
  'boating',
  'swimming',
  'wind_sports',
  'snow_sports',
  'whitewater_paddling',
  'fall_fun',
  'hiking',
  'wildlife_watching',
  'biking',
  'ranch',
  'beach',
  'coastal',
  'suburban',
  'forest',
  'field',
  'wetlands',
  'hot_spring',
  'desert',
  'canyon',
  'waterfall',
  'swimming_hole',
  'lake',
  'cave',
  'redwoods',
  'farm',
  'river_stream_or_creek',
  'mountainous',
  'sage_p_amenity_food_on_site',
  'waterfront',
  'restaurant',
  'dog_park',
  'clubhouse',
  'canoeing_kayaking',
  'alcohol_available',
  'golf_cart_rental',
  'private_bathroom',
  'waterpark',
  'kitchen',
  'patio',
  'electricity',
  'general_store',
  'cable',
  'charcoal_grill',
  'sewer_hook_up',
  'electrical_hook_up',
  'generators_allowed',
  'water_hookup',
];
