-- Drop the duplicatenote column from all_glamping_properties
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE "all_glamping_properties" DROP COLUMN IF EXISTS duplicatenote;
