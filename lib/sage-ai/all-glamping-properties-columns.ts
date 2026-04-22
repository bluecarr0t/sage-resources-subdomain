/**
 * Column inventory for public.all_glamping_properties (Sage v4+ schema).
 * Keep aligned with lib/types/sage.ts and real Postgres — query tools use this
 * to validate selects, filters, and RPC allowlists.
 */

/** All queryable / selectable columns in document order. */
export const ALL_GLAMPING_PROPERTY_COLUMNS = [
  'id',
  'research_status',
  'is_glamping_property',
  'is_closed',
  'property_name',
  'site_name',
  'slug',
  'property_type',
  'source',
  'discovery_source',
  'date_added',
  'date_updated',
  'address',
  'city',
  'state',
  'zip_code',
  'country',
  'lat',
  'lon',
  'property_total_sites',
  'quantity_of_units',
  'year_site_opened',
  'operating_season_months',
  'number_of_locations',
  'unit_type',
  'unit_capacity',
  'unit_sq_ft',
  'unit_description',
  'unit_bed',
  'unit_shower',
  'unit_water',
  'unit_electricity',
  'unit_picnic_table',
  'unit_wifi',
  'unit_pets',
  'unit_private_bathroom',
  'unit_full_kitchen',
  'unit_kitchenette',
  'unit_ada_accessibility',
  'unit_patio',
  'unit_air_conditioning',
  'unit_gas_fireplace',
  'unit_hot_tub_or_sauna',
  'unit_hot_tub',
  'unit_sauna',
  'unit_cable',
  'unit_campfires',
  'unit_charcoal_grill',
  'unit_mini_fridge',
  'unit_bathtub',
  'unit_wood_burning_stove',
  'rate_unit_rates_by_year',
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
  'rate_category',
  'property_laundry',
  'property_playground',
  'property_pool',
  'property_food_on_site',
  'property_sauna',
  'property_hot_tub',
  'property_restaurant',
  'property_dog_park',
  'property_clubhouse',
  'property_alcohol_available',
  'property_golf_cart_rental',
  'property_waterpark',
  'property_general_store',
  'property_waterfront',
  'property_extended_stay',
  'property_family_friendly',
  'property_remote_work_friendly',
  'property_fitness_room',
  'property_propane_refilling_station',
  'property_pickball_courts',
  'property_age_restricted_55_plus',
  'property_has_rentals',
  'property_lgbtiq_friendly',
  'property_gasoline_nearby',
  'property_basketball',
  'property_volleyball',
  'property_jet_skiing',
  'property_mobile_home_community',
  'property_tennis',
  'url',
  'phone_number',
  'description',
  'minimum_nights',
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
  'rv_sewer_hook_up',
  'rv_electrical_hook_up',
  'rv_generators_allowed',
  'rv_water_hookup',
  'activities_fishing',
  'activities_surfing',
  'activities_horseback_riding',
  'activities_paddling',
  'activities_climbing',
  'activities_off_roading_ohv',
  'activities_boating',
  'activities_swimming',
  'activities_wind_sports',
  'activities_snow_sports',
  'activities_whitewater_paddling',
  'activities_fall_fun',
  'activities_hiking',
  'activities_wildlife_watching',
  'activities_biking',
  'activities_canoeing_kayaking',
  'activities_hunting',
  'activities_golf',
  'activities_backpacking',
  'activities_historic_sightseeing',
  'activities_scenic_drives',
  'activities_stargazing',
  'setting_ranch',
  'setting_beach',
  'setting_coastal',
  'setting_suburban',
  'setting_forest',
  'setting_field',
  'setting_wetlands',
  'setting_hot_spring',
  'setting_desert',
  'setting_canyon',
  'setting_waterfall',
  'setting_swimming_hole',
  'setting_lake',
  'setting_cave',
  'setting_redwoods',
  'setting_farm',
  'river_stream_or_creek',
  'setting_mountainous',
  'quality_score',
  'created_at',
  'updated_at',
  'roverpass_campground_id',
  'roverpass_occupancy_rate',
  'roverpass_occupancy_year',
  'amenities_raw',
  'activities_raw',
  'lifestyle_raw',
] as const;

const ALL_SET = new Set<string>(ALL_GLAMPING_PROPERTY_COLUMNS);

const EQ_FILTER_EXCLUDE = new Set<string>([
  'description',
  'unit_description',
  'rate_unit_rates_by_year',
  'amenities_raw',
  'activities_raw',
  'lifestyle_raw',
]);

const GROUP_BY_EXCLUDE = new Set<string>([
  ...EQ_FILTER_EXCLUDE,
  'address',
  'property_name',
  'site_name',
  'slug',
  'url',
  'phone_number',
  'id',
  'date_added',
  'date_updated',
  'created_at',
  'updated_at',
  'roverpass_campground_id',
]);

const DISTINCT_EXCLUDE = new Set<string>([...EQ_FILTER_EXCLUDE, 'id']);

export function isKnownGlampingColumn(name: string): boolean {
  return ALL_SET.has(name);
}

export function isGlampingEqFilterColumn(name: string): boolean {
  return isKnownGlampingColumn(name) && !EQ_FILTER_EXCLUDE.has(name);
}

export function isGlampingGroupByColumn(name: string): boolean {
  return isKnownGlampingColumn(name) && !GROUP_BY_EXCLUDE.has(name);
}

export function isGlampingDistinctColumn(name: string): boolean {
  return isKnownGlampingColumn(name) && !DISTINCT_EXCLUDE.has(name);
}

export const GLAMPING_AMENITIES_SCHEMA_BLURB = [
  'There is NO single "amenities" column.',
  'Use per-feature text columns, typically "Yes" / "No" / null: unit_* (e.g. unit_private_bathroom for private/ensuite bathroom on the unit, unit_hot_tub, unit_wifi, unit_pets),',
  'property_* (e.g. property_pool, property_dog_park, property_restaurant),',
  'activities_* (e.g. activities_hiking, activities_swimming),',
  'setting_* (e.g. setting_forest, setting_lake), and rv_* for RV site flags.',
  'Unstructured Roverpass text is in amenities_raw / activities_raw / lifestyle_raw; prefer column_eq_filters on structured flags for accuracy (amenities_raw is not used for eq filters).',
  'For rate impact of an amenity (e.g. with vs without private bathroom in Canada): call aggregate_properties with group_by set to that flag column (e.g. unit_private_bathroom) and filters.country + is_glamping_property; compare avg_daily_rate and median_daily_rate across groups — or run count_unique_properties twice with column_eq_filters.',
  'Call get_column_values on a specific flag column to see distinct values (often "Yes" / "No") before filtering.',
].join(' ');

/** Must match `aggregate_properties_v2` allowlist in Postgres (sage-ai-extend-glamping-allowlist-rpc.sql). */
export const GLAMPING_RPC_GROUP_BY_COLUMNS = ALL_GLAMPING_PROPERTY_COLUMNS.filter((c) =>
  isGlampingGroupByColumn(c)
) as unknown as readonly string[];

/** Must match `distinct_column_values` allowlist in Postgres. */
export const GLAMPING_RPC_DISTINCT_COLUMNS = ALL_GLAMPING_PROPERTY_COLUMNS.filter((c) =>
  isGlampingDistinctColumn(c)
) as unknown as readonly string[];
