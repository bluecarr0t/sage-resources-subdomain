-- Create all_roverpass_data table as a duplicate of all_glamping_properties
-- RoverPass data is stored in this separate table (not in all_glamping_properties)
-- RoverPass Site Data id maps to id (primary key)

CREATE TABLE public.all_roverpass_data (
  id bigserial NOT NULL,
  research_status text NULL DEFAULT 'new'::text,
  is_glamping_property text NOT NULL DEFAULT 'No'::text,
  is_closed text NOT NULL DEFAULT 'No'::text,
  property_name text NULL,
  slug text NULL,
  property_type text NULL,
  site_name text NULL,
  unit_type text NULL,
  source text NULL DEFAULT 'RoverPass'::text,
  discovery_source text NULL DEFAULT 'RoverPass'::text,
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
  unit_capacity text NULL,
  unit_sq_ft numeric NULL,
  year_site_opened numeric NULL,
  operating_season_months text NULL,
  number_of_locations numeric NULL,
  avg_retail_daily_rate numeric NULL,
  winter_weekday numeric NULL,
  winter_weekend numeric NULL,
  spring_weekday numeric NULL,
  spring_weekend numeric NULL,
  summer_weekday numeric NULL,
  summer_weekend numeric NULL,
  fall_weekday numeric NULL,
  fall_weekend numeric NULL,
  rate_category text NULL,
  unit_rates_by_year jsonb NULL,
  url text NULL,
  phone_number text NULL,
  description text NULL,
  getting_there text NULL,
  minimum_nights text NULL,
  toilet text NULL,
  shower text NULL,
  water text NULL,
  trash text NULL,
  cooking_equipment text NULL,
  picnic_table text NULL,
  wifi text NULL,
  laundry text NULL,
  campfires text NULL,
  playground text NULL,
  pool text NULL,
  pets text NULL,
  private_bathroom text NULL,
  kitchen text NULL,
  patio text NULL,
  electricity text NULL,
  hot_tub_or_sauna text NULL,
  unit_hot_tub boolean NULL,
  unit_sauna boolean NULL,
  property_hot_tub boolean NULL,
  property_sauna boolean NULL,
  food_on_site text NULL,
  restaurant text NULL,
  dog_park text NULL,
  clubhouse text NULL,
  alcohol_available text NULL,
  golf_cart_rental text NULL,
  waterpark text NULL,
  general_store text NULL,
  cable text NULL,
  charcoal_grill text NULL,
  waterfront text NULL,
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
  sewer_hook_up text NULL,
  electrical_hook_up text NULL,
  generators_allowed text NULL,
  water_hookup text NULL,
  fishing text NULL,
  surfing text NULL,
  horseback_riding text NULL,
  paddling text NULL,
  climbing text NULL,
  off_roading_ohv text NULL,
  boating text NULL,
  swimming text NULL,
  wind_sports text NULL,
  snow_sports text NULL,
  whitewater_paddling text NULL,
  fall_fun text NULL,
  hiking text NULL,
  wildlife_watching text NULL,
  biking text NULL,
  canoeing_kayaking text NULL,
  ranch text NULL,
  beach text NULL,
  coastal text NULL,
  suburban text NULL,
  forest text NULL,
  field text NULL,
  wetlands text NULL,
  hot_spring text NULL,
  desert text NULL,
  canyon text NULL,
  waterfall text NULL,
  swimming_hole text NULL,
  lake text NULL,
  cave text NULL,
  redwoods text NULL,
  farm text NULL,
  river_stream_or_creek text NULL,
  mountainous text NULL,
  quality_score integer NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  -- RoverPass-specific columns
  roverpass_campground_id bigint NULL,
  roverpass_occupancy_rate numeric NULL,
  roverpass_occupancy_year numeric NULL,
  amenities_raw text NULL,
  activities_raw text NULL,
  lifestyle_raw text NULL,
  extended_stay text NULL,
  family_friendly text NULL,
  remote_work_friendly text NULL,
  fitness_room text NULL,
  propane_refilling_station text NULL,
  hunting text NULL,
  golf text NULL,
  backpacking text NULL,
  historic_sightseeing text NULL,
  scenic_drives text NULL,
  stargazing text NULL,
  CONSTRAINT all_roverpass_data_pkey PRIMARY KEY (id),
  CONSTRAINT all_roverpass_data_research_status_valid CHECK (
    (research_status IS NULL)
    OR (research_status = ANY (ARRAY['new'::text, 'in_progress'::text, 'needs_review'::text, 'published'::text, 'do_not_include'::text]))
  ),
  CONSTRAINT all_roverpass_data_unit_rates_by_year_is_object CHECK (
    (unit_rates_by_year IS NULL)
    OR (jsonb_typeof(unit_rates_by_year) = 'object'::text)
  )
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_property_name
  ON public.all_roverpass_data USING btree (property_name) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_location
  ON public.all_roverpass_data USING btree (city, state) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_coordinates
  ON public.all_roverpass_data USING btree (lat, lon) TABLESPACE pg_default
  WHERE (lat IS NOT NULL AND lon IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_quality_score
  ON public.all_roverpass_data USING btree (quality_score) TABLESPACE pg_default
  WHERE quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_rate_category
  ON public.all_roverpass_data USING btree (rate_category) TABLESPACE pg_default
  WHERE rate_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_is_glamping_property
  ON public.all_roverpass_data USING btree (is_glamping_property) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_is_closed
  ON public.all_roverpass_data USING btree (is_closed) TABLESPACE pg_default
  WHERE is_closed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_unit_hot_tub
  ON public.all_roverpass_data USING btree (unit_hot_tub) TABLESPACE pg_default
  WHERE unit_hot_tub IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_unit_sauna
  ON public.all_roverpass_data USING btree (unit_sauna) TABLESPACE pg_default
  WHERE unit_sauna IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_property_hot_tub
  ON public.all_roverpass_data USING btree (property_hot_tub) TABLESPACE pg_default
  WHERE property_hot_tub IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_property_sauna
  ON public.all_roverpass_data USING btree (property_sauna) TABLESPACE pg_default
  WHERE property_sauna IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_roverpass_data_roverpass_campground_id
  ON public.all_roverpass_data USING btree (roverpass_campground_id) TABLESPACE pg_default
  WHERE roverpass_campground_id IS NOT NULL;

-- Triggers (reuse existing functions if they exist)
CREATE TRIGGER calc_avg_rate_trigger
  BEFORE INSERT OR UPDATE OF winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, fall_weekday, fall_weekend
  ON public.all_roverpass_data
  FOR EACH ROW
  EXECUTE FUNCTION calc_avg_retail_daily_rate();

CREATE TRIGGER set_slug_before_insert
  BEFORE INSERT ON public.all_roverpass_data
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_from_property_name();

CREATE TRIGGER set_slug_before_update
  BEFORE UPDATE ON public.all_roverpass_data
  FOR EACH ROW
  WHEN (
    new.property_name IS DISTINCT FROM old.property_name
    OR (new.slug IS NULL AND old.slug IS NOT NULL)
  )
  EXECUTE FUNCTION generate_slug_from_property_name();

CREATE TRIGGER sync_season_rates_trigger
  BEFORE INSERT OR UPDATE OF unit_rates_by_year
  ON public.all_roverpass_data
  FOR EACH ROW
  EXECUTE FUNCTION sync_season_rates_from_latest_year();
