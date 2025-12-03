-- Add rate_category column to sage-glamping-data table
-- This column will store the rate category (≤$149, $150-$249, $250-$399, $400-$549, $550+)
-- Run this SQL in your Supabase SQL Editor

-- Add the column
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS rate_category TEXT;

-- Create index on rate_category for faster filtering
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_rate_category 
ON "sage-glamping-data" (rate_category) 
WHERE rate_category IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN "sage-glamping-data".rate_category IS 
'Rate category based on avg__rate__next_12_months_: ≤$149, $150-$249, $250-$399, $400-$549, $550+';

