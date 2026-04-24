-- Create all_roverpass_data_new with all_glamping_properties schema and copy data from all_roverpass_data
-- Maps old RoverPass column names to the unified schema (unit_*, property_*, rate_*, rv_*, activities_*, setting_*)
-- Enables both all_roverpass_data_new and all_glamping_properties to use the same Web UI upload feature

BEGIN;

-- Step 1: Create all_roverpass_data_new with exact all_glamping_properties schema
CREATE TABLE public.all_roverpass_data_new (
  id bigserial NOT NULL,
  research_status text NULL DEFAULT 'new'::text,
  is_glamping_property text NOT NULL DEFAULT 'Yes'::text,
  is_closed text NOT NULL DEFAULT 'No'::text,
  property_name text NULL,
  site_name text NULL,
  slug text NULL,
  property_type text NULL,
  source text NULL,
  discovery_source text NULL,
  date_added text NULL,
  date_updated text NULL,
  address text NULL,
  city text NULL,
  state text NULL,
  zip_code text NULL,
  country text NULL,
  lat numeric NULL,
  lon numeric NULL,
  property_total_sites numeric NULL,
  quantity_of_units numeric NULL,
  year_site_opened numeric NULL,
  operating_season_months text NULL,
  number_of_locations numeric NULL,
  unit_type text NULL,
  unit_capacity text NULL,
  unit_sq_ft numeric NULL,
  unit_description text NULL,
  unit_bed text NULL,
  unit_shower text NULL,
  unit_water text NULL,
  unit_electricity text NULL,
  unit_picnic_table text NULL,
  unit_wifi text NULL,
  unit_pets text NULL,
  unit_private_bathroom text NULL,
  unit_full_kitchen text NULL,
  unit_kitchenette text NULL,
  unit_ada_accessibility text NULL,
  unit_patio text NULL,
  unit_air_conditioning text NULL,
  unit_gas_fireplace text NULL,
  unit_hot_tub_or_sauna text NULL,
  unit_hot_tub text NULL,
  unit_sauna text NULL,
  unit_cable text NULL,
  unit_campfires text NULL,
  unit_charcoal_grill text NULL,
  unit_mini_fridge text NULL,
  unit_bathtub text NULL,
  unit_wood_burning_stove text NULL,
  rate_unit_rates_by_year jsonb NULL,
  rate_avg_retail_daily_rate numeric NULL,
  rate_winter_weekday numeric NULL,
  rate_winter_weekend numeric NULL,
  rate_spring_weekday numeric NULL,
  rate_spring_weekend numeric NULL,
  rate_summer_weekday numeric NULL,
  rate_summer_weekend numeric NULL,
  rate_fall_weekday numeric NULL,
  rate_fall_weekend numeric NULL,
  rate_category text NULL,
  property_laundry text NULL,
  property_playground text NULL,
  property_pool text NULL,
  property_food_on_site text NULL,
  property_sauna text NULL,
  property_hot_tub text NULL,
  property_restaurant text NULL,
  property_dog_park text NULL,
  property_clubhouse text NULL,
  property_alcohol_available text NULL,
  property_golf_cart_rental text NULL,
  property_waterpark text NULL,
  property_general_store text NULL,
  property_waterfront text NULL,
  property_extended_stay text NULL,
  property_family_friendly text NULL,
  property_remote_work_friendly text NULL,
  property_fitness_room text NULL,
  property_propane_refilling_station text NULL,
  property_pickball_courts text NULL,
  url text NULL,
  phone_number text NULL,
  description text NULL,
  minimum_nights text NULL,
  rv_vehicle_length text NULL,
  rv_parking text NULL,
  rv_accommodates_slideout text NULL,
  rv_surface_type text NULL,
  rv_surface_level text NULL,
  rv_vehicles_fifth_wheels text NULL,
  rv_vehicles_class_a_rvs text NULL,
  rv_vehicles_class_b_rvs text NULL,
  rv_vehicles_class_c_rvs text NULL,
  rv_vehicles_toy_hauler text NULL,
  rv_sewer_hook_up text NULL,
  rv_electrical_hook_up text NULL,
  rv_generators_allowed text NULL,
  rv_water_hookup text NULL,
  activities_fishing text NULL,
  activities_surfing text NULL,
  activities_horseback_riding text NULL,
  activities_paddling text NULL,
  activities_climbing text NULL,
  activities_off_roading_ohv text NULL,
  activities_boating text NULL,
  activities_swimming text NULL,
  activities_wind_sports text NULL,
  activities_snow_sports text NULL,
  activities_whitewater_paddling text NULL,
  activities_fall_fun text NULL,
  activities_hiking text NULL,
  activities_wildlife_watching text NULL,
  activities_biking text NULL,
  activities_canoeing_kayaking text NULL,
  activities_hunting text NULL,
  activities_golf text NULL,
  activities_backpacking text NULL,
  activities_historic_sightseeing text NULL,
  activities_scenic_drives text NULL,
  activities_stargazing text NULL,
  setting_ranch text NULL,
  setting_beach text NULL,
  setting_coastal text NULL,
  setting_suburban text NULL,
  setting_forest text NULL,
  setting_field text NULL,
  setting_wetlands text NULL,
  setting_hot_spring text NULL,
  setting_desert text NULL,
  setting_canyon text NULL,
  setting_waterfall text NULL,
  setting_swimming_hole text NULL,
  setting_lake text NULL,
  setting_cave text NULL,
  setting_redwoods text NULL,
  setting_farm text NULL,
  river_stream_or_creek text NULL,
  setting_mountainous text NULL,
  quality_score numeric NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  roverpass_campground_id text NULL,
  roverpass_occupancy_rate numeric NULL,
  roverpass_occupancy_year numeric NULL,
  amenities_raw text NULL,
  activities_raw text NULL,
  lifestyle_raw text NULL,
  CONSTRAINT all_roverpass_data_new_pkey PRIMARY KEY (id),
  CONSTRAINT all_roverpass_data_new_id_namespace_chk CHECK (id >= 1000000000)
) TABLESPACE pg_default;

-- Step 2: Copy data from all_roverpass_data with column mapping (old schema → unified schema)
INSERT INTO public.all_roverpass_data_new (
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
  quality_score, created_at, updated_at,
  roverpass_campground_id, roverpass_occupancy_rate, roverpass_occupancy_year,
  amenities_raw, activities_raw, lifestyle_raw
)
SELECT
  CASE WHEN r.id < 1000000000 THEN r.id + 1000000000 ELSE r.id END,
  r.research_status, r.is_glamping_property, r.is_closed,
  r.property_name, r.site_name, r.slug, r.property_type,
  r.source, r.discovery_source, r.date_added, r.date_updated,
  r.address, r.city, r.state, r.zip_code, r.country, r.lat, r.lon,
  r.property_total_sites, r.quantity_of_units, r.year_site_opened, r.operating_season_months, r.number_of_locations,
  r.unit_type, r.unit_capacity, r.unit_sq_ft, NULL, NULL,
  r.shower, r.water, r.electricity, r.picnic_table, r.wifi, r.pets,
  r.private_bathroom, r.kitchen, NULL, NULL, r.patio,
  NULL, NULL, r.hot_tub_or_sauna,
  CASE WHEN r.unit_hot_tub = true THEN 'Yes' WHEN r.unit_hot_tub = false THEN 'No' ELSE NULL END,
  CASE WHEN r.unit_sauna = true THEN 'Yes' WHEN r.unit_sauna = false THEN 'No' ELSE NULL END,
  r.cable, r.campfires, r.charcoal_grill, NULL, NULL, NULL,
  r.unit_rates_by_year, r.avg_retail_daily_rate, r.winter_weekday, r.winter_weekend,
  r.spring_weekday, r.spring_weekend, r.summer_weekday, r.summer_weekend,
  r.fall_weekday, r.fall_weekend, r.rate_category,
  r.laundry, r.playground, r.pool, r.food_on_site,
  CASE WHEN r.property_sauna = true THEN 'Yes' WHEN r.property_sauna = false THEN 'No' ELSE NULL END,
  CASE WHEN r.property_hot_tub = true THEN 'Yes' WHEN r.property_hot_tub = false THEN 'No' ELSE NULL END,
  r.restaurant, r.dog_park, r.clubhouse, r.alcohol_available, r.golf_cart_rental,
  r.waterpark, r.general_store, r.waterfront, r.extended_stay, r.family_friendly,
  r.remote_work_friendly, r.fitness_room, r.propane_refilling_station, NULL,
  r.url, r.phone_number, r.description, r.minimum_nights,
  r.rv_vehicle_length, r.rv_parking, r.rv_accommodates_slideout, r.rv_surface_type, r.rv_surface_level,
  r.rv_vehicles_fifth_wheels, r.rv_vehicles_class_a_rvs, r.rv_vehicles_class_b_rvs, r.rv_vehicles_class_c_rvs, r.rv_vehicles_toy_hauler,
  r.sewer_hook_up, r.electrical_hook_up, r.generators_allowed, r.water_hookup,
  r.fishing, r.surfing, r.horseback_riding, r.paddling, r.climbing,
  r.off_roading_ohv, r.boating, r.swimming, r.wind_sports, r.snow_sports,
  r.whitewater_paddling, r.fall_fun, r.hiking, r.wildlife_watching, r.biking,
  r.canoeing_kayaking, r.hunting, r.golf, r.backpacking, r.historic_sightseeing,
  r.scenic_drives, r.stargazing,
  r.ranch, r.beach, r.coastal, r.suburban, r.forest, r.field, r.wetlands,
  r.hot_spring, r.desert, r.canyon, r.waterfall, r.swimming_hole, r.lake,
  r.cave, r.redwoods, r.farm, r.river_stream_or_creek, r.mountainous,
  r.quality_score::numeric, r.created_at, r.updated_at,
  r.roverpass_campground_id::text, r.roverpass_occupancy_rate, r.roverpass_occupancy_year,
  r.amenities_raw, r.activities_raw, r.lifestyle_raw
FROM public.all_roverpass_data r;

-- Step 3: Create indexes (matching all_glamping_properties)
CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_property_name
  ON public.all_roverpass_data_new USING btree (property_name) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_location
  ON public.all_roverpass_data_new USING btree (city, state) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_coordinates
  ON public.all_roverpass_data_new USING btree (lat, lon) TABLESPACE pg_default
  WHERE (lat IS NOT NULL AND lon IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_quality_score
  ON public.all_roverpass_data_new USING btree (quality_score) TABLESPACE pg_default
  WHERE quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_rate_category
  ON public.all_roverpass_data_new USING btree (rate_category) TABLESPACE pg_default
  WHERE rate_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_is_glamping
  ON public.all_roverpass_data_new USING btree (is_glamping_property) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_is_closed
  ON public.all_roverpass_data_new USING btree (is_closed) TABLESPACE pg_default
  WHERE is_closed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_new_roverpass_campground_id
  ON public.all_roverpass_data_new USING btree (roverpass_campground_id) TABLESPACE pg_default
  WHERE roverpass_campground_id IS NOT NULL;

-- Step 4: Create triggers (reuse existing functions)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_slug_from_property_name') THEN
    CREATE TRIGGER set_slug_before_insert
      BEFORE INSERT ON public.all_roverpass_data_new
      FOR EACH ROW
      EXECUTE FUNCTION generate_slug_from_property_name();

    CREATE TRIGGER set_slug_before_update
      BEFORE UPDATE ON public.all_roverpass_data_new
      FOR EACH ROW
      WHEN (
        new.property_name IS DISTINCT FROM old.property_name
        OR (new.slug IS NULL AND old.slug IS NOT NULL)
      )
      EXECUTE FUNCTION generate_slug_from_property_name();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calc_avg_retail_daily_rate') THEN
    CREATE TRIGGER calc_avg_rate_trigger
      BEFORE INSERT OR UPDATE OF rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
        rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend
      ON public.all_roverpass_data_new
      FOR EACH ROW
      EXECUTE FUNCTION calc_avg_retail_daily_rate();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_season_rates_from_latest_year') THEN
    CREATE TRIGGER sync_season_rates_trigger
      BEFORE INSERT OR UPDATE OF rate_unit_rates_by_year
      ON public.all_roverpass_data_new
      FOR EACH ROW
      EXECUTE FUNCTION sync_season_rates_from_latest_year();
  END IF;
END $$;

-- Step 5: Reset sequence so future inserts get correct IDs
SELECT setval(
  pg_get_serial_sequence('public.all_roverpass_data_new', 'id'),
  GREATEST(
    COALESCE((SELECT MAX(id) FROM public.all_roverpass_data_new), 1000000000),
    1000000000
  )
);

COMMIT;
