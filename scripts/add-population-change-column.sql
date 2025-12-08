-- Add 'change' column to county-population table
-- This column stores the percentage change from 2010 to 2020

-- Add the change column
ALTER TABLE "county-population" 
ADD COLUMN IF NOT EXISTS change NUMERIC;

-- Calculate and update the percentage change
-- Formula: ((population_2020 - population_2010) / population_2010) * 100
-- Only calculate where both values exist
UPDATE "county-population"
SET change = CASE
  WHEN population_2010 IS NOT NULL 
    AND population_2020 IS NOT NULL 
    AND population_2010 > 0 
  THEN ROUND(
    ((population_2020::NUMERIC - population_2010::NUMERIC) / population_2010::NUMERIC) * 100,
    2
  )
  ELSE NULL
END;

-- Add comment to document the column
COMMENT ON COLUMN "county-population".change IS 'Percentage change in population from 2010 to 2020 (e.g., 5.23 = 5.23% increase)';

-- Create index on change column for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_county_population_change ON "county-population" (change) 
WHERE change IS NOT NULL;
