-- =============================================================================
-- Fuzzy search RPC for the unified_comps materialized view.
--
-- Fallback used by /api/admin/comps/unified when exact tsvector search returns
-- zero rows. Uses pg_trgm similarity() on property_name + overview.
--
-- Returns the synthetic `id` column of `unified_comps` (e.g. "rep:<uuid>",
-- "glamp:42") so the API can re-fetch the full row.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.search_unified_comps_fuzzy(
  p_terms text[],
  p_similarity_threshold float DEFAULT 0.4,
  p_limit int DEFAULT 500,
  p_sources text[] DEFAULT NULL
)
RETURNS TABLE (id text, score float)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  term text;
  max_score float;
BEGIN
  IF p_terms IS NULL OR array_length(p_terms, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      u.id,
      u.property_name,
      u.overview,
      u.source
    FROM public.unified_comps u
    WHERE (p_sources IS NULL OR u.source = ANY(p_sources))
  ),
  scored AS (
    SELECT
      c.id,
      -- Best similarity across all terms (AND-ish: require each term to cross threshold)
      (
        SELECT MIN(
          GREATEST(
            similarity(lower(c.property_name), lower(t)),
            similarity(lower(COALESCE(c.overview, '')), lower(t))
          )
        )
        FROM unnest(p_terms) t
      ) AS min_term_score
    FROM candidates c
  )
  SELECT s.id, s.min_term_score::float AS score
  FROM scored s
  WHERE s.min_term_score IS NOT NULL
    AND s.min_term_score >= p_similarity_threshold
  ORDER BY s.min_term_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_unified_comps_fuzzy(text[], float, int, text[])
  TO authenticated, anon, service_role;
