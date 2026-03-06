-- Fuzzy Search RPC for Comparables
-- Run in Supabase SQL Editor
-- Requires: pg_trgm extension (from comparables-search-performance.sql)
-- When exact search returns 0 results, call this to find similar matches via trigram similarity

CREATE OR REPLACE FUNCTION search_comparables_fuzzy(
  p_terms text[],
  p_similarity_threshold float DEFAULT 0.4,
  p_limit int DEFAULT 1000
)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  term text;
  comp record;
  match bool;
  cnt int := 0;
  comp_name_trimmed text;
BEGIN
  -- Require pg_trgm for similarity()
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    RAISE EXCEPTION 'pg_trgm extension is required. Run comparables-search-performance.sql first.';
  END IF;

  FOR comp IN
    SELECT fc.id, fc.comp_name, fc.overview, r.study_id
    FROM feasibility_comparables fc
    JOIN reports r ON r.id = fc.report_id
  LOOP
    -- isValidCompName-style filters
    comp_name_trimmed := trim(coalesce(comp.comp_name, ''));
    IF comp_name_trimmed = '' OR length(comp_name_trimmed) > 80 THEN
      CONTINUE;
    END IF;
    IF comp_name_trimmed ~ '^\d+(\.\d+)?$' THEN
      CONTINUE;
    END IF;
    IF comp_name_trimmed ~* '^(subject\s+projection|subject\s+property)$' THEN
      CONTINUE;
    END IF;
    IF comp_name_trimmed ~* '\y(resort\s+fee|charges\s+a|incl\.|including|on\s+site\s+activit)' THEN
      CONTINUE;
    END IF;
    IF comp_name_trimmed ~ '^[\d.\s]+$' THEN
      CONTINUE;
    END IF;
    IF array_length(regexp_split_to_array(comp_name_trimmed, '\s+'), 1) > 15 THEN
      CONTINUE;
    END IF;

    match := true;
    FOREACH term IN ARRAY p_terms LOOP
      match := match AND (
        similarity(lower(coalesce(comp.comp_name, '')), lower(term)) > p_similarity_threshold
        OR similarity(lower(coalesce(comp.overview, '')), lower(term)) > p_similarity_threshold
        OR lower(coalesce(comp.study_id, '')) LIKE '%' || lower(term) || '%'
      );
    END LOOP;

    IF match THEN
      RETURN NEXT comp.id;
      cnt := cnt + 1;
      IF cnt >= p_limit THEN
        RETURN;
      END IF;
    END IF;
  END LOOP;
END;
$$;
