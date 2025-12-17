-- Add campground_type column to all_campgrounds table
-- Run this SQL in your Supabase SQL Editor

-- Add the campground_type column with check constraint
ALTER TABLE public.all_campgrounds 
ADD COLUMN IF NOT EXISTS campground_type TEXT;

-- Add check constraint to ensure only valid values
ALTER TABLE public.all_campgrounds
DROP CONSTRAINT IF EXISTS check_campground_type;

ALTER TABLE public.all_campgrounds
ADD CONSTRAINT check_campground_type 
CHECK (campground_type IS NULL OR campground_type IN ('private', 'state', 'federal', 'unknown'));

-- Set default value for existing records (optional - can be set to 'unknown' if preferred)
-- UPDATE public.all_campgrounds SET campground_type = 'unknown' WHERE campground_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.all_campgrounds.campground_type IS 'Ownership type: private (privately owned), state (state owned), federal (federally owned), or unknown';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_all_campgrounds_campground_type 
ON public.all_campgrounds (campground_type) 
WHERE campground_type IS NOT NULL;
