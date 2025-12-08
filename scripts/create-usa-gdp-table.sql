-- Create the usa-gdp table
-- Run this SQL in your Supabase SQL Editor before uploading the CSV data
-- This table stores GDP data by county for 2020-2023

CREATE TABLE IF NOT EXISTS "usa-gdp" (
  county_name TEXT NOT NULL,
  state_name TEXT NOT NULL,
  PRIMARY KEY (county_name, state_name),
  gdp_2020 NUMERIC,
  gdp_2021 NUMERIC,
  gdp_2022 NUMERIC,
  gdp_2023 NUMERIC,
  change_2021 NUMERIC,
  change_2022 NUMERIC,
  change_2023 NUMERIC,
  rank_2023 INTEGER,
  rank_change_2023 INTEGER,
  fips_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE "usa-gdp" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "usa-gdp"
  FOR SELECT
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_usa_gdp_county_name ON "usa-gdp" (county_name);
CREATE INDEX IF NOT EXISTS idx_usa_gdp_state_name ON "usa-gdp" (state_name);
CREATE INDEX IF NOT EXISTS idx_usa_gdp_fips_code ON "usa-gdp" (fips_code) WHERE fips_code IS NOT NULL;

-- Create index on change_2023 for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_usa_gdp_change_2023 ON "usa-gdp" (change_2023) 
WHERE change_2023 IS NOT NULL;

-- Add comments to document the columns
COMMENT ON TABLE "usa-gdp" IS 'County GDP data from US Bureau of Economic Analysis, 2020-2023';
COMMENT ON COLUMN "usa-gdp".county_name IS 'County name (e.g., "Autauga", "Jefferson")';
COMMENT ON COLUMN "usa-gdp".state_name IS 'State name (e.g., "Alabama", "Alaska")';
COMMENT ON COLUMN "usa-gdp".gdp_2020 IS 'Real GDP in thousands of chained (2017) dollars for 2020';
COMMENT ON COLUMN "usa-gdp".gdp_2021 IS 'Real GDP in thousands of chained (2017) dollars for 2021';
COMMENT ON COLUMN "usa-gdp".gdp_2022 IS 'Real GDP in thousands of chained (2017) dollars for 2022';
COMMENT ON COLUMN "usa-gdp".gdp_2023 IS 'Real GDP in thousands of chained (2017) dollars for 2023';
COMMENT ON COLUMN "usa-gdp".change_2021 IS 'Percent change from 2020 to 2021';
COMMENT ON COLUMN "usa-gdp".change_2022 IS 'Percent change from 2021 to 2022';
COMMENT ON COLUMN "usa-gdp".change_2023 IS 'Percent change from 2022 to 2023';
COMMENT ON COLUMN "usa-gdp".rank_2023 IS 'Rank in state for 2023 GDP';
COMMENT ON COLUMN "usa-gdp".rank_change_2023 IS 'Rank in state for 2023 GDP change';
COMMENT ON COLUMN "usa-gdp".fips_code IS 'FIPS code for matching with GeoJSON (e.g., "01001")';
