-- Generated numeric lat/lon for bbox filters on Sites Export (and other geo queries).
-- Safe parse: invalid text becomes NULL.
-- Run in Supabase SQL editor when ready; sites export uses lat_num/lon_num bbox by default (opt-out: SITES_EXPORT_LAT_LON_NUM_GEO=0).
-- After this, run sites-export-hipcamp-campspot-bbox-rpc.sql so zip/radius exports page ids via SQL (text_to_double_safe) and cannot full-scan the table.

CREATE OR REPLACE FUNCTION public.text_to_double_safe(txt text)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF txt IS NULL OR trim(txt) = '' THEN
    RETURN NULL;
  END IF;
  RETURN trim(txt)::double precision;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

ALTER TABLE public.hipcamp
  ADD COLUMN IF NOT EXISTS lat_num double precision
  GENERATED ALWAYS AS (public.text_to_double_safe(lat)) STORED;

ALTER TABLE public.hipcamp
  ADD COLUMN IF NOT EXISTS lon_num double precision
  GENERATED ALWAYS AS (public.text_to_double_safe(lon)) STORED;

ALTER TABLE public.campspot
  ADD COLUMN IF NOT EXISTS lat_num double precision
  GENERATED ALWAYS AS (public.text_to_double_safe(lat)) STORED;

ALTER TABLE public.campspot
  ADD COLUMN IF NOT EXISTS lon_num double precision
  GENERATED ALWAYS AS (public.text_to_double_safe(lon)) STORED;

CREATE INDEX IF NOT EXISTS idx_hipcamp_lat_lon_num
  ON public.hipcamp (lat_num, lon_num)
  WHERE lat_num IS NOT NULL AND lon_num IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campspot_lat_lon_num
  ON public.campspot (lat_num, lon_num)
  WHERE lat_num IS NOT NULL AND lon_num IS NOT NULL;
