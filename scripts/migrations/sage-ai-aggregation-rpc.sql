-- ============================================================================
-- Sage AI aggregation RPCs
--
-- Moves two hot-path tools from client-side aggregation to Postgres:
--   * aggregate_properties_v2(group_by text, filters jsonb)
--   * distinct_column_values(col text, max_rows int)
--
-- Both RPCs whitelist `group_by` / `col` against the same column set the
-- aggregate_properties tool uses, so the AI cannot pivot on arbitrary columns.
--
-- Apply with:
--   psql $DATABASE_URL -f scripts/migrations/sage-ai-aggregation-rpc.sql
-- or via Supabase SQL editor.
-- ============================================================================

-- Drop previous versions so re-runs are idempotent.
DROP FUNCTION IF EXISTS public.aggregate_properties_v2(text, jsonb);
DROP FUNCTION IF EXISTS public.distinct_column_values(text, integer);

-- ----------------------------------------------------------------------------
-- aggregate_properties_v2
-- Returns (key, count, avg_daily_rate, total_sites) grouped by one of the
-- allowlisted columns on all_glamping_properties.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.aggregate_properties_v2(
  group_by text,
  filters  jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  key             text,
  count           bigint,
  avg_daily_rate  numeric,
  total_sites     bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed_columns constant text[] := ARRAY[
    'state', 'city', 'country', 'unit_type', 'property_type',
    'source', 'discovery_source', 'research_status',
    'is_glamping_property', 'is_closed'
  ];
  v_state                 text := filters->>'state';
  v_country               text := filters->>'country';
  v_unit_type             text := filters->>'unit_type';
  v_is_glamping_property  text := filters->>'is_glamping_property';
  v_is_closed             text := filters->>'is_closed';
  v_city                  text := filters->>'city';
  v_property_type         text := filters->>'property_type';
  v_source                text := filters->>'source';
  v_discovery_source      text := filters->>'discovery_source';
  v_research_status       text := filters->>'research_status';
  sql_text                text;
BEGIN
  IF NOT (group_by = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'group_by % is not in the allowlist', group_by
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Build SQL with quote_ident (avoid format()/tuple edge cases) and keep
  -- $1..$10 aligned with EXECUTE USING — mismatches surface as "there is no
  -- parameter $N". `city`, `property_type`, `source`, `discovery_source`,
  -- and `research_status` use exact-match equality (lowercased) because their
  -- valid values are short, stable enums (e.g. research_status ∈
  -- {published, in_progress, new}). State/country/unit_type keep the
  -- ILIKE/contains semantics they had since v1 to be tolerant of casing.
  sql_text :=
    'SELECT '
      'COALESCE(' || quote_ident(group_by) || '::text, ''Unknown'') AS key, '
      'COUNT(*)::bigint AS count, '
      'ROUND(AVG(rate_avg_retail_daily_rate)::numeric, 2) AS avg_daily_rate, '
      'COALESCE(SUM(property_total_sites), 0)::bigint AS total_sites '
    'FROM all_glamping_properties '
    'WHERE '
      '($1::text IS NULL OR state ILIKE $1) '
      'AND ($2::text IS NULL OR country ILIKE ''%'' || $2 || ''%'') '
      'AND ($3::text IS NULL OR unit_type ILIKE ''%'' || $3 || ''%'') '
      'AND ($4::text IS NULL OR is_glamping_property = $4) '
      'AND ($5::text IS NULL OR is_closed = $5) '
      'AND ($6::text IS NULL OR city ILIKE $6) '
      'AND ($7::text IS NULL OR property_type ILIKE ''%'' || $7 || ''%'') '
      'AND ($8::text IS NULL OR source = $8) '
      'AND ($9::text IS NULL OR discovery_source = $9) '
      'AND ($10::text IS NULL OR LOWER(research_status) = LOWER($10)) '
    'GROUP BY 1 '
    'ORDER BY 2 DESC '
    'LIMIT 500';

  RETURN QUERY EXECUTE sql_text
    USING v_state, v_country, v_unit_type, v_is_glamping_property, v_is_closed,
          v_city, v_property_type, v_source, v_discovery_source, v_research_status;
END;
$$;

-- ----------------------------------------------------------------------------
-- distinct_column_values
-- Returns top-N distinct values for an allowlisted filterable column, ordered
-- by frequency. Mirrors the behavior of the old get_column_values tool.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.distinct_column_values(
  col      text,
  max_rows integer DEFAULT 50
)
RETURNS TABLE (
  value     text,
  row_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed_columns constant text[] := ARRAY[
    'state', 'city', 'country', 'unit_type', 'property_type',
    'source', 'discovery_source', 'research_status',
    'is_glamping_property', 'is_closed'
  ];
  sql_text text;
  capped   integer := LEAST(GREATEST(max_rows, 1), 500);
BEGIN
  IF NOT (col = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'column % is not in the allowlist', col
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  sql_text := format($f$
    SELECT
      %1$I::text        AS value,
      COUNT(*)::bigint  AS row_count
    FROM all_glamping_properties
    WHERE %1$I IS NOT NULL
    GROUP BY %1$I
    ORDER BY row_count DESC, value ASC
    LIMIT $1
  $f$, col);

  RETURN QUERY EXECUTE sql_text USING capped;
END;
$$;

-- Grant to authenticated users (RLS is not applicable to function calls; the
-- functions only read tables protected by RLS so the usual policies apply).
GRANT EXECUTE ON FUNCTION public.aggregate_properties_v2(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distinct_column_values(text, integer) TO authenticated;
