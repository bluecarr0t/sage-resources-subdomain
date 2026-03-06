-- Add roverpass_* and *_raw columns to all_glamping_properties
-- roverpass_campground_id: external RoverPass campground identifier
-- roverpass_occupancy_rate: occupancy rate (e.g. 0.85)
-- roverpass_occupancy_year: year the occupancy rate applies to
-- amenities_raw, activities_raw, lifestyle_raw: unprocessed source data

ALTER TABLE all_glamping_properties
  ADD COLUMN IF NOT EXISTS roverpass_campground_id TEXT,
  ADD COLUMN IF NOT EXISTS roverpass_occupancy_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS roverpass_occupancy_year NUMERIC,
  ADD COLUMN IF NOT EXISTS amenities_raw TEXT,
  ADD COLUMN IF NOT EXISTS activities_raw TEXT,
  ADD COLUMN IF NOT EXISTS lifestyle_raw TEXT;
