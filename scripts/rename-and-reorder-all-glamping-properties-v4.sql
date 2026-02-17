-- Rename columns with unit_/property_/activities_/setting_ prefixes,
-- add new columns, and reorganize column order.
-- Run this SQL in your Supabase SQL Editor.

BEGIN;

-- Step 1: Create new table with renamed & reordered columns
CREATE TABLE "all_glamping_properties_new" (

  -- ── CORE IDENTITY ──────────────────────────────────────────────────
  id BIGSERIAL NOT NULL,
  property_name TEXT,
  site_name TEXT,
  slug TEXT,
  property_type TEXT,
  research_status TEXT DEFAULT 'new'::text,
  is_glamping_property TEXT NOT NULL DEFAULT 'Yes'::text,
  is_closed TEXT NOT NULL DEFAULT 'No'::text,

  -- ── SOURCE & TRACKING ──────────────────────────────────────────────
  source TEXT,
  discovery_source TEXT,
  date_added TEXT,
  date_updated TEXT,

  -- ── LOCATION ───────────────────────────────────────────────────────
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  lat NUMERIC,
  lon NUMERIC,

  -- ── OPERATIONAL ────────────────────────────────────────────────────
  property_total_sites NUMERIC,
  quantity_of_units NUMERIC,
  year_site_opened NUMERIC,
  operating_season_months TEXT,
  number_of_locations NUMERIC,

  -- ── UNIT DETAILS (unit_ group) ─────────────────────────────────────
  unit_type TEXT,
  unit_capacity TEXT,
  unit_sq_ft NUMERIC,
  unit_description TEXT,                -- NEW
  unit_bed TEXT,                        -- NEW
  unit_shower TEXT,                     -- was: shower
  unit_water TEXT,                      -- was: water
  unit_electricity TEXT,                -- was: electricity
  unit_picnic_table TEXT,               -- was: picnic_table
  unit_wifi TEXT,                       -- was: wifi
  unit_pets TEXT,                       -- was: pets
  unit_private_bathroom TEXT,           -- was: private_bathroom
  unit_full_kitchen TEXT,               -- was: kitchen
  unit_kitchenette TEXT,                -- NEW
  unit_ada_accessibility TEXT,          -- NEW
  unit_patio TEXT,                      -- was: patio
  unit_air_conditioning TEXT,           -- NEW
  unit_gas_fireplace TEXT,              -- NEW
  unit_hot_tub_or_sauna TEXT,           -- was: hot_tub_or_sauna
  unit_hot_tub TEXT,                    -- was: unit_hot_tub BOOLEAN -> TEXT
  unit_sauna TEXT,                      -- was: unit_sauna BOOLEAN -> TEXT
  unit_cable TEXT,                      -- was: cable
  unit_rates_by_year JSONB,

  -- ── PRICING ────────────────────────────────────────────────────────
  avg_retail_daily_rate NUMERIC,
  winter_weekday NUMERIC,
  winter_weekend NUMERIC,
  spring_weekday NUMERIC,
  spring_weekend NUMERIC,
  summer_weekday NUMERIC,
  summer_weekend NUMERIC,
  fall_weekday NUMERIC,
  fall_weekend NUMERIC,
  rate_category TEXT,

  -- ── PROPERTY AMENITIES (property_ group) ───────────────────────────
  property_laundry TEXT,                -- was: laundry
  property_playground TEXT,             -- was: playground
  property_pool TEXT,                   -- was: pool
  property_food_on_site TEXT,           -- was: food_on_site
  property_sauna TEXT,                  -- was: property_sauna BOOLEAN -> TEXT
  property_hot_tub TEXT,                -- was: property_hot_tub BOOLEAN -> TEXT
  property_restaurant TEXT,             -- was: restaurant
  property_dog_park TEXT,               -- was: dog_park
  property_clubhouse TEXT,              -- was: clubhouse
  property_alcohol_available TEXT,      -- was: alcohol_available
  property_golf_cart_rental TEXT,       -- was: golf_cart_rental
  property_waterpark TEXT,              -- was: waterpark
  property_general_store TEXT,          -- was: general_store
  property_waterfront TEXT,             -- was: waterfront
  property_extended_stay TEXT,          -- NEW
  property_family_friendly TEXT,        -- NEW
  property_remote_work_friendly TEXT,   -- NEW
  property_fitness_room TEXT,           -- NEW
  property_propane_refilling_station TEXT, -- NEW

  -- ── CONTACT & INFO ─────────────────────────────────────────────────
  url TEXT,
  phone_number TEXT,
  description TEXT,
  minimum_nights TEXT,

  -- ── OTHER AMENITIES ────────────────────────────────────────────────
  toilet TEXT,
  campfires TEXT,
  charcoal_grill TEXT,

  -- ── RV-SPECIFIC (rv_ group) ────────────────────────────────────────
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
  rv_sewer_hook_up TEXT,                -- was: sewer_hook_up
  rv_electrical_hook_up TEXT,           -- was: electrical_hook_up
  rv_generators_allowed TEXT,           -- was: generators_allowed
  rv_water_hookup TEXT,                 -- was: water_hookup

  -- ── ACTIVITIES (activities_ group) ─────────────────────────────────
  activities_fishing TEXT,              -- was: fishing
  activities_surfing TEXT,              -- was: surfing
  activities_horseback_riding TEXT,     -- was: horseback_riding
  activities_paddling TEXT,             -- was: paddling
  activities_climbing TEXT,             -- was: climbing
  activities_off_roading_ohv TEXT,      -- was: off_roading_ohv
  activities_boating TEXT,              -- was: boating
  activities_swimming TEXT,             -- was: swimming
  activities_wind_sports TEXT,          -- was: wind_sports
  activities_snow_sports TEXT,          -- was: snow_sports
  activities_whitewater_paddling TEXT,  -- was: whitewater_paddling
  activities_fall_fun TEXT,             -- was: fall_fun
  activities_hiking TEXT,               -- was: hiking (CSV has hiking_activities_ — normalized)
  activities_wildlife_watching TEXT,    -- was: wildlife_watching
  activities_biking TEXT,               -- was: biking
  activities_canoeing_kayaking TEXT,    -- was: canoeing_kayaking
  activities_hunting TEXT,              -- NEW
  activities_golf TEXT,                 -- NEW
  activities_backpacking TEXT,          -- NEW
  activities_historic_sightseeing TEXT, -- NEW
  activities_scenic_drives TEXT,        -- NEW
  activities_stargazing TEXT,           -- NEW

  -- ── SETTINGS (setting_ group) ──────────────────────────────────────
  setting_ranch TEXT,                   -- was: ranch
  setting_beach TEXT,                   -- was: beach
  setting_coastal TEXT,                 -- was: coastal
  setting_suburban TEXT,                -- was: suburban
  setting_forest TEXT,                  -- was: forest
  setting_field TEXT,                   -- was: field
  setting_wetlands TEXT,                -- was: wetlands
  setting_hot_spring TEXT,              -- was: hot_spring
  setting_desert TEXT,                  -- was: desert
  setting_canyon TEXT,                  -- was: canyon
  setting_waterfall TEXT,               -- was: waterfall
  setting_swimming_hole TEXT,           -- was: swimming_hole
  setting_lake TEXT,                    -- was: lake
  setting_cave TEXT,                    -- was: cave
  setting_redwoods TEXT,                -- was: redwoods
  setting_farm TEXT,                    -- was: farm
  river_stream_or_creek TEXT,           -- kept as-is (no prefix)
  setting_mountainous TEXT,             -- was: mountainous

  -- ── SYSTEM METADATA ────────────────────────────────────────────────
  quality_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ── CONSTRAINTS ────────────────────────────────────────────────────
  CONSTRAINT all_glamping_properties_new_pkey PRIMARY KEY (id),
  CONSTRAINT research_status_valid_values CHECK (
    research_status IS NULL OR research_status IN ('new', 'in_progress', 'needs_review', 'published')
  ),
  CONSTRAINT unit_rates_by_year_is_object CHECK (
    unit_rates_by_year IS NULL OR jsonb_typeof(unit_rates_by_year) = 'object'
  )
) TABLESPACE pg_default;


-- Step 2: Copy all data from old table, mapping old column names to new
INSERT INTO "all_glamping_properties_new" (
  -- CORE IDENTITY
  id, property_name, site_name, slug, property_type,
  research_status, is_glamping_property, is_closed,
  -- SOURCE & TRACKING
  source, discovery_source, date_added, date_updated,
  -- LOCATION
  address, city, state, zip_code, country, lat, lon,
  -- OPERATIONAL
  property_total_sites, quantity_of_units, year_site_opened,
  operating_season_months, number_of_locations,
  -- UNIT DETAILS
  unit_type, unit_capacity, unit_sq_ft,
  unit_shower, unit_water, unit_electricity, unit_picnic_table,
  unit_wifi, unit_pets, unit_private_bathroom, unit_full_kitchen,
  unit_patio, unit_hot_tub_or_sauna,
  unit_hot_tub, unit_sauna, unit_cable, unit_rates_by_year,
  -- PRICING
  avg_retail_daily_rate,
  winter_weekday, winter_weekend, spring_weekday, spring_weekend,
  summer_weekday, summer_weekend, fall_weekday, fall_weekend,
  rate_category,
  -- PROPERTY AMENITIES
  property_laundry, property_playground, property_pool,
  property_food_on_site, property_sauna, property_hot_tub,
  property_restaurant, property_dog_park, property_clubhouse,
  property_alcohol_available, property_golf_cart_rental,
  property_waterpark, property_general_store, property_waterfront,
  -- CONTACT & INFO
  url, phone_number, description, minimum_nights,
  -- OTHER AMENITIES
  toilet, campfires, charcoal_grill,
  -- RV-SPECIFIC
  rv_vehicle_length, rv_parking, rv_accommodates_slideout,
  rv_surface_type, rv_surface_level,
  rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs,
  rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs,
  rv_vehicles_toy_hauler,
  rv_sewer_hook_up, rv_electrical_hook_up,
  rv_generators_allowed, rv_water_hookup,
  -- ACTIVITIES
  activities_fishing, activities_surfing, activities_horseback_riding,
  activities_paddling, activities_climbing, activities_off_roading_ohv,
  activities_boating, activities_swimming, activities_wind_sports,
  activities_snow_sports, activities_whitewater_paddling,
  activities_fall_fun, activities_hiking, activities_wildlife_watching,
  activities_biking, activities_canoeing_kayaking,
  -- SETTINGS
  setting_ranch, setting_beach, setting_coastal, setting_suburban,
  setting_forest, setting_field, setting_wetlands, setting_hot_spring,
  setting_desert, setting_canyon, setting_waterfall, setting_swimming_hole,
  setting_lake, setting_cave, setting_redwoods, setting_farm,
  river_stream_or_creek, setting_mountainous,
  -- SYSTEM METADATA
  quality_score, created_at, updated_at
)
SELECT
  -- CORE IDENTITY
  id, property_name, site_name, slug, property_type,
  research_status, is_glamping_property, is_closed,
  -- SOURCE & TRACKING
  source, discovery_source, date_added, date_updated,
  -- LOCATION
  address, city, state, zip_code, country, lat, lon,
  -- OPERATIONAL
  property_total_sites, quantity_of_units, year_site_opened,
  operating_season_months, number_of_locations,
  -- UNIT DETAILS (rename old → new)
  unit_type, unit_capacity, unit_sq_ft,
  shower,             -- → unit_shower
  water,              -- → unit_water
  electricity,        -- → unit_electricity
  picnic_table,       -- → unit_picnic_table
  wifi,               -- → unit_wifi
  pets,               -- → unit_pets
  private_bathroom,   -- → unit_private_bathroom
  kitchen,            -- → unit_full_kitchen
  patio,              -- → unit_patio
  hot_tub_or_sauna,   -- → unit_hot_tub_or_sauna
  unit_hot_tub::TEXT,  -- BOOLEAN → TEXT
  unit_sauna::TEXT,    -- BOOLEAN → TEXT
  cable,              -- → unit_cable
  unit_rates_by_year,
  -- PRICING
  avg_retail_daily_rate,
  winter_weekday, winter_weekend, spring_weekday, spring_weekend,
  summer_weekday, summer_weekend, fall_weekday, fall_weekend,
  rate_category,
  -- PROPERTY AMENITIES (rename old → new)
  laundry,           -- → property_laundry
  playground,        -- → property_playground
  pool,              -- → property_pool
  food_on_site,      -- → property_food_on_site
  property_sauna::TEXT,  -- BOOLEAN → TEXT
  property_hot_tub::TEXT, -- BOOLEAN → TEXT
  restaurant,        -- → property_restaurant
  dog_park,          -- → property_dog_park
  clubhouse,         -- → property_clubhouse
  alcohol_available, -- → property_alcohol_available
  golf_cart_rental,  -- → property_golf_cart_rental
  waterpark,         -- → property_waterpark
  general_store,     -- → property_general_store
  waterfront,        -- → property_waterfront
  -- CONTACT & INFO
  url, phone_number, description, minimum_nights,
  -- OTHER AMENITIES
  toilet, campfires, charcoal_grill,
  -- RV-SPECIFIC (rename old → new)
  rv_vehicle_length, rv_parking, rv_accommodates_slideout,
  rv_surface_type, rv_surface_level,
  rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs,
  rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs,
  rv_vehicles_toy_hauler,
  sewer_hook_up,     -- → rv_sewer_hook_up
  electrical_hook_up, -- → rv_electrical_hook_up
  generators_allowed, -- → rv_generators_allowed
  water_hookup,      -- → rv_water_hookup
  -- ACTIVITIES (rename old → new)
  fishing,           -- → activities_fishing
  surfing,           -- → activities_surfing
  horseback_riding,  -- → activities_horseback_riding
  paddling,          -- → activities_paddling
  climbing,          -- → activities_climbing
  off_roading_ohv,   -- → activities_off_roading_ohv
  boating,           -- → activities_boating
  swimming,          -- → activities_swimming
  wind_sports,       -- → activities_wind_sports
  snow_sports,       -- → activities_snow_sports
  whitewater_paddling, -- → activities_whitewater_paddling
  fall_fun,          -- → activities_fall_fun
  hiking,            -- → activities_hiking
  wildlife_watching, -- → activities_wildlife_watching
  biking,            -- → activities_biking
  canoeing_kayaking, -- → activities_canoeing_kayaking
  -- SETTINGS (rename old → new)
  ranch,             -- → setting_ranch
  beach,             -- → setting_beach
  coastal,           -- → setting_coastal
  suburban,          -- → setting_suburban
  forest,            -- → setting_forest
  field,             -- → setting_field
  wetlands,          -- → setting_wetlands
  hot_spring,        -- → setting_hot_spring
  desert,            -- → setting_desert
  canyon,            -- → setting_canyon
  waterfall,         -- → setting_waterfall
  swimming_hole,     -- → setting_swimming_hole
  lake,              -- → setting_lake
  cave,              -- → setting_cave
  redwoods,          -- → setting_redwoods
  farm,              -- → setting_farm
  river_stream_or_creek,
  mountainous,       -- → setting_mountainous
  -- SYSTEM METADATA
  quality_score, created_at, updated_at
FROM "all_glamping_properties";


-- Step 3: Reset the id sequence to max(id) + 1
SELECT setval(
  pg_get_serial_sequence('"all_glamping_properties_new"', 'id'),
  COALESCE((SELECT MAX(id) FROM "all_glamping_properties_new"), 0) + 1,
  false
);


-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_agp_property_name
  ON "all_glamping_properties_new" USING btree (property_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_agp_location
  ON "all_glamping_properties_new" USING btree (city, state) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_agp_coordinates
  ON "all_glamping_properties_new" USING btree (lat, lon) TABLESPACE pg_default
  WHERE lat IS NOT NULL AND lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_quality_score
  ON "all_glamping_properties_new" USING btree (quality_score) TABLESPACE pg_default
  WHERE quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_rate_category
  ON "all_glamping_properties_new" USING btree (rate_category) TABLESPACE pg_default
  WHERE rate_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_is_glamping_property
  ON "all_glamping_properties_new" USING btree (is_glamping_property) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_agp_is_closed
  ON "all_glamping_properties_new" USING btree (is_closed) TABLESPACE pg_default
  WHERE is_closed IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_unit_hot_tub
  ON "all_glamping_properties_new" USING btree (unit_hot_tub) TABLESPACE pg_default
  WHERE unit_hot_tub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_unit_sauna
  ON "all_glamping_properties_new" USING btree (unit_sauna) TABLESPACE pg_default
  WHERE unit_sauna IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_property_hot_tub
  ON "all_glamping_properties_new" USING btree (property_hot_tub) TABLESPACE pg_default
  WHERE property_hot_tub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_property_sauna
  ON "all_glamping_properties_new" USING btree (property_sauna) TABLESPACE pg_default
  WHERE property_sauna IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_slug
  ON "all_glamping_properties_new" USING btree (slug) TABLESPACE pg_default
  WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agp_research_status
  ON "all_glamping_properties_new" USING btree (research_status) TABLESPACE pg_default
  WHERE research_status IS NOT NULL;


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
    winter_weekday, winter_weekend, spring_weekday, spring_weekend,
    summer_weekday, summer_weekend, fall_weekday, fall_weekend
  ON "all_glamping_properties_new"
  FOR EACH ROW
  EXECUTE FUNCTION calc_avg_retail_daily_rate();

CREATE TRIGGER sync_season_rates_trigger
  BEFORE INSERT OR UPDATE OF unit_rates_by_year
  ON "all_glamping_properties_new"
  FOR EACH ROW
  EXECUTE FUNCTION sync_season_rates_from_latest_year();


-- Step 6: Drop old table and rename new one
DROP TABLE "all_glamping_properties" CASCADE;
ALTER TABLE "all_glamping_properties_new" RENAME TO "all_glamping_properties";
ALTER TABLE "all_glamping_properties"
  RENAME CONSTRAINT all_glamping_properties_new_pkey TO sage_updated_pkey;


-- Step 7: Recreate foreign key from google_places_data
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


-- Step 8: Re-enable RLS (it's dropped with CASCADE)
ALTER TABLE "all_glamping_properties" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON "all_glamping_properties"
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated full access"
  ON "all_glamping_properties"
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access"
  ON "all_glamping_properties"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
