-- Add maa-10-years column to county-gdp table
-- This column will store the average year-over-year percentage change in GDP for 2013-2023 (10 years)
-- Run this SQL in your Supabase SQL Editor before running the calculation script

ALTER TABLE "county-gdp" 
ADD COLUMN IF NOT EXISTS "maa-10-years" NUMERIC;

-- Add comment to document the column
COMMENT ON COLUMN "county-gdp"."maa-10-years" IS 'Average year-over-year percentage change in GDP across 2013-2023 (10 years). Calculated as the mean of all consecutive year percentage changes from 2013 to 2023.';
