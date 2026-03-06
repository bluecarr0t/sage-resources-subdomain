-- Reorder all_glamping_properties columns for streamlined CSV export.
-- Groups columns by prefix: unit_, property_, rate_, rv_, activities_, setting_
-- Run this SQL in your Supabase SQL Editor.

BEGIN;

-- Step 1: Create new table with columns grouped by prefix
CREATE TABLE "all_glamping_properties_new" (

  -- ── CORE IDENTITY ──────────────────────────────────────────────────
  id BIGSERIAL NOT NULL,
  research_status TEXT NULL DEFAULT 'new'::text,
  is_glamping_property TEXT NOT NULL DEFAULT 'Yes'::text,
  is_closed TEXT NOT NULL DEFAULT 'No'::text,
  property_name TEXT NULL,
  site_name TEXT NULL,
  slug TEXT NULL,
  property_type TEXT NULL,

  -- ── SOURCE & TRACKING ────────────────────────────────────────────────
  source TEXT NULL,
  discovery_source TEXT NULL,
  date_added TEXT NULL,
  date_updated TEXT NULL,

  -- ── LOCATION ────────────────────────────────────────────────────────
  address TEXT NULL,
  city TEXT NULL,
  state TEXT NULL,
  zip_code TEXT NULL,
  country TEXT NULL,
  lat NUMERIC NULL,
  lon NUMERIC NULL,

  -- ── OPERATIONAL ─────────────────────────────────────────────────────
  property_total_sites NUMERIC NULL,
  quantity_of_units NUMERIC NULL,
  year_site_opened NUMERIC NULL,
  operating_season_months TEXT NULL,
  number_of_locations NUMERIC NULL,

  -- ── UNIT (unit_ group) ─────────────────────────────────────────────
  unit_type TEXT NULL,
  unit_capacity TEXT NULL,
  unit_sq_ft NUMERIC NULL,
  unit_description TEXT NULL,
  unit_bed TEXT NULL,
  unit_shower TEXT NULL,
  unit_water TEXT NULL,
  unit_electricity TEXT NULL,
  unit_picnic_table TEXT NULL,
  unit_wifi TEXT NULL,
  unit_pets TEXT NULL,
  unit_private_bathroom TEXT NULL,
  unit_full_kitchen TEXT NULL,
  unit_kitchenette TEXT NULL,
  unit_ada_accessibility TEXT NULL,
  unit_patio TEXT NULL,
  unit_air_conditioning TEXT NULL,
  unit_gas_fireplace TEXT NULL,
  unit_hot_tub_or_sauna TEXT NULL,
  unit_hot_tub TEXT NULL,
  unit_sauna TEXT NULL,
  unit_cable TEXT NULL,
  unit_campfires TEXT NULL,
  unit_charcoal_grill TEXT NULL,
  unit_mini_fridge TEXT NULL,
  unit_bathtub TEXT NULL,
  unit_wood_burning_stove TEXT NULL,

  -- ── RATE (rate_ group) ──────────────────────────────────────────────
  rate_unit_rates_by_year JSONB NULL,
  rate_avg_retail_daily_rate NUMERIC NULL,
  rate_winter_weekday NUMERIC NULL,
  rate_winter_weekend NUMERIC NULL,
  rate_spring_weekday NUMERIC NULL,
  rate_spring_weekend NUMERIC NULL,
  rate_summer_weekday NUMERIC NULL,
  rate_summer_weekend NUMERIC NULL,
  rate_fall_weekday NUMERIC NULL,
  rate_fall_weekend NUMERIC NULL,
  rate_category TEXT NULL,

  -- ── PROPERTY (property_ group) ───────────────────────────────────────
  property_laundry TEXT NULL,
  property_playground TEXT NULL,
  property_pool TEXT NULL,
  property_food_on_site TEXT NULL,
  property_sauna TEXT NULL,
  property_hot_tub TEXT NULL,
  property_restaurant TEXT NULL,
  property_dog_park TEXT NULL,
  property_clubhouse TEXT NULL,
  property_alcohol_available TEXT NULL,
  property_golf_cart_rental TEXT NULL,
  property_waterpark TEXT NULL,
  property_general_store TEXT NULL,
  property_waterfront TEXT NULL,
  property_extended_stay TEXT NULL,
  property_family_friendly TEXT NULL,
  property_remote_work_friendly TEXT NULL,
  property_fitness_room TEXT NULL,
  property_propane_refilling_station TEXT NULL,
  property_pickball_courts TEXT NULL,
  property_age_restricted_55_plus TEXT NULL,
  property_has_rentals TEXT NULL,
  property_lgbtiq_friendly TEXT NULL,
  property_gasoline_nearby TEXT NULL,
  property_basketball TEXT NULL,
  property_volleyball TEXT NULL,
  property_jet_skiing TEXT NULL,
  property_mobile_home_community TEXT NULL,
  property_tennis TEXT NULL,

  -- ── CONTACT & INFO ──────────────────────────────────────────────────
  url TEXT NULL,
  phone_number TEXT NULL,
  description TEXT NULL,
  minimum_nights TEXT NULL,

  -- ── RV (rv_ group) ──────────────────────────────────────────────────
  rv_vehicle_length TEXT NULL,
  rv_parking TEXT NULL,
  rv_accommodates_slideout TEXT NULL,
  rv_surface_type TEXT NULL,
  rv_surface_level TEXT NULL,
  rv_vehicles_fifth_wheels TEXT NULL,
  rv_vehicles_class_a_rvs TEXT NULL,
  rv_vehicles_class_b_rvs TEXT NULL,
  rv_vehicles_class_c_rvs TEXT NULL,
  rv_vehicles_toy_hauler TEXT NULL,
  rv_sewer_hook_up TEXT NULL,
  rv_electrical_hook_up TEXT NULL,
  rv_generators_allowed TEXT NULL,
  rv_water_hookup TEXT NULL,

  -- ── ACTIVITIES (activities_ group) ────────────────────────────────────
  activities_fishing TEXT NULL,
  activities_surfing TEXT NULL,
  activities_horseback_riding TEXT NULL,
  activities_paddling TEXT NULL,
  activities_climbing TEXT NULL,
  activities_off_roading_ohv TEXT NULL,
  activities_boating TEXT NULL,
  activities_swimming TEXT NULL,
  activities_wind_sports TEXT NULL,
  activities_snow_sports TEXT NULL,
  activities_whitewater_paddling TEXT NULL,
  activities_fall_fun TEXT NULL,
  activities_hiking TEXT NULL,
  activities_wildlife_watching TEXT NULL,
  activities_biking TEXT NULL,
  activities_canoeing_kayaking TEXT NULL,
  activities_hunting TEXT NULL,
  activities_golf TEXT NULL,
  activities_backpacking TEXT NULL,
  activities_historic_sightseeing TEXT NULL,
  activities_scenic_drives TEXT NULL,
  activities_stargazing TEXT NULL,

  -- ── SETTING (setting_ group) ─────────────────────────────────────────
  setting_ranch TEXT NULL,
  setting_beach TEXT NULL,
  setting_coastal TEXT NULL,
  setting_suburban TEXT NULL,
  setting_forest TEXT NULL,
  setting_field TEXT NULL,
  setting_wetlands TEXT NULL,
  setting_hot_spring TEXT NULL,
  setting_desert TEXT NULL,
  setting_canyon TEXT NULL,
  setting_waterfall TEXT NULL,
  setting_swimming_hole TEXT NULL,
  setting_lake TEXT NULL,
  setting_cave TEXT NULL,
  setting_redwoods TEXT NULL,
  setting_farm TEXT NULL,
  river_stream_or_creek TEXT NULL,
  setting_mountainous TEXT NULL,

  -- ── METADATA ─────────────────────────────────────────────────────────
  quality_score NUMERIC NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),

  -- ── ROVERPASS (source-specific) ──────────────────────────────────────
  roverpass_campground_id TEXT NULL,
  roverpass_occupancy_rate NUMERIC NULL,
  roverpass_occupancy_year NUMERIC NULL,
  amenities_raw TEXT NULL,
  activities_raw TEXT NULL,
  lifestyle_raw TEXT NULL,

  CONSTRAINT all_glamping_properties_new_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;


-- Step 2: Copy all data (column order differs, names match 1:1)
INSERT INTO "all_glamping_properties_new" (
  id, research_status, is_glamping_property, is_closed,
  property_name, site_name, slug, property_type,
  source, discovery_source, date_added, date_updated,
  address, city, state, zip_code, country, lat, lon,
  property_total_sites, quantity_of_units, year_site_opened, operating_season_months, number_of_locations,
  unit_type, unit_capacity, unit_sq_ft, unit_description, unit_bed,
  unit_shower, unit_water, unit_electricity, unit_picnic_table, unit_wifi, unit_pets,
  unit_private_bathroom, unit_full_kitchen, unit_kitchenette, unit_ada_accessibility, unit_patio,
  unit_air_conditioning, unit_gas_fireplace, unit_hot_tub_or_sauna, unit_hot_tub, unit_sauna,
  unit_cable, unit_campfires, unit_charcoal_grill, unit_mini_fridge, unit_bathtub, unit_wood_burning_stove,
  rate_unit_rates_by_year, rate_avg_retail_daily_rate,
  rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, rate_category,
  property_laundry, property_playground, property_pool, property_food_on_site, property_sauna, property_hot_tub,
  property_restaurant, property_dog_park, property_clubhouse, property_alcohol_available, property_golf_cart_rental,
  property_waterpark, property_general_store, property_waterfront, property_extended_stay, property_family_friendly,
  property_remote_work_friendly, property_fitness_room, property_propane_refilling_station, property_pickball_courts,
  property_age_restricted_55_plus, property_has_rentals, property_lgbtiq_friendly, property_gasoline_nearby,
  property_basketball, property_volleyball, property_jet_skiing, property_mobile_home_community, property_tennis,
  url, phone_number, description, minimum_nights,
  rv_vehicle_length, rv_parking, rv_accommodates_slideout, rv_surface_type, rv_surface_level,
  rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs, rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs, rv_vehicles_toy_hauler,
  rv_sewer_hook_up, rv_electrical_hook_up, rv_generators_allowed, rv_water_hookup,
  activities_fishing, activities_surfing, activities_horseback_riding, activities_paddling, activities_climbing,
  activities_off_roading_ohv, activities_boating, activities_swimming, activities_wind_sports, activities_snow_sports,
  activities_whitewater_paddling, activities_fall_fun, activities_hiking, activities_wildlife_watching, activities_biking,
  activities_canoeing_kayaking, activities_hunting, activities_golf, activities_backpacking, activities_historic_sightseeing,
  activities_scenic_drives, activities_stargazing,
  setting_ranch, setting_beach, setting_coastal, setting_suburban, setting_forest, setting_field, setting_wetlands,
  setting_hot_spring, setting_desert, setting_canyon, setting_waterfall, setting_swimming_hole, setting_lake,
  setting_cave, setting_redwoods, setting_farm, river_stream_or_creek, setting_mountainous,
  quality_score, created_at, updated_at,
  roverpass_campground_id, roverpass_occupancy_rate, roverpass_occupancy_year,
  amenities_raw, activities_raw, lifestyle_raw
)
SELECT
  id, research_status, is_glamping_property, is_closed,
  property_name, site_name, slug, property_type,
  source, discovery_source, date_added, date_updated,
  address, city, state, zip_code, country, lat, lon,
  property_total_sites, quantity_of_units, year_site_opened, operating_season_months, number_of_locations,
  unit_type, unit_capacity, unit_sq_ft, unit_description, unit_bed,
  unit_shower, unit_water, unit_electricity, unit_picnic_table, unit_wifi, unit_pets,
  unit_private_bathroom, unit_full_kitchen, unit_kitchenette, unit_ada_accessibility, unit_patio,
  unit_air_conditioning, unit_gas_fireplace, unit_hot_tub_or_sauna, unit_hot_tub, unit_sauna,
  unit_cable, unit_campfires, unit_charcoal_grill, unit_mini_fridge, unit_bathtub, unit_wood_burning_stove,
  rate_unit_rates_by_year, rate_avg_retail_daily_rate,
  rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, rate_category,
  property_laundry, property_playground, property_pool, property_food_on_site, property_sauna, property_hot_tub,
  property_restaurant, property_dog_park, property_clubhouse, property_alcohol_available, property_golf_cart_rental,
  property_waterpark, property_general_store, property_waterfront, property_extended_stay, property_family_friendly,
  property_remote_work_friendly, property_fitness_room, property_propane_refilling_station, property_pickball_courts,
  property_age_restricted_55_plus, property_has_rentals, property_lgbtiq_friendly, property_gasoline_nearby,
  property_basketball, property_volleyball, property_jet_skiing, property_mobile_home_community, property_tennis,
  url, phone_number, description, minimum_nights,
  rv_vehicle_length, rv_parking, rv_accommodates_slideout, rv_surface_type, rv_surface_level,
  rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs, rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs, rv_vehicles_toy_hauler,
  rv_sewer_hook_up, rv_electrical_hook_up, rv_generators_allowed, rv_water_hookup,
  activities_fishing, activities_surfing, activities_horseback_riding, activities_paddling, activities_climbing,
  activities_off_roading_ohv, activities_boating, activities_swimming, activities_wind_sports, activities_snow_sports,
  activities_whitewater_paddling, activities_fall_fun, activities_hiking, activities_wildlife_watching, activities_biking,
  activities_canoeing_kayaking, activities_hunting, activities_golf, activities_backpacking, activities_historic_sightseeing,
  activities_scenic_drives, activities_stargazing,
  setting_ranch, setting_beach, setting_coastal, setting_suburban, setting_forest, setting_field, setting_wetlands,
  setting_hot_spring, setting_desert, setting_canyon, setting_waterfall, setting_swimming_hole, setting_lake,
  setting_cave, setting_redwoods, setting_farm, river_stream_or_creek, setting_mountainous,
  quality_score, created_at, updated_at,
  roverpass_campground_id, roverpass_occupancy_rate, roverpass_occupancy_year,
  amenities_raw, activities_raw, lifestyle_raw
FROM "all_glamping_properties";


-- Step 3: Reset id sequence
SELECT setval(
  pg_get_serial_sequence('"all_glamping_properties_new"', 'id'),
  COALESCE((SELECT MAX(id) FROM "all_glamping_properties_new"), 0) + 1,
  false
);


-- Step 4: Recreate indexes (match existing names)
CREATE INDEX IF NOT EXISTS idx_all_glamping_property_name
  ON "all_glamping_properties_new" USING btree (property_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_all_glamping_location
  ON "all_glamping_properties_new" USING btree (city, state) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_all_glamping_coordinates
  ON "all_glamping_properties_new" USING btree (lat, lon) TABLESPACE pg_default
  WHERE lat IS NOT NULL AND lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_all_glamping_quality_score
  ON "all_glamping_properties_new" USING btree (quality_score) TABLESPACE pg_default
  WHERE quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_all_glamping_rate_category
  ON "all_glamping_properties_new" USING btree (rate_category) TABLESPACE pg_default
  WHERE rate_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_all_glamping_is_glamping
  ON "all_glamping_properties_new" USING btree (is_glamping_property) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_all_glamping_is_closed
  ON "all_glamping_properties_new" USING btree (is_closed) TABLESPACE pg_default
  WHERE is_closed IS NOT NULL;


-- Step 5: Recreate triggers
CREATE TRIGGER set_slug_before_insert
  BEFORE INSERT ON "all_glamping_properties_new"
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_from_property_name();

CREATE TRIGGER set_slug_before_update
  BEFORE UPDATE ON "all_glamping_properties_new"
  FOR EACH ROW
  WHEN (
    new.property_name IS DISTINCT FROM old.property_name
    OR (new.slug IS NULL AND old.slug IS NOT NULL)
  )
  EXECUTE FUNCTION generate_slug_from_property_name();

CREATE TRIGGER calc_avg_rate_trigger
  BEFORE INSERT OR UPDATE OF
    rate_winter_weekday, rate_winter_weekend,
    rate_spring_weekday, rate_spring_weekend,
    rate_summer_weekday, rate_summer_weekend,
    rate_fall_weekday, rate_fall_weekend
  ON "all_glamping_properties_new"
  FOR EACH ROW
  EXECUTE FUNCTION calc_avg_retail_daily_rate();

CREATE TRIGGER sync_season_rates_trigger
  BEFORE INSERT OR UPDATE OF rate_unit_rates_by_year
  ON "all_glamping_properties_new"
  FOR EACH ROW
  EXECUTE FUNCTION sync_season_rates_from_latest_year();


-- Step 6: Drop old table and rename new one
DROP TABLE "all_glamping_properties" CASCADE;
ALTER TABLE "all_glamping_properties_new" RENAME TO "all_glamping_properties";
ALTER TABLE "all_glamping_properties"
  RENAME CONSTRAINT all_glamping_properties_new_pkey TO all_glamping_properties_pkey;


-- Step 7: Recreate foreign key from google_places_data (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'google_places_data'
  ) THEN
    ALTER TABLE "google_places_data"
      DROP CONSTRAINT IF EXISTS google_places_data_property_id_fkey;
    ALTER TABLE "google_places_data"
      ADD CONSTRAINT google_places_data_property_id_fkey
        FOREIGN KEY (property_id) REFERENCES "all_glamping_properties"(id) ON DELETE CASCADE;
  END IF;
END $$;


-- Step 8: Re-enable RLS
ALTER TABLE "all_glamping_properties" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON "all_glamping_properties";
CREATE POLICY "Allow public read access"
  ON "all_glamping_properties" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated full access" ON "all_glamping_properties";
CREATE POLICY "Allow authenticated full access"
  ON "all_glamping_properties" FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow service role full access" ON "all_glamping_properties";
CREATE POLICY "Allow service role full access"
  ON "all_glamping_properties" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
