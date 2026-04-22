-- One-pass distribution of "missing" (NULL) structured feature flags on all_glamping_properties.
-- 106 columns: unit_*, property_*, rv_*, activities_*, setting_*, river_stream_or_creek
WITH t AS (
  SELECT id, property_name, city, state,
    (
  (unit_bed is null)::int +
  (unit_shower is null)::int +
  (unit_water is null)::int +
  (unit_electricity is null)::int +
  (unit_picnic_table is null)::int +
  (unit_wifi is null)::int +
  (unit_pets is null)::int +
  (unit_private_bathroom is null)::int +
  (unit_full_kitchen is null)::int +
  (unit_kitchenette is null)::int +
  (unit_ada_accessibility is null)::int +
  (unit_patio is null)::int +
  (unit_air_conditioning is null)::int +
  (unit_gas_fireplace is null)::int +
  (unit_hot_tub_or_sauna is null)::int +
  (unit_hot_tub is null)::int +
  (unit_sauna is null)::int +
  (unit_cable is null)::int +
  (unit_campfires is null)::int +
  (unit_charcoal_grill is null)::int +
  (unit_mini_fridge is null)::int +
  (unit_bathtub is null)::int +
  (unit_wood_burning_stove is null)::int +
  (property_laundry is null)::int +
  (property_playground is null)::int +
  (property_pool is null)::int +
  (property_food_on_site is null)::int +
  (property_sauna is null)::int +
  (property_hot_tub is null)::int +
  (property_restaurant is null)::int +
  (property_dog_park is null)::int +
  (property_clubhouse is null)::int +
  (property_alcohol_available is null)::int +
  (property_golf_cart_rental is null)::int +
  (property_waterpark is null)::int +
  (property_general_store is null)::int +
  (property_waterfront is null)::int +
  (property_extended_stay is null)::int +
  (property_family_friendly is null)::int +
  (property_remote_work_friendly is null)::int +
  (property_fitness_room is null)::int +
  (property_propane_refilling_station is null)::int +
  (property_pickball_courts is null)::int +
  (property_age_restricted_55_plus is null)::int +
  (property_has_rentals is null)::int +
  (property_lgbtiq_friendly is null)::int +
  (property_gasoline_nearby is null)::int +
  (property_basketball is null)::int +
  (property_volleyball is null)::int +
  (property_jet_skiing is null)::int +
  (property_mobile_home_community is null)::int +
  (property_tennis is null)::int +
  (rv_vehicle_length is null)::int +
  (rv_parking is null)::int +
  (rv_accommodates_slideout is null)::int +
  (rv_surface_type is null)::int +
  (rv_surface_level is null)::int +
  (rv_vehicles_fifth_wheels is null)::int +
  (rv_vehicles_class_a_rvs is null)::int +
  (rv_vehicles_class_b_rvs is null)::int +
  (rv_vehicles_class_c_rvs is null)::int +
  (rv_vehicles_toy_hauler is null)::int +
  (rv_sewer_hook_up is null)::int +
  (rv_electrical_hook_up is null)::int +
  (rv_generators_allowed is null)::int +
  (rv_water_hookup is null)::int +
  (activities_fishing is null)::int +
  (activities_surfing is null)::int +
  (activities_horseback_riding is null)::int +
  (activities_paddling is null)::int +
  (activities_climbing is null)::int +
  (activities_off_roading_ohv is null)::int +
  (activities_boating is null)::int +
  (activities_swimming is null)::int +
  (activities_wind_sports is null)::int +
  (activities_snow_sports is null)::int +
  (activities_whitewater_paddling is null)::int +
  (activities_fall_fun is null)::int +
  (activities_hiking is null)::int +
  (activities_wildlife_watching is null)::int +
  (activities_biking is null)::int +
  (activities_canoeing_kayaking is null)::int +
  (activities_hunting is null)::int +
  (activities_golf is null)::int +
  (activities_backpacking is null)::int +
  (activities_historic_sightseeing is null)::int +
  (activities_scenic_drives is null)::int +
  (activities_stargazing is null)::int +
  (setting_ranch is null)::int +
  (setting_beach is null)::int +
  (setting_coastal is null)::int +
  (setting_suburban is null)::int +
  (setting_forest is null)::int +
  (setting_field is null)::int +
  (setting_wetlands is null)::int +
  (setting_hot_spring is null)::int +
  (setting_desert is null)::int +
  (setting_canyon is null)::int +
  (setting_waterfall is null)::int +
  (setting_swimming_hole is null)::int +
  (setting_lake is null)::int +
  (setting_cave is null)::int +
  (setting_redwoods is null)::int +
  (setting_farm is null)::int +
  (river_stream_or_creek is null)::int +
  (setting_mountainous is null)::int
    )::int AS missing_flag_count
  FROM all_glamping_properties
)
SELECT
  count(*)::int AS total_rows,
  min(missing_flag_count) AS min_missing,
  max(missing_flag_count) AS max_missing,
  round(avg(missing_flag_count)::numeric, 2) AS avg_missing,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY missing_flag_count) AS median_missing
FROM t;
