-- Add p_is_open filter to unified comps aggregate + geo marker count RPCs.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_aggregate_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_aggregate_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL
)
RETURNS TABLE (
  row_count bigint,
  distinct_address_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_aggregate_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(DISTINCT uc.address_key)::bigint
  FROM public.unified_comps uc
  WHERE
    (p_sources IS NULL OR uc.source = ANY (p_sources))
    AND (p_states IS NULL OR uc.state = ANY (p_states))
    AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
    AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
    AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
    AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
    AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
    AND (
      p_unit_categories IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(p_unit_categories) AS c (cat)
        WHERE uc.unit_category = c.cat
          OR uc.unit_type ILIKE (
            '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
          ) ESCAPE '\'
      )
    )
    AND (
      (NOT use_fts AND NOT use_ilike)
      OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
      OR (
        use_ilike
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(p_ilike_terms) AS t (term)
          WHERE NOT (
            uc.property_name ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR uc.city ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR COALESCE(uc.overview, '') ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR uc.state ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
          )
        )
      )
    );
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL
)
RETURNS TABLE (
  source text,
  marker_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_geo_marker_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    t.source,
    COUNT(*)::bigint
  FROM (
    SELECT DISTINCT
      uc.source,
      COALESCE(NULLIF(trim(uc.address_key), ''), '__row:' || uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL
      AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.city ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.state ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
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
    AND p.proname = 'unified_comps_aggregate_counts'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;

  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'unified_comps_geo_marker_counts'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;
END $$;
