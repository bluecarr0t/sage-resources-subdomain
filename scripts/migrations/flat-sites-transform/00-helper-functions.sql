-- Phase 3 flat sites transform helpers (idempotent).
-- Used by 01-rebuild-campspot-flat.sql and 02-rebuild-hipcamp-flat.sql.

CREATE OR REPLACE FUNCTION public.flat_month_name(p_month int)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE p_month
    WHEN 1 THEN 'January'
    WHEN 2 THEN 'February'
    WHEN 3 THEN 'March'
    WHEN 4 THEN 'April'
    WHEN 5 THEN 'May'
    WHEN 6 THEN 'June'
    WHEN 7 THEN 'July'
    WHEN 8 THEN 'August'
    WHEN 9 THEN 'September'
    WHEN 10 THEN 'October'
    WHEN 11 THEN 'November'
    WHEN 12 THEN 'December'
    ELSE NULL
  END;
$$;

-- Occupancy in flat tables is a 0-1 decimal string (e.g. 0.19 = 19%). DO matview stores percent.
CREATE OR REPLACE FUNCTION public.flat_occupancy_decimal(avg_pct numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN avg_pct IS NULL THEN NULL
    ELSE round((avg_pct / 100.0)::numeric, 2)::text
  END;
$$;

CREATE OR REPLACE FUNCTION public.flat_rate_text(p_rate numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_rate IS NULL THEN NULL
    ELSE round(p_rate::numeric, 0)::text
  END;
$$;

CREATE OR REPLACE FUNCTION public.flat_is_placeholder_rate(p_rate numeric)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT round(p_rate::numeric, 2) IN (1011.50, 1026.67, 705.06);
$$;

-- JSON object amenities on sitedetails (key = label).
CREATE OR REPLACE FUNCTION public.flat_amenity_yes(amenities jsonb, label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN amenities IS NULL THEN NULL
    WHEN amenities ? label THEN 'Yes'
    ELSE 'No'
  END;
$$;

-- JSON array amenities (site_amenities on latest_sites).
CREATE OR REPLACE FUNCTION public.flat_amenity_arr_yes(arr jsonb, label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN arr IS NULL THEN NULL
    WHEN jsonb_typeof(arr) = 'array' AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(arr) elem
      WHERE elem = label OR elem ILIKE label
    ) THEN 'Yes'
    WHEN jsonb_typeof(arr) = 'object' AND arr ? label THEN 'Yes'
    ELSE 'No'
  END;
$$;

CREATE OR REPLACE FUNCTION public.flat_seasonal_rate(seasonal_rates jsonb, season text, day_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(trim(seasonal_rates #>> ARRAY[season, day_type]), '');
$$;
