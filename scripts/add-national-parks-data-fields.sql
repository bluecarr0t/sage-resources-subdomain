-- Add new data fields to national-parks table
-- Run this SQL in your Supabase SQL Editor

-- Visitor Access & Operations
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS operating_months TEXT;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS best_time_to_visit TEXT;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS annual_pass_available BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS reservation_required BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS reservation_website TEXT;

-- Pet & Animal Policies
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS dogs_allowed BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS dogs_allowed_restrictions TEXT;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS pet_friendly_areas TEXT;

-- Camping & Accommodations
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS camping_available BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS number_of_campgrounds INTEGER;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS camping_reservation_required BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS lodging_available BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS rv_camping_available BOOLEAN;

-- Activities & Recreation
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS hiking_trails_available BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS number_of_trails INTEGER;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS water_activities TEXT;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS wildlife_viewing BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS scenic_drives BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS visitor_centers_count INTEGER;

-- Climate & Weather
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS average_summer_temp NUMERIC(5,1);
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS average_winter_temp NUMERIC(5,1);
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS climate_type TEXT;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS snow_season TEXT;

-- Park Features
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS notable_landmarks TEXT;

-- Practical Information
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS cell_phone_coverage TEXT;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS backcountry_permits_required BOOLEAN;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS fire_restrictions TEXT;

-- Additional Statistics
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS recreation_visitors_2022 TEXT;
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS recreation_visitors_2023 TEXT;

-- Create indexes on frequently queried boolean fields
CREATE INDEX IF NOT EXISTS idx_national_parks_dogs_allowed ON "national-parks" (dogs_allowed) 
WHERE dogs_allowed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_national_parks_camping_available ON "national-parks" (camping_available) 
WHERE camping_available IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_national_parks_reservation_required ON "national-parks" (reservation_required) 
WHERE reservation_required IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN "national-parks".operating_months IS 'Months/seasons when the park is fully operational';
COMMENT ON COLUMN "national-parks".best_time_to_visit IS 'Recommended months/seasons for optimal weather and conditions';
COMMENT ON COLUMN "national-parks".annual_pass_available IS 'Whether the park offers an annual pass';
COMMENT ON COLUMN "national-parks".reservation_required IS 'Whether advance reservations are required for entry';
COMMENT ON COLUMN "national-parks".reservation_website IS 'URL for making reservations';
COMMENT ON COLUMN "national-parks".dogs_allowed IS 'Whether dogs are allowed in the park';
COMMENT ON COLUMN "national-parks".dogs_allowed_restrictions IS 'Restrictions on dogs (e.g., on leash only, only in developed areas)';
COMMENT ON COLUMN "national-parks".pet_friendly_areas IS 'Specific areas where pets are allowed';
COMMENT ON COLUMN "national-parks".camping_available IS 'Whether the park has campgrounds';
COMMENT ON COLUMN "national-parks".number_of_campgrounds IS 'Total number of campgrounds in the park';
COMMENT ON COLUMN "national-parks".camping_reservation_required IS 'Whether camping reservations are required';
COMMENT ON COLUMN "national-parks".lodging_available IS 'Whether the park has lodges, cabins, or other accommodations';
COMMENT ON COLUMN "national-parks".rv_camping_available IS 'Whether RV camping is available';
COMMENT ON COLUMN "national-parks".hiking_trails_available IS 'Whether the park has hiking trails';
COMMENT ON COLUMN "national-parks".number_of_trails IS 'Approximate number of hiking trails';
COMMENT ON COLUMN "national-parks".water_activities IS 'Available water activities (e.g., kayaking, swimming, fishing)';
COMMENT ON COLUMN "national-parks".wildlife_viewing IS 'Whether the park is known for wildlife viewing';
COMMENT ON COLUMN "national-parks".scenic_drives IS 'Whether the park has scenic drives';
COMMENT ON COLUMN "national-parks".visitor_centers_count IS 'Number of visitor centers in the park';
COMMENT ON COLUMN "national-parks".average_summer_temp IS 'Average summer temperature in Fahrenheit';
COMMENT ON COLUMN "national-parks".average_winter_temp IS 'Average winter temperature in Fahrenheit';
COMMENT ON COLUMN "national-parks".climate_type IS 'General climate classification (e.g., Desert, Alpine, Temperate, Tropical)';
COMMENT ON COLUMN "national-parks".snow_season IS 'Months when snow is typically present';
COMMENT ON COLUMN "national-parks".notable_landmarks IS 'Famous landmarks or features';
COMMENT ON COLUMN "national-parks".cell_phone_coverage IS 'Cell phone coverage quality (e.g., Limited, Good, None)';
COMMENT ON COLUMN "national-parks".backcountry_permits_required IS 'Whether backcountry camping requires permits';
COMMENT ON COLUMN "national-parks".fire_restrictions IS 'General fire restriction information';
COMMENT ON COLUMN "national-parks".recreation_visitors_2022 IS 'Visitor count for 2022';
COMMENT ON COLUMN "national-parks".recreation_visitors_2023 IS 'Visitor count for 2023';
