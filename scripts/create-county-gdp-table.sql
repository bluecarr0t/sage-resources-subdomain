-- Create the county-gdp table
-- Run this SQL in your Supabase SQL Editor before uploading the CSV data
-- This table stores GDP data by county for Arts, Entertainment, Recreation, Accommodation, and Food Services
-- Data spans from 2001 to 2023
--
-- CSV Files:
--   - csv/gdp/2001.csv through csv/gdp/2023-gdp-arts-entertainment-recreation-accommadations-foodservices.csv
--
-- To upload the data, use the TypeScript script:
--   npx tsx scripts/upload-county-gdp.ts
--
-- The script will automatically:
--   1. Parse all CSV files in csv/gdp/
--   2. Extract GeoFips, GeoName, and GDP values for each year
--   3. Merge data by GeoFips code
--   4. Upload to this table

CREATE TABLE IF NOT EXISTS "county-gdp" (
  geofips TEXT PRIMARY KEY,
  geoname TEXT NOT NULL,
  gdp_2001 NUMERIC,
  gdp_2002 NUMERIC,
  gdp_2003 NUMERIC,
  gdp_2004 NUMERIC,
  gdp_2005 NUMERIC,
  gdp_2006 NUMERIC,
  gdp_2007 NUMERIC,
  gdp_2008 NUMERIC,
  gdp_2009 NUMERIC,
  gdp_2010 NUMERIC,
  gdp_2012 NUMERIC,
  gdp_2013 NUMERIC,
  gdp_2014 NUMERIC,
  gdp_2015 NUMERIC,
  gdp_2016 NUMERIC,
  gdp_2017 NUMERIC,
  gdp_2018 NUMERIC,
  gdp_2019 NUMERIC,
  gdp_2020 NUMERIC,
  gdp_2021 NUMERIC,
  gdp_2022 NUMERIC,
  gdp_2023 NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE "county-gdp" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "county-gdp"
  FOR SELECT
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_county_gdp_geofips ON "county-gdp" (geofips);
CREATE INDEX IF NOT EXISTS idx_county_gdp_geoname ON "county-gdp" (geoname);

-- Add comments to document the columns
COMMENT ON TABLE "county-gdp" IS 'County GDP data for Arts, Entertainment, Recreation, Accommodation, and Food Services from US Bureau of Economic Analysis, 2001-2023';
COMMENT ON COLUMN "county-gdp".geofips IS 'FIPS code for the county (e.g., "01001")';
COMMENT ON COLUMN "county-gdp".geoname IS 'County name with state (e.g., "Autauga, AL")';
COMMENT ON COLUMN "county-gdp".gdp_2001 IS 'GDP in thousands of dollars for 2001 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2002 IS 'GDP in thousands of dollars for 2002 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2003 IS 'GDP in thousands of dollars for 2003 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2004 IS 'GDP in thousands of dollars for 2004 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2005 IS 'GDP in thousands of dollars for 2005 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2006 IS 'GDP in thousands of dollars for 2006 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2007 IS 'GDP in thousands of dollars for 2007 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2008 IS 'GDP in thousands of dollars for 2008 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2009 IS 'GDP in thousands of dollars for 2009 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2010 IS 'GDP in thousands of dollars for 2010 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2012 IS 'GDP in thousands of dollars for 2012 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2013 IS 'GDP in thousands of dollars for 2013 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2014 IS 'GDP in thousands of dollars for 2014 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2015 IS 'GDP in thousands of dollars for 2015 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2016 IS 'GDP in thousands of dollars for 2016 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2017 IS 'GDP in thousands of dollars for 2017 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2018 IS 'GDP in thousands of dollars for 2018 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2019 IS 'GDP in thousands of dollars for 2019 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2020 IS 'GDP in thousands of dollars for 2020 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2021 IS 'GDP in thousands of dollars for 2021 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2022 IS 'GDP in thousands of dollars for 2022 (null if data not available or suppressed)';
COMMENT ON COLUMN "county-gdp".gdp_2023 IS 'GDP in thousands of dollars for 2023 (null if data not available or suppressed)';
