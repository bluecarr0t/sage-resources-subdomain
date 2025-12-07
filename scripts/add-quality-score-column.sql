-- Add quality_score column to sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor

-- Add the quality_score column
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS quality_score INTEGER;

-- Add comment to document the column
COMMENT ON COLUMN "sage-glamping-data".quality_score IS 
'Data quality score (1-100) calculated based on data completeness and accuracy. Higher scores indicate more complete and accurate property data.';

-- Create index for faster querying and filtering by quality score
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_quality_score 
ON "sage-glamping-data" (quality_score) 
WHERE quality_score IS NOT NULL;

-- Add comment to the index
COMMENT ON INDEX idx_sage_glamping_data_quality_score IS 
'Index on quality_score column for fast filtering and sorting by data quality';

-- Clean up sage___p__amenity__food_on_site column: set to NULL if not 'Yes' or 'No'
UPDATE "sage-glamping-data"
SET sage___p__amenity__food_on_site = NULL
WHERE sage___p__amenity__food_on_site IS NOT NULL 
  AND sage___p__amenity__food_on_site NOT IN ('Yes', 'No');
