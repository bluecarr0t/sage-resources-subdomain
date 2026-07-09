-- ============================================================================
-- Allow literal `closed` on seasonal rate_* columns (TEXT), excluding closed
-- cells from rate_avg_retail_daily_rate while preserving them in JSON sync.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.season_rate_text_to_numeric(t TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN t IS NULL OR btrim(t) = '' THEN NULL::NUMERIC
    WHEN lower(btrim(t)) = 'closed' THEN NULL::NUMERIC
    WHEN btrim(t) ~ '^-?[0-9]+(\.[0-9]+)?$' THEN btrim(t)::NUMERIC
    ELSE NULL::NUMERIC
  END;
$$;

CREATE OR REPLACE FUNCTION public.season_rate_text_from_json(v JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN v IS NULL OR v = 'null'::jsonb THEN NULL::TEXT
    WHEN jsonb_typeof(v) = 'string' THEN
      CASE
        WHEN lower(btrim(v #>> '{}')) = 'closed' THEN 'closed'
        WHEN btrim(v #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN btrim(v #>> '{}')
        ELSE NULL::TEXT
      END
    WHEN jsonb_typeof(v) = 'number' THEN (v #>> '{}')::TEXT
    ELSE NULL::TEXT
  END;
$$;

-- unified_comps matview reads seasonal rate columns; drop and refresh after this migration.
DROP MATERIALIZED VIEW IF EXISTS public.unified_comps;

DROP TRIGGER IF EXISTS calc_avg_rate_trigger ON public.all_glamping_properties;
DROP TRIGGER IF EXISTS sync_season_rates_trigger ON public.all_glamping_properties;
DROP VIEW IF EXISTS public.all_glamping_properties_list_anchors;

ALTER TABLE public.all_glamping_properties
  ALTER COLUMN rate_winter_weekday TYPE TEXT USING rate_winter_weekday::TEXT,
  ALTER COLUMN rate_winter_weekend TYPE TEXT USING rate_winter_weekend::TEXT,
  ALTER COLUMN rate_spring_weekday TYPE TEXT USING rate_spring_weekday::TEXT,
  ALTER COLUMN rate_spring_weekend TYPE TEXT USING rate_spring_weekend::TEXT,
  ALTER COLUMN rate_summer_weekday TYPE TEXT USING rate_summer_weekday::TEXT,
  ALTER COLUMN rate_summer_weekend TYPE TEXT USING rate_summer_weekend::TEXT,
  ALTER COLUMN rate_fall_weekday TYPE TEXT USING rate_fall_weekday::TEXT,
  ALTER COLUMN rate_fall_weekend TYPE TEXT USING rate_fall_weekend::TEXT;

CREATE OR REPLACE FUNCTION public.calc_avg_retail_daily_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.rate_avg_retail_daily_rate := (
    SELECT ROUND(AVG(public.season_rate_text_to_numeric(val)), 2)
    FROM unnest(ARRAY[
      NEW.rate_winter_weekday, NEW.rate_winter_weekend,
      NEW.rate_spring_weekday, NEW.rate_spring_weekend,
      NEW.rate_summer_weekday, NEW.rate_summer_weekend,
      NEW.rate_fall_weekday, NEW.rate_fall_weekend
    ]) AS val
    WHERE public.season_rate_text_to_numeric(val) IS NOT NULL
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_season_rates_from_latest_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  y INT;
  yr JSONB;
BEGIN
  y := public.latest_rate_year(NEW.rate_unit_rates_by_year);

  IF y IS NULL THEN
    RETURN NEW;
  END IF;

  yr := NEW.rate_unit_rates_by_year -> y::text;

  NEW.rate_winter_weekday := public.season_rate_text_from_json(yr -> 'winter' -> 'weekday');
  NEW.rate_winter_weekend := public.season_rate_text_from_json(yr -> 'winter' -> 'weekend');
  NEW.rate_spring_weekday := public.season_rate_text_from_json(yr -> 'spring' -> 'weekday');
  NEW.rate_spring_weekend := public.season_rate_text_from_json(yr -> 'spring' -> 'weekend');
  NEW.rate_summer_weekday := public.season_rate_text_from_json(yr -> 'summer' -> 'weekday');
  NEW.rate_summer_weekend := public.season_rate_text_from_json(yr -> 'summer' -> 'weekend');
  NEW.rate_fall_weekday := public.season_rate_text_from_json(yr -> 'fall' -> 'weekday');
  NEW.rate_fall_weekend := public.season_rate_text_from_json(yr -> 'fall' -> 'weekend');

  RETURN NEW;
END;
$$;

CREATE TRIGGER calc_avg_rate_trigger
  BEFORE INSERT OR UPDATE OF
    rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
    rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend
  ON public.all_glamping_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.calc_avg_retail_daily_rate();

CREATE TRIGGER sync_season_rates_trigger
  BEFORE INSERT OR UPDATE OF rate_unit_rates_by_year
  ON public.all_glamping_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_season_rates_from_latest_year();

CREATE VIEW public.all_glamping_properties_list_anchors AS
SELECT DISTINCT ON (
  COALESCE(
    agp.property_id::text,
    NULLIF(btrim(agp.slug), ''),
    lower(btrim(coalesce(agp.property_name, ''))) || '|' ||
      lower(btrim(coalesce(agp.city, ''))) || '|' ||
      lower(btrim(coalesce(agp.state, '')))
  )
)
  agp.*
FROM public.all_glamping_properties agp
ORDER BY
  COALESCE(
    agp.property_id::text,
    NULLIF(btrim(agp.slug), ''),
    lower(btrim(coalesce(agp.property_name, ''))) || '|' ||
      lower(btrim(coalesce(agp.city, ''))) || '|' ||
      lower(btrim(coalesce(agp.state, '')))
  ),
  agp.id;

COMMENT ON VIEW public.all_glamping_properties_list_anchors IS
  'Deduped admin Sage Data list: one row per logical property (lowest id = anchor).';

GRANT SELECT ON public.all_glamping_properties_list_anchors TO authenticated;
GRANT SELECT ON public.all_glamping_properties_list_anchors TO service_role;

COMMIT;

-- Post-migration: recreate unified comps (ADR columns use numeric rates only; `closed` excluded).
--   npm run refresh:downstream -- --only=unified_comps
