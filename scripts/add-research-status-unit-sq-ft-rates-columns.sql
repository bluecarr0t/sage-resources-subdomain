-- Add research_status, unit_sq_ft, rename avg_retail_daily_rate_2025, add unit_rates_by_year
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- 1. Add research_status column
ALTER TABLE public.all_glamping_properties
ADD COLUMN IF NOT EXISTS research_status TEXT;

-- Set all current records to 'published'
UPDATE public.all_glamping_properties
SET research_status = 'published'
WHERE research_status IS NULL;

-- Add check constraint for valid values
ALTER TABLE public.all_glamping_properties
DROP CONSTRAINT IF EXISTS research_status_valid_values;
ALTER TABLE public.all_glamping_properties
ADD CONSTRAINT research_status_valid_values
CHECK (research_status IS NULL OR research_status IN ('new', 'in_progress', 'needs_review', 'published'));

-- Set default for new records
ALTER TABLE public.all_glamping_properties
ALTER COLUMN research_status SET DEFAULT 'new';

-- 2. Add unit_sq_ft column
ALTER TABLE public.all_glamping_properties
ADD COLUMN IF NOT EXISTS unit_sq_ft NUMERIC DEFAULT NULL;

-- 3. (Skipped - column already renamed to avg_retail_daily_rate)

-- 4. Add unit_rates_by_year column with check constraint
ALTER TABLE public.all_glamping_properties
ADD COLUMN IF NOT EXISTS unit_rates_by_year JSONB NULL;

ALTER TABLE public.all_glamping_properties
DROP CONSTRAINT IF EXISTS unit_rates_by_year_is_object;
ALTER TABLE public.all_glamping_properties
ADD CONSTRAINT unit_rates_by_year_is_object
CHECK (unit_rates_by_year IS NULL OR jsonb_typeof(unit_rates_by_year) = 'object');

-- Populate unit_rates_by_year from current season columns (nested structure, 2025 data)
-- Structure: { "2025": { "winter": { "weekday": N, "weekend": N }, "spring": {...}, ... } }
UPDATE public.all_glamping_properties
SET unit_rates_by_year = jsonb_build_object(
  '2025', jsonb_build_object(
    'winter', jsonb_build_object('weekday', winter_weekday, 'weekend', winter_weekend),
    'spring', jsonb_build_object('weekday', spring_weekday, 'weekend', spring_weekend),
    'summer', jsonb_build_object('weekday', summer_weekday, 'weekend', summer_weekend),
    'fall',   jsonb_build_object('weekday', fall_weekday,   'weekend', fall_weekend)
  )
)
WHERE (winter_weekday IS NOT NULL OR winter_weekend IS NOT NULL OR spring_weekday IS NOT NULL OR 
       spring_weekend IS NOT NULL OR summer_weekday IS NOT NULL OR summer_weekend IS NOT NULL OR 
       fall_weekday IS NOT NULL OR fall_weekend IS NOT NULL)
  AND unit_rates_by_year IS NULL;

-- Helper function: extract the latest (highest) year key from unit_rates_by_year
CREATE OR REPLACE FUNCTION public.latest_rate_year(rates JSONB)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT max(key::int)
  FROM jsonb_object_keys(rates) AS key
  WHERE key ~ '^\d{4}$';
$$;

-- Trigger function: sync the latest year's rates back into the season/day columns
CREATE OR REPLACE FUNCTION public.sync_season_rates_from_latest_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  y INT;
BEGIN
  y := public.latest_rate_year(NEW.unit_rates_by_year);

  IF y IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.winter_weekday := (NEW.unit_rates_by_year -> y::text -> 'winter' ->> 'weekday')::NUMERIC;
  NEW.winter_weekend := (NEW.unit_rates_by_year -> y::text -> 'winter' ->> 'weekend')::NUMERIC;

  NEW.spring_weekday := (NEW.unit_rates_by_year -> y::text -> 'spring' ->> 'weekday')::NUMERIC;
  NEW.spring_weekend := (NEW.unit_rates_by_year -> y::text -> 'spring' ->> 'weekend')::NUMERIC;

  NEW.summer_weekday := (NEW.unit_rates_by_year -> y::text -> 'summer' ->> 'weekday')::NUMERIC;
  NEW.summer_weekend := (NEW.unit_rates_by_year -> y::text -> 'summer' ->> 'weekend')::NUMERIC;

  NEW.fall_weekday := (NEW.unit_rates_by_year -> y::text -> 'fall' ->> 'weekday')::NUMERIC;
  NEW.fall_weekend := (NEW.unit_rates_by_year -> y::text -> 'fall' ->> 'weekend')::NUMERIC;

  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then create the new one
DROP TRIGGER IF EXISTS sync_unit_rates_trigger ON public.all_glamping_properties;
DROP TRIGGER IF EXISTS sync_season_rates_trigger ON public.all_glamping_properties;
CREATE TRIGGER sync_season_rates_trigger
BEFORE INSERT OR UPDATE OF unit_rates_by_year ON public.all_glamping_properties
FOR EACH ROW
EXECUTE FUNCTION public.sync_season_rates_from_latest_year();

COMMIT;
