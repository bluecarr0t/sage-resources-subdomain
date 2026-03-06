-- Create the glamping_resorts table for AI-researched glamping property data (USA & Canada)
-- Designed for the Tavily + Firecrawl -> GPT-4.1 -> Validation -> Supabase pipeline
--
-- Contains all columns from all_glamping_properties plus ~40 new columns for
-- pipeline metadata, booking presence, expanded amenities, guest experience, and market data.
--
-- Prerequisites: The following trigger functions must already exist in the database:
--   - calc_avg_retail_daily_rate()
--   - generate_slug_from_property_name()
--   - sync_season_rates_from_latest_year()
--
-- Run this SQL in your Supabase SQL Editor before running the research pipeline.

CREATE TABLE IF NOT EXISTS glamping_resorts (
  id BIGSERIAL PRIMARY KEY,

  -- ── Identity & pipeline metadata ────────────────────────────────
  research_status TEXT DEFAULT 'new',
  is_glamping_property TEXT NOT NULL DEFAULT 'Yes',
  is_closed TEXT NOT NULL DEFAULT 'No',
  property_name TEXT,
  site_name TEXT,
  slug TEXT,
  property_type TEXT,
  source TEXT,
  discovery_source TEXT,
  date_added TEXT,
  date_updated TEXT,
  alternate_names TEXT,
  brand_or_chain TEXT,
  ownership_type TEXT,
  management_company TEXT,
  data_source_url TEXT,
  data_source_urls JSONB,
  data_confidence_score TEXT,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  enrichment_pass INTEGER DEFAULT 0,
  raw_scraped_json TEXT,

  -- ── Location ────────────────────────────────────────────────────
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  lat NUMERIC,
  lon NUMERIC,
  nearest_airport_code TEXT,
  nearest_airport_miles TEXT,
  nearest_major_city TEXT,
  drive_time_from_nearest_city TEXT,

  -- ── Property stats ──────────────────────────────────────────────
  property_total_sites NUMERIC,
  quantity_of_units NUMERIC,
  year_site_opened NUMERIC,
  operating_season_months TEXT,
  number_of_locations NUMERIC,
  quality_score NUMERIC,
  market_tier TEXT,

  -- ── Unit details ────────────────────────────────────────────────
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
  unit_heating TEXT,
  unit_outdoor_shower TEXT,
  unit_deck_or_porch TEXT,
  unit_stargazing_feature TEXT,
  unit_private_fire_pit TEXT,
  unit_bbq_grill TEXT,
  unit_coffee_maker TEXT,
  unit_linens_provided TEXT,
  unit_towels_provided TEXT,
  unit_outdoor_seating TEXT,
  unit_tv TEXT,

  -- ── Rates ───────────────────────────────────────────────────────
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

  -- ── Property amenities ──────────────────────────────────────────
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
  property_age_restricted_55_plus TEXT,
  property_has_rentals TEXT,
  property_lgbtiq_friendly TEXT,
  property_gasoline_nearby TEXT,
  property_basketball TEXT,
  property_volleyball TEXT,
  property_jet_skiing TEXT,
  property_mobile_home_community TEXT,
  property_tennis TEXT,
  property_spa TEXT,
  property_yoga TEXT,
  property_event_space TEXT,
  property_wedding_venue TEXT,
  property_farm_to_table TEXT,
  property_guided_tours TEXT,
  property_bike_rental TEXT,
  property_kayak_canoe_rental TEXT,
  property_nature_trails TEXT,
  property_communal_fire_pit TEXT,
  property_ev_charging TEXT,

  -- ── Booking & online presence ───────────────────────────────────
  url TEXT,
  booking_url TEXT,
  hipcamp_url TEXT,
  airbnb_url TEXT,
  glamping_hub_url TEXT,
  booking_com_url TEXT,
  tripadvisor_url TEXT,
  google_maps_url TEXT,
  phone_number TEXT,
  instagram_handle TEXT,
  facebook_url TEXT,
  google_reviews_rating TEXT,
  google_reviews_count TEXT,
  tripadvisor_rating TEXT,
  tripadvisor_review_count TEXT,

  -- ── Guest experience ────────────────────────────────────────────
  description TEXT,
  minimum_nights TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  check_in_type TEXT,
  cancellation_policy TEXT,
  max_group_size TEXT,

  -- ── RV fields (carried over for mixed-use properties) ──────────
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

  -- ── Activities ──────────────────────────────────────────────────
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

  -- ── Setting ─────────────────────────────────────────────────────
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

  -- ── Raw / RoverPass linkage ─────────────────────────────────────
  roverpass_campground_id TEXT,
  roverpass_occupancy_rate NUMERIC,
  roverpass_occupancy_year NUMERIC,
  amenities_raw TEXT,
  activities_raw TEXT,
  lifestyle_raw TEXT,

  -- ── Timestamps ──────────────────────────────────────────────────
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE glamping_resorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON glamping_resorts
  FOR SELECT
  USING (true);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_name ON glamping_resorts (property_name);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_slug ON glamping_resorts (slug);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_state ON glamping_resorts (state);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_country ON glamping_resorts (country);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_location ON glamping_resorts (city, state);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_coordinates ON glamping_resorts (lat, lon)
  WHERE lat IS NOT NULL AND lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_brand ON glamping_resorts (brand_or_chain);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_market_tier ON glamping_resorts (market_tier);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_unit_type ON glamping_resorts (unit_type);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_research_status ON glamping_resorts (research_status);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_last_scraped ON glamping_resorts (last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_glamping_resorts_confidence ON glamping_resorts (data_confidence_score);

CREATE INDEX IF NOT EXISTS idx_glamping_resorts_search ON glamping_resorts
  USING gin(to_tsvector('english',
    coalesce(property_name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(state, '') || ' ' ||
    coalesce(unit_type, '') || ' ' ||
    coalesce(brand_or_chain, '')
  ));

-- ── Triggers ──────────────────────────────────────────────────────

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_glamping_resorts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER glamping_resorts_updated_at
  BEFORE UPDATE ON glamping_resorts
  FOR EACH ROW
  EXECUTE FUNCTION update_glamping_resorts_updated_at();

-- Calculate average retail daily rate from seasonal rate columns
CREATE TRIGGER glamping_resorts_calc_avg_rate
  BEFORE INSERT OR UPDATE OF
    rate_winter_weekday, rate_winter_weekend,
    rate_spring_weekday, rate_spring_weekend,
    rate_summer_weekday, rate_summer_weekend,
    rate_fall_weekday, rate_fall_weekend
  ON glamping_resorts
  FOR EACH ROW
  EXECUTE FUNCTION calc_avg_retail_daily_rate();

-- Auto-generate slug from property_name on insert
CREATE TRIGGER glamping_resorts_set_slug_insert
  BEFORE INSERT ON glamping_resorts
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_from_property_name();

-- Auto-generate slug from property_name on update (when name changes or slug is nulled)
CREATE TRIGGER glamping_resorts_set_slug_update
  BEFORE UPDATE ON glamping_resorts
  FOR EACH ROW
  WHEN (
    NEW.property_name IS DISTINCT FROM OLD.property_name
    OR (NEW.slug IS NULL AND OLD.slug IS NOT NULL)
  )
  EXECUTE FUNCTION generate_slug_from_property_name();

-- Sync flat season rate columns from the latest year in rate_unit_rates_by_year JSONB
CREATE TRIGGER glamping_resorts_sync_season_rates
  BEFORE INSERT OR UPDATE OF rate_unit_rates_by_year
  ON glamping_resorts
  FOR EACH ROW
  EXECUTE FUNCTION sync_season_rates_from_latest_year();
