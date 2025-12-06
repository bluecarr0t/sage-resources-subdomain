-- Add slug column to national-parks table
-- Run this SQL in your Supabase SQL Editor

-- Add slug column if it doesn't exist
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_national_parks_slug ON "national-parks" (slug) WHERE slug IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN "national-parks".slug IS 'URL-safe slug for the national park, generated from the name field';
