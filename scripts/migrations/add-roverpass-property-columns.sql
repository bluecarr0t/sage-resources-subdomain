-- Add 9 new property_ columns to all_roverpass_data_new and all_glamping_properties (unified schema)
-- Backfill from amenities_raw, activities_raw, lifestyle_raw in all_roverpass_data_new

BEGIN;

-- Step 1: Add columns to all_roverpass_data_new
ALTER TABLE public.all_roverpass_data_new
  ADD COLUMN IF NOT EXISTS property_age_restricted_55_plus text NULL,
  ADD COLUMN IF NOT EXISTS property_has_rentals text NULL,
  ADD COLUMN IF NOT EXISTS property_lgbtiq_friendly text NULL,
  ADD COLUMN IF NOT EXISTS property_gasoline_nearby text NULL,
  ADD COLUMN IF NOT EXISTS property_basketball text NULL,
  ADD COLUMN IF NOT EXISTS property_volleyball text NULL,
  ADD COLUMN IF NOT EXISTS property_jet_skiing text NULL,
  ADD COLUMN IF NOT EXISTS property_mobile_home_community text NULL,
  ADD COLUMN IF NOT EXISTS property_tennis text NULL;

-- Step 2: Add columns to all_glamping_properties (unified schema)
ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS property_age_restricted_55_plus text NULL,
  ADD COLUMN IF NOT EXISTS property_has_rentals text NULL,
  ADD COLUMN IF NOT EXISTS property_lgbtiq_friendly text NULL,
  ADD COLUMN IF NOT EXISTS property_gasoline_nearby text NULL,
  ADD COLUMN IF NOT EXISTS property_basketball text NULL,
  ADD COLUMN IF NOT EXISTS property_volleyball text NULL,
  ADD COLUMN IF NOT EXISTS property_jet_skiing text NULL,
  ADD COLUMN IF NOT EXISTS property_mobile_home_community text NULL,
  ADD COLUMN IF NOT EXISTS property_tennis text NULL;

-- Step 3: Backfill all_roverpass_data_new from raw columns

-- lifestyle_raw: 55-plus
UPDATE public.all_roverpass_data_new
SET property_age_restricted_55_plus = 'Yes'
WHERE lifestyle_raw LIKE '%55-plus%';

-- lifestyle_raw: Rentals
UPDATE public.all_roverpass_data_new
SET property_has_rentals = 'Yes'
WHERE lifestyle_raw LIKE '%Rentals%';

-- lifestyle_raw: LGBTIQ Friendly
UPDATE public.all_roverpass_data_new
SET property_lgbtiq_friendly = 'Yes'
WHERE lifestyle_raw LIKE '%LGBTIQ Friendly%';

-- amenities_raw: Gasoline Nearby
UPDATE public.all_roverpass_data_new
SET property_gasoline_nearby = 'Yes'
WHERE amenities_raw LIKE '%Gasoline Nearby%';

-- activities_raw: Basketball
UPDATE public.all_roverpass_data_new
SET property_basketball = 'Yes'
WHERE activities_raw LIKE '%Basketball%';

-- activities_raw: Volleyball
UPDATE public.all_roverpass_data_new
SET property_volleyball = 'Yes'
WHERE activities_raw LIKE '%Volleyball%';

-- activities_raw: Jet Skiing
UPDATE public.all_roverpass_data_new
SET property_jet_skiing = 'Yes'
WHERE activities_raw LIKE '%Jet Skiing%';

-- lifestyle_raw: Mobile Home Community
UPDATE public.all_roverpass_data_new
SET property_mobile_home_community = 'Yes'
WHERE lifestyle_raw LIKE '%Mobile Home Community%';

-- activities_raw: Tennis
UPDATE public.all_roverpass_data_new
SET property_tennis = 'Yes'
WHERE activities_raw LIKE '%Tennis%';

COMMIT;
