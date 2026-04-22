-- ============================================================================
-- Sage AI: extend aggregate_properties_v2 / distinct_column_values allowlists
-- to full glamping property feature columns (unit_*, property_*, activities_*,
-- setting_*, rv_*, etc.). Safe to re-run: drops and recreates the functions.
--
-- Apply in Supabase SQL editor (or: psql $DATABASE_URL -f this file).
-- Regenerate: npx tsx scripts/emit-sage-ai-glamping-rpc-extension.ts
-- ============================================================================

-- Dedupe key aligned with count_unique_properties / Sage AI tools (address, else name|city|state|country)
CREATE OR REPLACE FUNCTION public.sage_property_dedupe_key_for_aggregation(
  p_address        text,
  p_property_name  text,
  p_city          text,
  p_state         text,
  p_country       text
) RETURNS text
LANGUAGE SQL
STABLE
AS $$
  SELECT
    CASE
      WHEN NULLIF(btrim(COALESCE(p_address, '')), '') IS NOT NULL
      THEN lower(btrim(COALESCE(p_address, '')))
      ELSE
        lower(btrim(COALESCE(p_property_name, '')))
        || '|' || lower(btrim(COALESCE(p_city, '')))
        || '|' || lower(btrim(COALESCE(p_state, '')))
        || '|' || lower(btrim(COALESCE(p_country, '')))
    END
$$;

DROP FUNCTION IF EXISTS public.aggregate_properties_v2(text, jsonb);
DROP FUNCTION IF EXISTS public.distinct_column_values(text, integer);

CREATE FUNCTION public.aggregate_properties_v2(
  group_by text,
  filters  jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  key                 text,
  unique_properties  bigint,
  avg_daily_rate      numeric,
  median_daily_rate   numeric,
  total_units         bigint,
  total_sites         bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed_columns constant text[] := ARRAY[
    'research_status',
    'is_glamping_property',
    'is_closed',
    'property_type',
    'source',
    'discovery_source',
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
    'roverpass_occupancy_rate',
    'roverpass_occupancy_year'
  ];
  v_state                 text := filters->>'state';
  v_country               text := filters->>'country';
  v_unit_type             text := filters->>'unit_type';
  v_is_glamping_property  text := filters->>'is_glamping_property';
  v_is_closed             text := filters->>'is_closed';
  v_city                  text := filters->>'city';
  v_property_type         text := filters->>'property_type';
  v_source                text := filters->>'source';
  v_discovery_source      text := filters->>'discovery_source';
  v_research_status       text := filters->>'research_status';
  sql_text                text;
BEGIN
  IF NOT (group_by = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'group_by % is not in the allowlist', group_by
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  sql_text :=
    'WITH s AS ( '
      'SELECT '
        'COALESCE(' || quote_ident(group_by) || '::text, ''Unknown'') AS gk, '
        'GREATEST(COALESCE(quantity_of_units, 1), 1)::numeric AS wgt, '
        'quantity_of_units, '
        'property_total_sites, '
        'public.sage_property_dedupe_key_for_aggregation('
        'address::text, property_name, city, state, country) AS property_key, '
        'COALESCE( (SELECT ROUND(AVG(v::numeric), 2) FROM unnest(ARRAY['
        'rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, '
        'rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend'
        ']) AS t(v) WHERE v IS NOT NULL AND v::numeric > 0), '
        'NULLIF(rate_avg_retail_daily_rate, 0)::numeric) AS eff_adr '
      'FROM all_glamping_properties WHERE '
        '($1::text IS NULL OR state ILIKE $1) '
        'AND ($2::text IS NULL OR country ILIKE ''%'' || $2 || ''%'') '
        'AND ($3::text IS NULL OR unit_type ILIKE ''%'' || $3 || ''%'') '
        'AND ($4::text IS NULL OR is_glamping_property = $4) '
        'AND ($5::text IS NULL OR is_closed = $5) '
        'AND ($6::text IS NULL OR city ILIKE $6) '
        'AND ($7::text IS NULL OR property_type ILIKE ''%'' || $7 || ''%'') '
        'AND ($8::text IS NULL OR source = $8) '
        'AND ($9::text IS NULL OR discovery_source = $9) '
        'AND ($10::text IS NULL OR LOWER(research_status) = LOWER($10)) '
    '), '
    'grp AS ( '
      'SELECT gk, COUNT(DISTINCT property_key)::bigint AS unique_property_count, '
        'COALESCE(SUM(quantity_of_units), 0)::bigint AS total_units, '
        'COALESCE(SUM(property_total_sites), 0)::bigint AS total_sites '
      'FROM s GROUP BY gk '
    '), '
    'rated AS ( SELECT gk, eff_adr, wgt FROM s WHERE eff_adr IS NOT NULL AND eff_adr::numeric > 0 ), '
    'qstats AS ( '
      'SELECT gk, COUNT(*)::bigint AS n, '
        'PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY eff_adr) AS q1, '
        'PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY eff_adr) AS q3 '
      'FROM rated GROUP BY gk '
    '), '
    'rf AS ( '
      'SELECT r.gk, r.eff_adr, r.wgt, q.n, q.q1, q.q3, '
        'CASE '
          'WHEN q.n < 4 THEN true '
          'WHEN (q.q3 - q.q1) = 0 OR (q.q3 - q.q1) IS NULL THEN true '
          'WHEN r.eff_adr >= q.q1 - 1.5 * (q.q3 - q.q1) AND r.eff_adr <= q.q3 + 1.5 * (q.q3 - q.q1) THEN true '
          'ELSE false '
        'END AS use_row '
      'FROM rated r INNER JOIN qstats q ON r.gk = q.gk '
    '), '
    'u AS ( '
      'SELECT rf.gk, rf.eff_adr, rf.wgt, '
        'CASE '
          'WHEN SUM(CASE WHEN rf.use_row THEN rf.wgt END) OVER (PARTITION BY rf.gk) > 0 '
            'THEN rf.use_row '
          'ELSE true '
        'END AS use_final '
      'FROM rf '
    '), '
    'uk AS ( SELECT gk, eff_adr, wgt FROM u WHERE use_final AND eff_adr IS NOT NULL ), '
    'ag_avg AS ( '
      'SELECT gk, '
        'ROUND( (SUM(eff_adr * wgt) / NULLIF(SUM(wgt), 0))::numeric, 2) AS avg_daily_rate '
      'FROM uk GROUP BY gk '
    '), '
    'ag_med AS ( '
      'SELECT gk, '
        'ROUND( (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY eff_adr))::numeric, 2) AS median_daily_rate '
      'FROM uk GROUP BY gk '
    ') '
    'SELECT g.gk AS key, g.unique_property_count AS unique_properties, a.avg_daily_rate, m.median_daily_rate, '
    'g.total_units, g.total_sites '
    'FROM grp g '
    'LEFT JOIN ag_avg a ON a.gk = g.gk '
    'LEFT JOIN ag_med m ON m.gk = g.gk '
    'ORDER BY 2 DESC '
    'LIMIT 500';

  RETURN QUERY EXECUTE sql_text
    USING v_state, v_country, v_unit_type, v_is_glamping_property, v_is_closed,
          v_city, v_property_type, v_source, v_discovery_source, v_research_status;
END;
$$;

CREATE FUNCTION public.distinct_column_values(
  col      text,
  max_rows integer DEFAULT 50
)
RETURNS TABLE (
  value     text,
  row_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed_columns constant text[] := ARRAY[
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
    'roverpass_occupancy_year'
  ];
  sql_text text;
  capped   integer := LEAST(GREATEST(max_rows, 1), 500);
BEGIN
  IF NOT (col = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'column % is not in the allowlist', col
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  sql_text := format($f$
    SELECT
      %1$I::text        AS value,
      COUNT(*)::bigint  AS row_count
    FROM all_glamping_properties
    WHERE %1$I IS NOT NULL
    GROUP BY %1$I
    ORDER BY row_count DESC, value ASC
    LIMIT $1
  $f$, col);

  RETURN QUERY EXECUTE sql_text USING capped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aggregate_properties_v2(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distinct_column_values(text, integer) TO authenticated;
