-- Add 13 columns to all_glamping_properties (unified schema)
-- Unit amenities: unit_mini_fridge, unit_bathtub, unit_wood_burning_stove
-- Property amenities: property_pickball_courts + 9 property_* columns
-- Run via Supabase SQL editor or migration tool

BEGIN;

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS unit_mini_fridge text NULL,
  ADD COLUMN IF NOT EXISTS unit_bathtub text NULL,
  ADD COLUMN IF NOT EXISTS unit_wood_burning_stove text NULL,
  ADD COLUMN IF NOT EXISTS property_pickball_courts text NULL,
  ADD COLUMN IF NOT EXISTS property_age_restricted_55_plus text NULL,
  ADD COLUMN IF NOT EXISTS property_has_rentals text NULL,
  ADD COLUMN IF NOT EXISTS property_lgbtiq_friendly text NULL,
  ADD COLUMN IF NOT EXISTS property_gasoline_nearby text NULL,
  ADD COLUMN IF NOT EXISTS property_basketball text NULL,
  ADD COLUMN IF NOT EXISTS property_volleyball text NULL,
  ADD COLUMN IF NOT EXISTS property_jet_skiing text NULL,
  ADD COLUMN IF NOT EXISTS property_mobile_home_community text NULL,
  ADD COLUMN IF NOT EXISTS property_tennis text NULL;

COMMIT;
