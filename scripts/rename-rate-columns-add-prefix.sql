-- Rename rate columns to add rate_ prefix
-- Run this SQL in the Supabase SQL Editor

BEGIN;

-- Step 1: Rename the 10 columns
ALTER TABLE public.all_glamping_properties RENAME COLUMN avg_retail_daily_rate TO rate_avg_retail_daily_rate;
ALTER TABLE public.all_glamping_properties RENAME COLUMN winter_weekday TO rate_winter_weekday;
ALTER TABLE public.all_glamping_properties RENAME COLUMN winter_weekend TO rate_winter_weekend;
ALTER TABLE public.all_glamping_properties RENAME COLUMN spring_weekday TO rate_spring_weekday;
ALTER TABLE public.all_glamping_properties RENAME COLUMN spring_weekend TO rate_spring_weekend;
ALTER TABLE public.all_glamping_properties RENAME COLUMN summer_weekday TO rate_summer_weekday;
ALTER TABLE public.all_glamping_properties RENAME COLUMN summer_weekend TO rate_summer_weekend;
ALTER TABLE public.all_glamping_properties RENAME COLUMN fall_weekday TO rate_fall_weekday;
ALTER TABLE public.all_glamping_properties RENAME COLUMN fall_weekend TO rate_fall_weekend;
ALTER TABLE public.all_glamping_properties RENAME COLUMN unit_rates_by_year TO rate_unit_rates_by_year;

-- Step 2: Rename the constraint
ALTER TABLE public.all_glamping_properties
  DROP CONSTRAINT IF EXISTS unit_rates_by_year_is_object;
ALTER TABLE public.all_glamping_properties
  ADD CONSTRAINT rate_unit_rates_by_year_is_object CHECK (
    rate_unit_rates_by_year IS NULL OR jsonb_typeof(rate_unit_rates_by_year) = 'object'
  );

-- Step 3: Recreate calc_avg_retail_daily_rate() with new column names
CREATE OR REPLACE FUNCTION public.calc_avg_retail_daily_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.rate_avg_retail_daily_rate := (
    SELECT ROUND(AVG(val), 2)
    FROM unnest(ARRAY[
      NEW.rate_winter_weekday, NEW.rate_winter_weekend,
      NEW.rate_spring_weekday, NEW.rate_spring_weekend,
      NEW.rate_summer_weekday, NEW.rate_summer_weekend,
      NEW.rate_fall_weekday, NEW.rate_fall_weekend
    ]) AS val
    WHERE val IS NOT NULL
  );
  RETURN NEW;
END;
$$;

-- Step 4: Recreate sync_season_rates_from_latest_year() with new column names
CREATE OR REPLACE FUNCTION public.sync_season_rates_from_latest_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  y INT;
BEGIN
  y := public.latest_rate_year(NEW.rate_unit_rates_by_year);

  IF y IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.rate_winter_weekday := (NEW.rate_unit_rates_by_year -> y::text -> 'winter' ->> 'weekday')::NUMERIC;
  NEW.rate_winter_weekend := (NEW.rate_unit_rates_by_year -> y::text -> 'winter' ->> 'weekend')::NUMERIC;

  NEW.rate_spring_weekday := (NEW.rate_unit_rates_by_year -> y::text -> 'spring' ->> 'weekday')::NUMERIC;
  NEW.rate_spring_weekend := (NEW.rate_unit_rates_by_year -> y::text -> 'spring' ->> 'weekend')::NUMERIC;

  NEW.rate_summer_weekday := (NEW.rate_unit_rates_by_year -> y::text -> 'summer' ->> 'weekday')::NUMERIC;
  NEW.rate_summer_weekend := (NEW.rate_unit_rates_by_year -> y::text -> 'summer' ->> 'weekend')::NUMERIC;

  NEW.rate_fall_weekday := (NEW.rate_unit_rates_by_year -> y::text -> 'fall' ->> 'weekday')::NUMERIC;
  NEW.rate_fall_weekend := (NEW.rate_unit_rates_by_year -> y::text -> 'fall' ->> 'weekend')::NUMERIC;

  RETURN NEW;
END;
$$;

-- Step 5: Drop and recreate triggers with new column names
DROP TRIGGER IF EXISTS calc_avg_rate_trigger ON public.all_glamping_properties;
CREATE TRIGGER calc_avg_rate_trigger
  BEFORE INSERT OR UPDATE OF
    rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
    rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend
  ON public.all_glamping_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_avg_retail_daily_rate();

DROP TRIGGER IF EXISTS sync_season_rates_trigger ON public.all_glamping_properties;
CREATE TRIGGER sync_season_rates_trigger
  BEFORE INSERT OR UPDATE OF rate_unit_rates_by_year
  ON public.all_glamping_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_season_rates_from_latest_year();

COMMIT;
