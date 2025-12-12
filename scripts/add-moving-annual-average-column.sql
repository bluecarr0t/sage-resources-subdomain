-- Add moving-annual-average column to county-gdp table
-- This column will store the average year-over-year percentage change in GDP
-- Run this SQL in your Supabase SQL Editor before running the calculation script

ALTER TABLE "county-gdp" 
ADD COLUMN IF NOT EXISTS "moving-annual-average" NUMERIC;

-- Add comment to document the column
COMMENT ON COLUMN "county-gdp"."moving-annual-average" IS 'Average year-over-year percentage change in GDP across all available years (2001-2023, excluding 2011). Calculated as the mean of all consecutive year percentage changes.';
