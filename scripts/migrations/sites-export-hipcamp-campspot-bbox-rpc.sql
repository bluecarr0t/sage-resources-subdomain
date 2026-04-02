-- REQUIRED for admin Sites Export when using zip + mile radius on Hipcamp or Campspot.
-- Without these functions, the app returns HTTP 503 instead of dumping the full table (~200MB+ CSV).
--
-- Prerequisite: public.text_to_double_safe from add-hipcamp-campspot-lat-lon-numeric.sql (run that first).
-- After applying: Supabase Dashboard → Settings → API → Reload schema (or wait for cache refresh).

CREATE OR REPLACE FUNCTION public.sites_export_hipcamp_bbox_ids(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_after bigint,
  p_limit integer,
  p_countries text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_unit_types text[] DEFAULT NULL
)
RETURNS TABLE (id bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT h.id
  FROM public.hipcamp h
  WHERE h.id > p_after
    AND public.text_to_double_safe(h.lat) IS NOT NULL
    AND public.text_to_double_safe(h.lon) IS NOT NULL
    AND public.text_to_double_safe(h.lat) >= p_min_lat
    AND public.text_to_double_safe(h.lat) <= p_max_lat
    AND public.text_to_double_safe(h.lon) >= p_min_lng
    AND public.text_to_double_safe(h.lon) <= p_max_lng
    AND (p_countries IS NULL OR h.country = ANY (p_countries))
    AND (p_states IS NULL OR h.state = ANY (p_states))
    AND (p_unit_types IS NULL OR h.unit_type = ANY (p_unit_types))
  ORDER BY h.id
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 1000), 2000));
$$;

CREATE OR REPLACE FUNCTION public.sites_export_campspot_bbox_ids(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_after bigint,
  p_limit integer,
  p_countries text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_unit_types text[] DEFAULT NULL
)
RETURNS TABLE (id bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id
  FROM public.campspot c
  WHERE c.id > p_after
    AND public.text_to_double_safe(c.lat) IS NOT NULL
    AND public.text_to_double_safe(c.lon) IS NOT NULL
    AND public.text_to_double_safe(c.lat) >= p_min_lat
    AND public.text_to_double_safe(c.lat) <= p_max_lat
    AND public.text_to_double_safe(c.lon) >= p_min_lng
    AND public.text_to_double_safe(c.lon) <= p_max_lng
    AND (p_countries IS NULL OR c.country = ANY (p_countries))
    AND (p_states IS NULL OR c.state = ANY (p_states))
    AND (p_unit_types IS NULL OR c.unit_type = ANY (p_unit_types))
  ORDER BY c.id
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 1000), 2000));
$$;

GRANT EXECUTE ON FUNCTION public.sites_export_hipcamp_bbox_ids(
  double precision, double precision, double precision, double precision,
  bigint, integer, text[], text[], text[]
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.sites_export_campspot_bbox_ids(
  double precision, double precision, double precision, double precision,
  bigint, integer, text[], text[], text[]
) TO anon, authenticated, service_role;
