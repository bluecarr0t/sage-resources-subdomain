-- Distinct facet values for /admin/comps filter dropdowns.
-- Replaces scanning unified_comps with a row LIMIT (which missed most states).

CREATE OR REPLACE FUNCTION public.unified_comps_facets()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sources',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT source AS s
          FROM public.unified_comps
          WHERE source IS NOT NULL AND btrim(source) <> ''
        ) src
      ),
      '[]'::jsonb
    ),
    'states',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT state AS s
          FROM public.unified_comps
          WHERE state IS NOT NULL AND btrim(state) <> ''
        ) st
      ),
      '[]'::jsonb
    ),
    'unit_categories',
    COALESCE(
      (
        SELECT jsonb_agg(c ORDER BY c)
        FROM (
          SELECT DISTINCT unit_category AS c
          FROM public.unified_comps
          WHERE unit_category IS NOT NULL AND btrim(unit_category) <> ''
        ) uc
      ),
      '[]'::jsonb
    ),
    'keywords',
    COALESCE(
      (
        SELECT jsonb_agg(k ORDER BY k)
        FROM (
          SELECT DISTINCT btrim(kw) AS k
          FROM public.unified_comps u
          CROSS JOIN LATERAL unnest(u.amenity_keywords) AS kw
          WHERE u.amenity_keywords IS NOT NULL AND btrim(kw) <> ''
        ) kw
      ),
      '[]'::jsonb
    )
  );
$$;

DO $$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'unified_comps_facets'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;
END $$;
