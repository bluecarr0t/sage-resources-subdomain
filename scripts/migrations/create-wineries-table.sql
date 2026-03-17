-- Create the wineries table for USA and Canada winery data
-- Designed for AI agent web research / scraping - uses TEXT for flexible data ingestion
--
-- To populate: Use an AI agent or scraper to gather data from winery websites,
-- Wine Spectator, Wine Enthusiast, Winery Guide USA, All American Wineries, etc.
--
-- Run this SQL in your Supabase SQL Editor before loading data

CREATE TABLE IF NOT EXISTS wineries (
  id BIGSERIAL PRIMARY KEY,

  -- Identity & basics
  name TEXT NOT NULL,
  alternate_names TEXT,                    -- "Chateau X", "X Vineyards"
  winery_type TEXT,                         -- estate, boutique, negociant, custom crush
  parent_company TEXT,
  website_url TEXT,
  description TEXT,
  year_founded TEXT,
  data_source_url TEXT,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  data_confidence_score TEXT,                -- "high", "medium", "low" - for AI validation

  -- Location (USA & Canada)
  address TEXT,
  street_address TEXT,
  city TEXT,
  state_province TEXT,                      -- California, Oregon, New York
  country TEXT NOT NULL DEFAULT 'USA',      -- "USA" or "Canada"
  postal_code TEXT,
  region TEXT,                              -- Napa Valley, Willamette Valley
  ava TEXT,                                 -- American Viticultural Area (e.g. Napa Valley AVA)
  sub_ava TEXT,                             -- Oakville, Rutherford
  lat TEXT,
  lon TEXT,
  timezone TEXT,
  nearest_airport_code TEXT,                -- SFO, PDX
  nearest_airport_name TEXT,
  nearest_airport_miles TEXT,
  nearest_major_city TEXT,
  drive_time_from_nearest_city TEXT,

  -- Vineyard and production
  acres_planted TEXT,                       -- Normalized for display (parentheticals stripped)
  acres_planted_raw TEXT,                   -- Full raw text for reprocessing
  annual_cases_produced TEXT,
  grape_varietals TEXT,                     -- Cabernet Sauvignon, Chardonnay (comma-separated)
  wine_styles TEXT,                         -- red, white, sparkling, rosé, dessert
  sustainable_certification TEXT,           -- organic, biodynamic, SIP Certified
  elevation_ft TEXT,

  -- Tasting room and experiences
  tasting_room_available TEXT,              -- yes, no
  tasting_hours TEXT,
  tasting_fee TEXT,                         -- Single fee or range
  tasting_fee_range_low TEXT,
  tasting_fee_range_high TEXT,
  reservation_required TEXT,                -- yes, no, recommended
  tour_available TEXT,
  tour_fee TEXT,
  picnic_area TEXT,
  outdoor_seating TEXT,
  groups_welcome TEXT,

  -- Amenities and services
  restaurant TEXT,                          -- yes, no, limited
  lodging TEXT,
  event_space TEXT,
  wedding_venue TEXT,
  wine_club TEXT,
  wine_club_membership_fee TEXT,
  curb_side_pickup TEXT,
  shipping_available TEXT,
  dog_friendly TEXT,
  accessibility_ada TEXT,                   -- yes, partial, no

  -- Pricing and contact
  phone TEXT,
  email TEXT,
  facebook_url TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  reservation_url TEXT,                     -- Resy, Tock, etc.

  -- Ratings and reviews
  overall_rating TEXT,
  review_count TEXT,
  wine_spectator_mentions TEXT,
  wine_enthusiast_mentions TEXT,
  google_reviews_rating TEXT,
  tripadvisor_rating TEXT,
  tripadvisor_review_count TEXT,

  -- Reference URLs and metadata
  wikipedia_url TEXT,
  wineryguideusa_url TEXT,
  images_json TEXT,                         -- JSON array of URLs
  tags TEXT,                                -- family-friendly, luxury, scenic
  notable_facts TEXT,
  raw_scraped_json TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE wineries ENABLE ROW LEVEL SECURITY;

-- Allow public read access (matching ski_resorts)
CREATE POLICY "Allow public read access" ON wineries
  FOR SELECT
  USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wineries_name ON wineries (name);
CREATE INDEX IF NOT EXISTS idx_wineries_country ON wineries (country);
CREATE INDEX IF NOT EXISTS idx_wineries_state_province ON wineries (state_province);
CREATE INDEX IF NOT EXISTS idx_wineries_location ON wineries (city, state_province);
CREATE INDEX IF NOT EXISTS idx_wineries_ava ON wineries (ava);
CREATE INDEX IF NOT EXISTS idx_wineries_region ON wineries (region);
CREATE INDEX IF NOT EXISTS idx_wineries_coordinates ON wineries (lat, lon) WHERE lat IS NOT NULL AND lon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wineries_parent_company ON wineries (parent_company);
CREATE INDEX IF NOT EXISTS idx_wineries_last_scraped ON wineries (last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_wineries_acres_planted ON wineries (acres_planted);

-- Full-text search on name, description, and location for AI/discovery
CREATE INDEX IF NOT EXISTS idx_wineries_search ON wineries
  USING gin(to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(state_province, '') || ' ' ||
    coalesce(ava, '') || ' ' ||
    coalesce(region, '')
  ));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_wineries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wineries_updated_at
  BEFORE UPDATE ON wineries
  FOR EACH ROW
  EXECUTE FUNCTION update_wineries_updated_at();
