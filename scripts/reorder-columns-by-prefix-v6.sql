-- Reorder all_glamping_properties columns by category prefix (unit_, property_, rate_, rv_, activities_, setting_)
-- Run this SQL in your Supabase SQL Editor
-- Columns are grouped so unit_bathtub, unit_mini_fridge, etc. appear with other unit_ columns

BEGIN;

CREATE TABLE "all_glamping_properties_new" (
  -- CORE IDENTITY & STATUS
  id BIGSERIAL NOT NULL,
  research_status TEXT DEFAULT 'new'::text,
  is_glamping_property TEXT NOT NULL DEFAULT 'Yes'::text,
  is_closed TEXT NOT NULL DEFAULT 'No'::text,
  property_name TEXT,
  site_name TEXT,
  slug TEXT,
  property_type TEXT,

  -- SOURCE & TRACKING
  source TEXT,
  discovery_source TEXT,
  date_added TEXT,
  date_updated TEXT,

  -- LOCATION
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  lat NUMERIC,
  lon NUMERIC,

  -- CAPACITY & OPERATIONAL (property-level)
  property_total_sites NUMERIC,
  quantity_of_units NUMERIC,
  year_site_opened NUMERIC,
  operating_season_months TEXT,
  number_of_locations NUMERIC,

  -- UNIT_ (all unit columns grouped, unit_bathtub at end)
  unit_type TEXT,
  unit_capacity TEXT,
  unit_sq_ft NUMERIC,
  unit_description TEXT,
  unit_bed TEXT,
  unit_shower TEXT,
  unit_water TEXT,
  unit_electricity TEXT,
  unit_picnic_table TEXT,
  unit_wifi TEXT,
  unit_pets TEXT,
  unit_private_bathroom TEXT,
  unit_full_kitchen TEXT,
  unit_kitchenette TEXT,
  unit_ada_accessibility TEXT,
  unit_patio TEXT,
  unit_air_conditioning TEXT,
  unit_gas_fireplace TEXT,
  unit_hot_tub_or_sauna TEXT,
  unit_hot_tub TEXT,
  unit_sauna TEXT,
  unit_cable TEXT,
  unit_campfires TEXT,
  unit_charcoal_grill TEXT,
  unit_mini_fridge TEXT,
  unit_bathtub TEXT,
  unit_wood_burning_stove TEXT,

  -- RATE_
  rate_unit_rates_by_year JSONB,
  rate_avg_retail_daily_rate NUMERIC,
  rate_winter_weekday NUMERIC,
  rate_winter_weekend NUMERIC,
  rate_spring_weekday NUMERIC,
  rate_spring_weekend NUMERIC,
  rate_summer_weekday NUMERIC,
  rate_summer_weekend NUMERIC,
  rate_fall_weekday NUMERIC,
  rate_fall_weekend NUMERIC,
  rate_category TEXT,

  -- PROPERTY_ (all property amenity columns grouped)
  property_laundry TEXT,
  property_playground TEXT,
  property_pool TEXT,
  property_food_on_site TEXT,
  property_sauna TEXT,
  property_hot_tub TEXT,
  property_restaurant TEXT,
  property_dog_park TEXT,
  property_clubhouse TEXT,
  property_alcohol_available TEXT,
  property_golf_cart_rental TEXT,
  property_waterpark TEXT,
  property_general_store TEXT,
  property_waterfront TEXT,
  property_extended_stay TEXT,
  property_family_friendly TEXT,
  property_remote_work_friendly TEXT,
  property_fitness_room TEXT,
  property_propane_refilling_station TEXT,
  property_pickball_courts TEXT,

  -- CONTACT & INFO
  url TEXT,
  phone_number TEXT,
  description TEXT,
  minimum_nights TEXT,

  -- RV_
  rv_vehicle_length TEXT,
  rv_parking TEXT,
  rv_accommodates_slideout TEXT,
  rv_surface_type TEXT,
  rv_surface_level TEXT,
  rv_vehicles_fifth_wheels TEXT,
  rv_vehicles_class_a_rvs TEXT,
  rv_vehicles_class_b_rvs TEXT,
  rv_vehicles_class_c_rvs TEXT,
  rv_vehicles_toy_hauler TEXT,
  rv_sewer_hook_up TEXT,
  rv_electrical_hook_up TEXT,
  rv_generators_allowed TEXT,
  rv_water_hookup TEXT,

  -- ACTIVITIES_
  activities_fishing TEXT,
  activities_surfing TEXT,
  activities_horseback_riding TEXT,
  activities_paddling TEXT,
  activities_climbing TEXT,
  activities_off_roading_ohv TEXT,
  activities_boating TEXT,
  activities_swimming TEXT,
  activities_wind_sports TEXT,
  activities_snow_sports TEXT,
  activities_whitewater_paddling TEXT,
  activities_fall_fun TEXT,
  activities_hiking TEXT,
  activities_wildlife_watching TEXT,
  activities_biking TEXT,
  activities_canoeing_kayaking TEXT,
  activities_hunting TEXT,
  activities_golf TEXT,
  activities_backpacking TEXT,
  activities_historic_sightseeing TEXT,
  activities_scenic_drives TEXT,
  activities_stargazing TEXT,

  -- SETTING_
  setting_ranch TEXT,
  setting_beach TEXT,
  setting_coastal TEXT,
  setting_suburban TEXT,
  setting_forest TEXT,
  setting_field TEXT,
  setting_wetlands TEXT,
  setting_hot_spring TEXT,
  setting_desert TEXT,
  setting_canyon TEXT,
  setting_waterfall TEXT,
  setting_swimming_hole TEXT,
  setting_lake TEXT,
  setting_cave TEXT,
  setting_redwoods TEXT,
  setting_farm TEXT,
  river_stream_or_creek TEXT,
  setting_mountainous TEXT,

  -- METADATA
  quality_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT all_glamping_properties_new_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Copy data (column names match, order doesn't matter for INSERT/SELECT)
INSERT INTO "all_glamping_properties_new" (
  id, research_status, is_glamping_property, is_closed,
  property_name, site_name, slug, property_type,
  source, discovery_source, date_added, date_updated,
  address, city, state, zip_code, country, lat, lon,
  property_total_sites, quantity_of_units, year_site_opened, operating_season_months, number_of_locations,
  unit_type, unit_capacity, unit_sq_ft, unit_description, unit_bed, unit_shower, unit_water, unit_electricity,
  unit_picnic_table, unit_wifi, unit_pets, unit_private_bathroom, unit_full_kitchen, unit_kitchenette,
  unit_ada_accessibility, unit_patio, unit_air_conditioning, unit_gas_fireplace, unit_hot_tub_or_sauna,
  unit_hot_tub, unit_sauna, unit_cable, unit_campfires, unit_charcoal_grill,
  unit_mini_fridge, unit_bathtub, unit_wood_burning_stove,
  rate_unit_rates_by_year, rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend, rate_category,
  property_laundry, property_playground, property_pool, property_food_on_site, property_sauna, property_hot_tub,
  property_restaurant, property_dog_park, property_clubhouse, property_alcohol_available, property_golf_cart_rental,
  property_waterpark, property_general_store, property_waterfront, property_extended_stay, property_family_friendly,
  property_remote_work_friendly, property_fitness_room, property_propane_refilling_station, property_pickball_courts,
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
  quality_score, created_at, updated_at
)
SELECT
  id, research_status, is_glamping_property, is_closed,
  property_name, site_name, slug, property_type,
  source, discovery_source, date_added, date_updated,
  address, city, state, zip_code, country, lat, lon,
  property_total_sites, quantity_of_units, year_site_opened, operating_season_months, number_of_locations,
  unit_type, unit_capacity, unit_sq_ft, unit_description, unit_bed, unit_shower, unit_water, unit_electricity,
  unit_picnic_table, unit_wifi, unit_pets, unit_private_bathroom, unit_full_kitchen, unit_kitchenette,
  unit_ada_accessibility, unit_patio, unit_air_conditioning, unit_gas_fireplace, unit_hot_tub_or_sauna,
  unit_hot_tub, unit_sauna, unit_cable, unit_campfires, unit_charcoal_grill,
  unit_mini_fridge, unit_bathtub, unit_wood_burning_stove,
  rate_unit_rates_by_year, rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend, rate_category,
  property_laundry, property_playground, property_pool, property_food_on_site, property_sauna, property_hot_tub,
  property_restaurant, property_dog_park, property_clubhouse, property_alcohol_available, property_golf_cart_rental,
  property_waterpark, property_general_store, property_waterfront, property_extended_stay, property_family_friendly,
  property_remote_work_friendly, property_fitness_room, property_propane_refilling_station, property_pickball_courts,
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
  quality_score, created_at, updated_at
FROM "all_glamping_properties";

-- Recreate indexes (adjust if your table has different indexes)
CREATE INDEX IF NOT EXISTS idx_all_glamping_property_name ON "all_glamping_properties_new" USING btree (property_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_all_glamping_location ON "all_glamping_properties_new" USING btree (city, state) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_all_glamping_coordinates ON "all_glamping_properties_new" USING btree (lat, lon) TABLESPACE pg_default WHERE ((lat IS NOT NULL) AND (lon IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_all_glamping_quality_score ON "all_glamping_properties_new" USING btree (quality_score) TABLESPACE pg_default WHERE (quality_score IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_all_glamping_rate_category ON "all_glamping_properties_new" USING btree (rate_category) TABLESPACE pg_default WHERE (rate_category IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_all_glamping_is_glamping ON "all_glamping_properties_new" USING btree (is_glamping_property) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_all_glamping_is_closed ON "all_glamping_properties_new" USING btree (is_closed) TABLESPACE pg_default WHERE (is_closed IS NOT NULL);

-- Recreate triggers if they exist (run these only if the functions exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_slug_from_property_name') THEN
    CREATE TRIGGER set_slug_before_insert BEFORE INSERT ON "all_glamping_properties_new" FOR EACH ROW EXECUTE FUNCTION generate_slug_from_property_name();
    CREATE TRIGGER set_slug_before_update BEFORE UPDATE ON "all_glamping_properties_new" FOR EACH ROW WHEN ((new.property_name IS DISTINCT FROM old.property_name) OR ((new.slug IS NULL) AND (old.slug IS NOT NULL))) EXECUTE FUNCTION generate_slug_from_property_name();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calc_avg_retail_daily_rate') THEN
    CREATE TRIGGER calc_avg_rate_trigger BEFORE INSERT OR UPDATE OF rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend ON "all_glamping_properties_new" FOR EACH ROW EXECUTE FUNCTION calc_avg_retail_daily_rate();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_season_rates_from_latest_year') THEN
    CREATE TRIGGER sync_season_rates_trigger BEFORE INSERT OR UPDATE OF rate_unit_rates_by_year ON "all_glamping_properties_new" FOR EACH ROW EXECUTE FUNCTION sync_season_rates_from_latest_year();
  END IF;
END $$;

-- Swap tables
DROP TABLE "all_glamping_properties" CASCADE;
ALTER TABLE "all_glamping_properties_new" RENAME TO "all_glamping_properties";
ALTER TABLE "all_glamping_properties" RENAME CONSTRAINT all_glamping_properties_new_pkey TO all_glamping_properties_pkey;

-- Restore foreign key from google_places_data if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_places_data') THEN
    ALTER TABLE "google_places_data" DROP CONSTRAINT IF EXISTS google_places_data_property_id_fkey;
    ALTER TABLE "google_places_data" ADD CONSTRAINT google_places_data_property_id_fkey FOREIGN KEY (property_id) REFERENCES "all_glamping_properties"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Row Level Security (RLS)
-- Managed users: full access. Anonymous: no direct access (data via API routes). Service role: bypasses RLS.
ALTER TABLE "all_glamping_properties" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users full read access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow authenticated full access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow service role full access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users select" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users insert" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users update" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users delete" ON "all_glamping_properties";

CREATE POLICY "Allow managed users select" ON "all_glamping_properties"
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM managed_users WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Allow managed users insert" ON "all_glamping_properties"
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM managed_users WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Allow managed users update" ON "all_glamping_properties"
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM managed_users WHERE user_id = auth.uid() AND is_active = true)
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM managed_users WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Allow managed users delete" ON "all_glamping_properties"
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM managed_users WHERE user_id = auth.uid() AND is_active = true)
  );

COMMIT;
