-- Create the county-population table
-- Run this SQL in your Supabase SQL Editor before uploading the CSV data
-- This table stores 2010 and 2020 census population data by county
--
-- CSV Files:
--   - csv/population/2020-census-by-county.csv
--   - csv/population/2010-censes-by-county.csv
--
-- To upload the data, use the TypeScript script:
--   npx tsx scripts/upload-county-population.ts
--
-- The script will automatically:
--   1. Parse both CSV files
--   2. Extract GEO_ID, NAME, and population data (P1_001N for 2020, P001001 for 2010)
--   3. Combine the data by GEO_ID
--   4. Calculate percentage change from 2010 to 2020
--   5. Upload to this table using upsert (updates existing records)

CREATE TABLE IF NOT EXISTS "county-population" (
  geo_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  population_2010 INTEGER,
  population_2020 INTEGER,
  change NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE "county-population" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "county-population"
  FOR SELECT
  USING (true);

-- Create index on name for faster lookups and matching
CREATE INDEX IF NOT EXISTS idx_county_population_name ON "county-population" (name);

-- Create index on population columns for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_county_population_2010 ON "county-population" (population_2010) 
WHERE population_2010 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_county_population_2020 ON "county-population" (population_2020) 
WHERE population_2020 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_county_population_change ON "county-population" (change) 
WHERE change IS NOT NULL;

-- Add comments to document the columns
COMMENT ON TABLE "county-population" IS 'County population data from 2010 and 2020 US Census';
COMMENT ON COLUMN "county-population".geo_id IS 'Census GEO_ID identifier (e.g., "0500000US01001")';
COMMENT ON COLUMN "county-population".name IS 'County name with state (e.g., "Autauga County, Alabama")';
COMMENT ON COLUMN "county-population".population_2010 IS 'Total population from 2010 US Census';
COMMENT ON COLUMN "county-population".population_2020 IS 'Total population from 2020 US Census';
COMMENT ON COLUMN "county-population".change IS 'Percentage change in population from 2010 to 2020 (e.g., 5.23 = 5.23% increase)';
