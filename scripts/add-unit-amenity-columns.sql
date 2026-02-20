-- Add unit_mini_fridge, unit_bathtub, unit_wood_burning_stove, property_pickball_courts to all_glamping_properties
-- Run via Supabase SQL editor or migration tool

ALTER TABLE all_glamping_properties
  ADD COLUMN IF NOT EXISTS unit_mini_fridge text,
  ADD COLUMN IF NOT EXISTS unit_bathtub text,
  ADD COLUMN IF NOT EXISTS unit_wood_burning_stove text,
  ADD COLUMN IF NOT EXISTS property_pickball_courts text;
