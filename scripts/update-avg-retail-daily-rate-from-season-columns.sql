-- Update avg_retail_daily_rate as the average of all non-null season/day columns
-- Also create a trigger to keep it in sync when season columns change
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Step 1: Update existing records
UPDATE public.all_glamping_properties
SET avg_retail_daily_rate = (
  SELECT ROUND(AVG(val), 2)
  FROM unnest(ARRAY[
    winter_weekday, winter_weekend,
    spring_weekday, spring_weekend,
    summer_weekday, summer_weekend,
    fall_weekday, fall_weekend
  ]) AS val
  WHERE val IS NOT NULL
)
WHERE (winter_weekday IS NOT NULL OR winter_weekend IS NOT NULL OR
       spring_weekday IS NOT NULL OR spring_weekend IS NOT NULL OR
       summer_weekday IS NOT NULL OR summer_weekend IS NOT NULL OR
       fall_weekday IS NOT NULL OR fall_weekend IS NOT NULL);

-- Step 2: Create trigger function to recalculate on season column changes
CREATE OR REPLACE FUNCTION public.calc_avg_retail_daily_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.avg_retail_daily_rate := (
    SELECT ROUND(AVG(val), 2)
    FROM unnest(ARRAY[
      NEW.winter_weekday, NEW.winter_weekend,
      NEW.spring_weekday, NEW.spring_weekend,
      NEW.summer_weekday, NEW.summer_weekend,
      NEW.fall_weekday, NEW.fall_weekend
    ]) AS val
    WHERE val IS NOT NULL
  );

  RETURN NEW;
END;
$$;

-- Step 3: Create trigger (fires when any season column changes)
DROP TRIGGER IF EXISTS calc_avg_rate_trigger ON public.all_glamping_properties;
CREATE TRIGGER calc_avg_rate_trigger
BEFORE INSERT OR UPDATE OF
  winter_weekday, winter_weekend,
  spring_weekday, spring_weekend,
  summer_weekday, summer_weekend,
  fall_weekday, fall_weekend
ON public.all_glamping_properties
FOR EACH ROW
EXECUTE FUNCTION public.calc_avg_retail_daily_rate();

COMMIT;
