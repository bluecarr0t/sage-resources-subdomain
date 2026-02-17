-- Reorder columns in all_glamping_properties table for optimal viewing and exporting
-- Run this SQL in your Supabase SQL Editor
-- This migration recreates the table with columns in a logical, prioritized order

BEGIN;

-- Step 1: Create a new table with columns in optimal order
CREATE TABLE "all_glamping_properties_new" (
  -- PRIMARY IDENTIFIERS (Most important - always visible)
  id BIGSERIAL NOT NULL,
  property_name TEXT,
  slug TEXT,
  
  -- SOURCE & TRACKING (Data provenance)
  duplicatenote TEXT,
  source TEXT,
  discovery_source TEXT,
  date_added TEXT,
  date_updated TEXT,
  
  -- BASIC PROPERTY INFO
  property_type TEXT,
  site_name TEXT,
  unit_type TEXT,
  
  -- CAPACITY & OPERATIONAL INFO
  property_total_sites NUMERIC,
  quantity_of_units NUMERIC,
  unit_capacity TEXT,
  year_site_opened NUMERIC,
  operating_season_months TEXT,
  number_of_locations NUMERIC,
  operating_season__excel_format_ TEXT,
  
  -- LOCATION (Complete address info together)
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  lat NUMERIC,
  lon NUMERIC,
  
  -- PRICING 2025
  avg_retail_daily_rate_2025 NUMERIC,
  
  -- SEASONAL RATES (Grouped by season)
  winter_weekday NUMERIC,
  winter_weekend NUMERIC,
  spring_weekday NUMERIC,
  spring_weekend NUMERIC,
  summer_weekday NUMERIC,
  summer_weekend NUMERIC,
  fall_weekday NUMERIC,
  fall_weekend NUMERIC,
  
  -- CONTACT & INFORMATION
  url TEXT,
  description TEXT,
  minimum_nights TEXT,
  getting_there TEXT,
  phone_number TEXT,
  
  -- BASIC AMENITIES (Essential facilities)
  toilet TEXT,
  shower TEXT,
  water TEXT,
  trash TEXT,
  cooking_equipment TEXT,
  picnic_table TEXT,
  wifi TEXT,
  laundry TEXT,
  campfires TEXT,
  playground TEXT,
  pool TEXT,
  pets TEXT,
  
  -- HOT TUB & SAUNA (Grouped together)
  hot_tub_or_sauna TEXT,
  unit_hot_tub BOOLEAN,
  unit_sauna BOOLEAN,
  property_hot_tub BOOLEAN,
  property_sauna BOOLEAN,
  
  -- RV-SPECIFIC FEATURES (All RV columns together)
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
  
  -- ACTIVITIES (Outdoor activities grouped)
  fishing TEXT,
  surfing TEXT,
  horseback_riding TEXT,
  paddling TEXT,
  climbing TEXT,
  off_roading__ohv_ TEXT,
  boating TEXT,
  swimming TEXT,
  wind_sports TEXT,
  snow_sports TEXT,
  whitewater_paddling TEXT,
  fall_fun TEXT,
  hiking TEXT,
  wildlife_watching TEXT,
  biking TEXT,
  canoeing_kayaking TEXT,
  
  -- LOCATION FEATURES (Natural/geographic features)
  ranch TEXT,
  beach TEXT,
  coastal TEXT,
  suburban TEXT,
  forest TEXT,
  field TEXT,
  wetlands TEXT,
  hot_spring TEXT,
  desert TEXT,
  canyon TEXT,
  waterfall TEXT,
  swimming_hole TEXT,
  lake TEXT,
  cave TEXT,
  redwoods TEXT,
  farm TEXT,
  river__stream__or_creek TEXT,
  mountainous TEXT,
  waterfront TEXT,
  
  -- ADDITIONAL AMENITIES (Property-level amenities)
  sage___p__amenity__food_on_site TEXT,
  restaurant TEXT,
  dog_park TEXT,
  clubhouse TEXT,
  alcohol_available TEXT,
  golf_cart_rental TEXT,
  private_bathroom TEXT,
  waterpark TEXT,
  kitchen TEXT,
  patio TEXT,
  electricity TEXT,
  general_store TEXT,
  cable TEXT,
  charcoal_grill TEXT,
  sewer_hook_up TEXT,
  electrical_hook_up TEXT,
  generators_allowed TEXT,
  water_hookup TEXT,
  
  -- METADATA & QUALITY (System fields at the end)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rate_category TEXT,
  quality_score INTEGER,
  is_glamping_property TEXT NOT NULL DEFAULT 'Yes'::text,
  is_closed TEXT NOT NULL DEFAULT 'No'::text,
  
  CONSTRAINT all_glamping_properties_new_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Step 2: Copy all data from old table to new table
INSERT INTO "all_glamping_properties_new" (
  id, property_name, slug,
  duplicatenote, source, discovery_source, date_added, date_updated,
  property_type, site_name, unit_type,
  property_total_sites, quantity_of_units, unit_capacity, year_site_opened, operating_season_months, number_of_locations, operating_season__excel_format_,
  address, city, state, zip_code, country, lat, lon,
  avg_retail_daily_rate_2025,
  winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, fall_weekday, fall_weekend,
  url, description, minimum_nights, getting_there, phone_number,
  toilet, shower, water, trash, cooking_equipment, picnic_table, wifi, laundry, campfires, playground, pool, pets,
  hot_tub_or_sauna, unit_hot_tub, unit_sauna, property_hot_tub, property_sauna,
  rv_vehicle_length, rv_parking, rv_accommodates_slideout, rv_surface_type, rv_surface_level, rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs, rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs, rv_vehicles_toy_hauler,
  fishing, surfing, horseback_riding, paddling, climbing, off_roading__ohv_, boating, swimming, wind_sports, snow_sports, whitewater_paddling, fall_fun, hiking, wildlife_watching, biking, canoeing_kayaking,
  ranch, beach, coastal, suburban, forest, field, wetlands, hot_spring, desert, canyon, waterfall, swimming_hole, lake, cave, redwoods, farm, river__stream__or_creek, mountainous, waterfront,
  sage___p__amenity__food_on_site, restaurant, dog_park, clubhouse, alcohol_available, golf_cart_rental, private_bathroom, waterpark, kitchen, patio, electricity, general_store, cable, charcoal_grill, sewer_hook_up, electrical_hook_up, generators_allowed, water_hookup,
  created_at, updated_at, rate_category, quality_score, is_glamping_property, is_closed
)
SELECT 
  id, property_name, slug,
  duplicatenote, source, discovery_source, date_added, date_updated,
  property_type, site_name, unit_type,
  property_total_sites, quantity_of_units, unit_capacity, year_site_opened, operating_season_months, number_of_locations, operating_season__excel_format_,
  address, city, state, zip_code, country, lat, lon,
  avg_retail_daily_rate_2025,
  winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, fall_weekday, fall_weekend,
  url, description, minimum_nights, getting_there, phone_number,
  toilet, shower, water, trash, cooking_equipment, picnic_table, wifi, laundry, campfires, playground, pool, pets,
  hot_tub_or_sauna, unit_hot_tub, unit_sauna, property_hot_tub, property_sauna,
  rv_vehicle_length, rv_parking, rv_accommodates_slideout, rv_surface_type, rv_surface_level, rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs, rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs, rv_vehicles_toy_hauler,
  fishing, surfing, horseback_riding, paddling, climbing, off_roading__ohv_, boating, swimming, wind_sports, snow_sports, whitewater_paddling, fall_fun, hiking, wildlife_watching, biking, canoeing_kayaking,
  ranch, beach, coastal, suburban, forest, field, wetlands, hot_spring, desert, canyon, waterfall, swimming_hole, lake, cave, redwoods, farm, river__stream__or_creek, mountainous, waterfront,
  sage___p__amenity__food_on_site, restaurant, dog_park, clubhouse, alcohol_available, golf_cart_rental, private_bathroom, waterpark, kitchen, patio, electricity, general_store, cable, charcoal_grill, sewer_hook_up, electrical_hook_up, generators_allowed, water_hookup,
  created_at, updated_at, rate_category, quality_score, is_glamping_property, is_closed
FROM "all_glamping_properties";

-- Step 3: Recreate all indexes on the new table
CREATE INDEX IF NOT EXISTS idx_sage_updated_property_name ON "all_glamping_properties_new" USING btree (property_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sage_updated_location ON "all_glamping_properties_new" USING btree (city, state) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_sage_updated_coordinates ON "all_glamping_properties_new" USING btree (lat, lon) TABLESPACE pg_default WHERE ((lat IS NOT NULL) AND (lon IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_quality_score ON "all_glamping_properties_new" USING btree (quality_score) TABLESPACE pg_default WHERE (quality_score IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_rate_category ON "all_glamping_properties_new" USING btree (rate_category) TABLESPACE pg_default WHERE (rate_category IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_is_glamping_property ON "all_glamping_properties_new" USING btree (is_glamping_property) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_is_closed ON "all_glamping_properties_new" USING btree (is_closed) TABLESPACE pg_default WHERE (is_closed IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_unit_hot_tub ON "all_glamping_properties_new" USING btree (unit_hot_tub) TABLESPACE pg_default WHERE (unit_hot_tub IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_unit_suana ON "all_glamping_properties_new" USING btree (unit_sauna) TABLESPACE pg_default WHERE (unit_sauna IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_property_hot_tub ON "all_glamping_properties_new" USING btree (property_hot_tub) TABLESPACE pg_default WHERE (property_hot_tub IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_property_suana ON "all_glamping_properties_new" USING btree (property_sauna) TABLESPACE pg_default WHERE (property_sauna IS NOT NULL);

-- Step 4: Recreate triggers
CREATE TRIGGER set_slug_before_insert BEFORE INSERT ON "all_glamping_properties_new" FOR EACH ROW EXECUTE FUNCTION generate_slug_from_property_name();
CREATE TRIGGER set_slug_before_update BEFORE UPDATE ON "all_glamping_properties_new" FOR EACH ROW WHEN ((new.property_name IS DISTINCT FROM old.property_name) OR ((new.slug IS NULL) AND (old.slug IS NOT NULL))) EXECUTE FUNCTION generate_slug_from_property_name();

-- Step 5: Drop old table and rename new table
DROP TABLE "all_glamping_properties" CASCADE;
ALTER TABLE "all_glamping_properties_new" RENAME TO "all_glamping_properties";

-- Rename the constraint to match the original name
ALTER TABLE "all_glamping_properties" RENAME CONSTRAINT all_glamping_properties_new_pkey TO sage_updated_pkey;

-- Step 6: Recreate foreign key constraint from google_places_data (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_places_data') THEN
    -- Drop and recreate the foreign key constraint
    ALTER TABLE "google_places_data" 
    DROP CONSTRAINT IF EXISTS google_places_data_property_id_fkey;
    
    ALTER TABLE "google_places_data"
    ADD CONSTRAINT google_places_data_property_id_fkey 
    FOREIGN KEY (property_id) REFERENCES "all_glamping_properties"(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
