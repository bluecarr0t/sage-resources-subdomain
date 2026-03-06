-- Create the ski_resorts table for USA and Canada ski resort data
-- Designed for AI agent web research / scraping - uses TEXT for flexible data ingestion
--
-- To populate: Use an AI agent or scraper to gather data from resort websites,
-- OnTheSnow, Ski.com, Wikipedia, etc.
--
-- Run this SQL in your Supabase SQL Editor before loading data

CREATE TABLE IF NOT EXISTS ski_resorts (
  id BIGSERIAL PRIMARY KEY,

  -- Identity & basics
  name TEXT NOT NULL,
  alternate_names TEXT,                    -- JSON array or comma-separated: "Vail Mountain", "Vail"
  resort_type TEXT,                       -- "destination", "day", "boutique", "family"
  parent_company TEXT,                    -- "Vail Resorts", "Alterra", "Boyne", etc.
  website_url TEXT,
  description TEXT,
  year_opened TEXT,
  data_source_url TEXT,                   -- URL where data was scraped from
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  data_confidence_score TEXT,             -- "high", "medium", "low" - for AI validation

  -- Location (USA & Canada)
  address TEXT,
  street_address TEXT,
  city TEXT,
  state_province TEXT,                    -- "Colorado", "British Columbia", "Québec"
  country TEXT NOT NULL DEFAULT 'USA',     -- "USA" or "Canada"
  postal_code TEXT,
  region TEXT,                            -- "Rocky Mountains", "Northeast", "Pacific Northwest"
  lat TEXT,
  lon TEXT,
  timezone TEXT,                          -- "America/Denver", "America/Los_Angeles"

  -- Nearest access
  nearest_airport_code TEXT,              -- "DEN", "SLC", "YVR"
  nearest_airport_name TEXT,
  nearest_airport_miles TEXT,
  nearest_major_city TEXT,
  drive_time_from_nearest_city TEXT,      -- "2 hours from Denver"

  -- Pricing (per day unless noted)
  lift_ticket_price_adult TEXT,          -- "$99", "99-199", "varies"
  lift_ticket_price_child TEXT,
  lift_ticket_price_senior TEXT,
  lift_ticket_price_range_low TEXT,
  lift_ticket_price_range_high TEXT,
  season_pass_price TEXT,
  season_pass_name TEXT,                  -- "Epic Pass", "Ikon Pass", resort-specific
  rental_package_price TEXT,             -- skis + boots
  lesson_price_half_day TEXT,
  lesson_price_full_day TEXT,
  lesson_price_private TEXT,
  parking_price TEXT,
  pricing_notes TEXT,                     -- "Free parking", "Reservations required"

  -- Hours & season
  opening_date TEXT,                      -- "November 15" or "2024-11-15"
  closing_date TEXT,
  typical_season TEXT,                    -- "Late Nov - Early Apr"
  operating_hours_weekday TEXT,           -- "9:00 AM - 4:00 PM"
  operating_hours_weekend TEXT,
  night_skiing_available TEXT,            -- "yes", "no"
  night_skiing_hours TEXT,
  night_skiing_acres TEXT,
  summer_operations TEXT,                  -- "gondola", "hiking", "bike park", "closed"

  -- Terrain stats (numeric as TEXT for scraped flexibility)
  vertical_drop_ft TEXT,
  summit_elevation_ft TEXT,
  base_elevation_ft TEXT,
  total_skiable_acres TEXT,
  total_terrain_acres TEXT,
  number_of_trails TEXT,
  trails_easy_count TEXT,
  trails_intermediate_count TEXT,
  trails_difficult_count TEXT,
  trails_expert_count TEXT,
  trails_double_black_count TEXT,
  longest_run_miles TEXT,
  longest_run_name TEXT,
  terrain_parks_count TEXT,
  halfpipe TEXT,                          -- "yes", "no", "22ft superpipe"
  tree_skiing TEXT,                       -- "yes", "extensive", "limited"
  backcountry_access TEXT,                -- "yes", "guided only", "no"

  -- Lifts
  number_of_lifts TEXT,
  total_lift_capacity_per_hour TEXT,      -- skiers per hour
  gondolas_count TEXT,
  chairlifts_count TEXT,
  high_speed_quads_count TEXT,
  surface_lifts_count TEXT,               -- magic carpets, T-bars
  tram_aerial_tramway TEXT,               -- "yes", "no"
  lift_notes TEXT,

  -- Snow & conditions
  average_annual_snowfall_inches TEXT,
  average_snowfall_inches TEXT,           -- alias / alternate source
  snowmaking_coverage_acres TEXT,
  snowmaking_coverage_percent TEXT,
  snowmaking_notes TEXT,
  base_depth_current TEXT,                -- for live conditions (updated by agent)
  season_snowfall_to_date TEXT,
  last_snowfall_date TEXT,
  last_snowfall_inches TEXT,

  -- Ski school & programs
  ski_school_programs TEXT,               -- "group", "private", "kids", "adaptive"
  childcare_available TEXT,
  childcare_age_range TEXT,
  adaptive_skiing TEXT,                   -- "yes", "no"
  race_programs TEXT,

  -- Amenities & services
  lodging_on_mountain TEXT,               -- "yes", "no", "limited"
  lodging_units_count TEXT,
  restaurants_count TEXT,
  cafeterias_count TEXT,
  bars_apres_ski_count TEXT,
  equipment_rental TEXT,                  -- "yes", "no"
  equipment_rental_locations TEXT,
  ski_valet TEXT,
  lockers TEXT,
  wifi TEXT,
  atms TEXT,
  medical_clinic TEXT,
  daycare TEXT,
  spa TEXT,
  fitness_center TEXT,
  indoor_pool TEXT,
  tubing TEXT,
  snowshoeing TEXT,
  snowmobiling TEXT,
  ice_skating TEXT,
  sledding TEXT,

  -- Dining & nightlife
  fine_dining TEXT,
  casual_dining TEXT,
  quick_service TEXT,
  on_mountain_dining TEXT,
  apres_ski_rating TEXT,                  -- "vibrant", "moderate", "quiet"

  -- Accessibility & transportation
  public_transit TEXT,                    -- "yes", "free shuttle from town"
  shuttle_service TEXT,
  parking_spaces TEXT,
  ev_charging TEXT,
  accessibility_ada TEXT,                 -- "yes", "partial", "no"

  -- Contact & social
  phone TEXT,
  email TEXT,
  facebook_url TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,

  -- Ratings & reviews (if scraped)
  overall_rating TEXT,                    -- "4.5"
  review_count TEXT,
  on_the_snow_rating TEXT,
  family_friendly_rating TEXT,
  value_rating TEXT,
  terrain_rating TEXT,
  nightlife_rating TEXT,

  -- Additional scraped / computed fields
  wikipedia_url TEXT,
  on_the_snow_url TEXT,
  ski_com_url TEXT,
  booking_com_url TEXT,
  images_json TEXT,                       -- JSON array of image URLs
  tags TEXT,                              -- comma-separated: "family", "expert", "powder"
  notable_facts TEXT,                     -- "Host of 1960 Winter Olympics"
  raw_scraped_json TEXT,                  -- full JSON blob from scraper for reprocessing

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ski_resorts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust for your use case)
CREATE POLICY "Allow public read access" ON ski_resorts
  FOR SELECT
  USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ski_resorts_name ON ski_resorts (name);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_country ON ski_resorts (country);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_state_province ON ski_resorts (state_province);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_location ON ski_resorts (city, state_province);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_coordinates ON ski_resorts (lat, lon) WHERE lat IS NOT NULL AND lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ski_resorts_region ON ski_resorts (region);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_parent_company ON ski_resorts (parent_company);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_last_scraped ON ski_resorts (last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_vertical_drop ON ski_resorts (vertical_drop_ft);
CREATE INDEX IF NOT EXISTS idx_ski_resorts_snowfall ON ski_resorts (average_annual_snowfall_inches);

-- Full-text search on name, description, and location for AI/discovery
CREATE INDEX IF NOT EXISTS idx_ski_resorts_search ON ski_resorts
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, '') || ' ' || coalesce(state_province, '') || ' ' || coalesce(region, '')));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_ski_resorts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ski_resorts_updated_at
  BEFORE UPDATE ON ski_resorts
  FOR EACH ROW
  EXECUTE FUNCTION update_ski_resorts_updated_at();
