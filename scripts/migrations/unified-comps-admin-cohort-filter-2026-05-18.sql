-- /admin/comps cohort: published Sage + is_glamping_property = Yes + property_type = Glamping.
-- Pass p_apply_admin_cohort := true from admin list / aggregate / geo count RPCs.

-- Shared predicate (inline in each function):
--   AND (NOT COALESCE(p_apply_admin_cohort, false) OR (
--     uc.is_glamping_property = 'Yes'
--     AND uc.property_type = 'Glamping'
--     AND (
--       uc.source <> 'all_glamping_properties'
--       OR EXISTS (
--         SELECT 1 FROM public.all_glamping_properties g
--         WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
--       )
--     )
--   ))

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_list_properties'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_list_properties(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50,
  p_sort_by text DEFAULT 'created_at',
  p_sort_asc boolean DEFAULT false,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (anchor jsonb, site_rows jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_per_page integer := least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_sort text := lower(btrim(coalesce(p_sort_by, 'created_at')));
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_list_properties: pass either p_tsquery or p_ilike_terms, not both';
  END IF;
  IF v_sort NOT IN ('created_at', 'property_name', 'state', 'total_sites', 'quality_score', 'low_adr', 'peak_adr') THEN
    v_sort := 'created_at';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT uc.*
    FROM public.unified_comps uc
    WHERE
      (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND uc.property_type = 'Glamping'
          AND (
            uc.source <> 'all_glamping_properties'
            OR EXISTS (
              SELECT 1
              FROM public.all_glamping_properties g
              WHERE g.id::text = uc.source_row_id
                AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
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
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ),
  grouped AS (
    SELECT
      f.source,
      COALESCE(NULLIF(trim(f.address_key), ''), f.id) AS prop_key,
      (jsonb_agg(to_jsonb(f) ORDER BY
        CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN f.property_name END ASC NULLS LAST,
        CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN f.property_name END DESC NULLS LAST,
        CASE WHEN v_sort = 'state' AND p_sort_asc THEN f.state END ASC NULLS LAST,
        CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN f.state END DESC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN f.total_sites END ASC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN f.total_sites END DESC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN f.quality_score END ASC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN f.quality_score END DESC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN f.low_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN f.low_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN f.peak_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN f.peak_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN f.created_at END ASC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN f.created_at END DESC NULLS LAST,
        f.id ASC
      ))->0 AS anchor,
      jsonb_agg(to_jsonb(f) ORDER BY f.id) AS site_rows
    FROM filtered f
    GROUP BY f.source, COALESCE(NULLIF(trim(f.address_key), ''), f.id)
  )
  SELECT g.anchor, g.site_rows
  FROM grouped g
  ORDER BY
    CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN g.anchor->>'property_name' END ASC NULLS LAST,
    CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN g.anchor->>'property_name' END DESC NULLS LAST,
    CASE WHEN v_sort = 'state' AND p_sort_asc THEN g.anchor->>'state' END ASC NULLS LAST,
    CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN g.anchor->>'state' END DESC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN (g.anchor->>'total_sites')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN (g.anchor->>'total_sites')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN (g.anchor->>'quality_score')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN (g.anchor->>'quality_score')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN (g.anchor->>'low_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN (g.anchor->>'low_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END ASC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END DESC NULLS LAST,
    g.anchor->>'id' ASC
  LIMIT v_per_page
  OFFSET v_offset;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_aggregate_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_aggregate_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (row_count bigint, distinct_address_count bigint)
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
  SELECT COUNT(*)::bigint, COUNT(DISTINCT uc.address_key)::bigint
  FROM public.unified_comps uc
  WHERE
    (p_sources IS NULL OR uc.source = ANY (p_sources))
    AND (p_states IS NULL OR uc.state = ANY (p_states))
    AND (p_countries IS NULL OR uc.country = ANY (p_countries))
    AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
    AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
    AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
    AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
    AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
    AND (
      NOT COALESCE(p_apply_admin_cohort, false)
      OR (
        uc.is_glamping_property = 'Yes'
        AND uc.property_type = 'Glamping'
        AND (
          uc.source <> 'all_glamping_properties'
          OR EXISTS (
            SELECT 1 FROM public.all_glamping_properties g
            WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
          )
        )
      )
    )
    AND (
      p_unit_categories IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
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
          SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
          WHERE NOT (
            uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
          )
        )
      )
    );
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (source text, marker_count bigint)
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
  SELECT t.source, COUNT(*)::bigint
  FROM (
    SELECT DISTINCT uc.source, COALESCE(NULLIF(trim(uc.address_key), ''), '__row:' || uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND uc.property_type = 'Glamping'
          AND (
            uc.source <> 'all_glamping_properties'
            OR EXISTS (
              SELECT 1 FROM public.all_glamping_properties g
              WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
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
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS rp
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'unified_comps_list_properties',
        'unified_comps_aggregate_counts',
        'unified_comps_geo_marker_counts'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', r.rp);
  END LOOP;
END $$;
