-- Add slug column to sage-glamping-data table
-- This column will store URL-safe slugs for property pages
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add the column (nullable initially for safe migration)
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add comment to document the column
COMMENT ON COLUMN "sage-glamping-data".slug IS 
'URL-safe slug for property pages. All records with the same property_name share the same slug. Generated from property_name but can be manually optimized for SEO.';

-- Note: Indexes and NOT NULL constraint will be added after population via populate-property-slugs.ts script
