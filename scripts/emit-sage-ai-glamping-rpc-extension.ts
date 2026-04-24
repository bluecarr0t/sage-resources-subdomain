/**
 * Regenerates scripts/migrations/sage-ai-extend-glamping-allowlist-rpc.sql
 * from lib/sage-ai/all-glamping-properties-columns.ts
 *
 *   npx tsx scripts/emit-sage-ai-glamping-rpc-extension.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  GLAMPING_RPC_GROUP_BY_COLUMNS,
  GLAMPING_RPC_DISTINCT_COLUMNS,
} from '../lib/sage-ai/all-glamping-properties-columns';

function fmtPgArray(cols: readonly string[]): string {
  return `ARRAY[\n    ${cols.map((c) => `'${c.replace(/'/g, "''")}'`).join(',\n    ')}\n  ]`;
}

const out = `-- ============================================================================
-- Sage AI: extend aggregate_properties_v2 / distinct_column_values allowlists
-- to full glamping property feature columns (unit_*, property_*, activities_*,
-- setting_*, rv_*, etc.). Safe to re-run: drops and recreates the functions.
--
-- Apply in Supabase SQL editor (or: psql \$DATABASE_URL -f this file).
-- Regenerate: npx tsx scripts/emit-sage-ai-glamping-rpc-extension.ts
-- ============================================================================

-- Dedupe key aligned with count_unique_properties / Sage AI tools (address, else name|city|state|country)
CREATE OR REPLACE FUNCTION public.sage_property_dedupe_key_for_aggregation(
  p_address        text,
  p_property_name  text,
  p_city          text,
  p_state         text,
  p_country       text
) RETURNS text
LANGUAGE SQL
STABLE
AS $$
  SELECT
    CASE
      WHEN NULLIF(btrim(COALESCE(p_address, '')), '') IS NOT NULL
      THEN lower(btrim(COALESCE(p_address, '')))
      ELSE
        lower(btrim(COALESCE(p_property_name, '')))
        || '|' || lower(btrim(COALESCE(p_city, '')))
        || '|' || lower(btrim(COALESCE(p_state, '')))
        || '|' || lower(btrim(COALESCE(p_country, '')))
    END
$$;

DROP FUNCTION IF EXISTS public.aggregate_properties_v2(text, jsonb);
DROP FUNCTION IF EXISTS public.distinct_column_values(text, integer);

CREATE FUNCTION public.aggregate_properties_v2(
  group_by text,
  filters  jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  key                 text,
  unique_properties  bigint,
  avg_daily_rate      numeric,
  median_daily_rate   numeric,
  total_units         bigint,
  total_sites         bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed_columns constant text[] := ${fmtPgArray(GLAMPING_RPC_GROUP_BY_COLUMNS)};
  v_state                 text := filters->>'state';
  v_country               text := filters->>'country';
  v_unit_type             text := filters->>'unit_type';
  v_is_glamping_property  text := filters->>'is_glamping_property';
  v_is_open               text := filters->>'is_open';
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

  sql_text :=
    'WITH s AS ( '
      'SELECT '
        'COALESCE(' || quote_ident(group_by) || '::text, ''Unknown'') AS gk, '
        'GREATEST(COALESCE(quantity_of_units, 1), 1)::numeric AS wgt, '
        'quantity_of_units, '
        'property_total_sites, '
        'public.sage_property_dedupe_key_for_aggregation('
        'address::text, property_name, city, state, country) AS property_key, '
        'COALESCE( (SELECT ROUND(AVG(v::numeric), 2) FROM unnest(ARRAY['
        'rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, '
        'rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend'
        ']) AS t(v) WHERE v IS NOT NULL AND v::numeric > 0), '
        'NULLIF(rate_avg_retail_daily_rate, 0)::numeric) AS eff_adr '
      'FROM all_glamping_properties WHERE '
        '($1::text IS NULL OR state ILIKE $1) '
        'AND ($2::text IS NULL OR country ILIKE ''%'' || $2 || ''%'') '
        'AND ($3::text IS NULL OR unit_type ILIKE ''%'' || $3 || ''%'') '
        'AND ($4::text IS NULL OR is_glamping_property = $4) '
        'AND ($5::text IS NULL OR is_open = $5) '
        'AND ($6::text IS NULL OR city ILIKE $6) '
        'AND ($7::text IS NULL OR property_type ILIKE ''%'' || $7 || ''%'') '
        'AND ($8::text IS NULL OR source = $8) '
        'AND ($9::text IS NULL OR discovery_source = $9) '
        'AND ($10::text IS NULL OR LOWER(research_status) = LOWER($10)) '
    '), '
    'grp AS ( '
      'SELECT gk, COUNT(DISTINCT property_key)::bigint AS unique_property_count, '
        'COALESCE(SUM(quantity_of_units), 0)::bigint AS total_units, '
        'COALESCE(SUM(property_total_sites), 0)::bigint AS total_sites '
      'FROM s GROUP BY gk '
    '), '
    'rated AS ( SELECT gk, eff_adr, wgt FROM s WHERE eff_adr IS NOT NULL AND eff_adr::numeric > 0 ), '
    'qstats AS ( '
      'SELECT gk, COUNT(*)::bigint AS n, '
        'PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY eff_adr) AS q1, '
        'PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY eff_adr) AS q3 '
      'FROM rated GROUP BY gk '
    '), '
    'rf AS ( '
      'SELECT r.gk, r.eff_adr, r.wgt, q.n, q.q1, q.q3, '
        'CASE '
          'WHEN q.n < 4 THEN true '
          'WHEN (q.q3 - q.q1) = 0 OR (q.q3 - q.q1) IS NULL THEN true '
          'WHEN r.eff_adr >= q.q1 - 1.5 * (q.q3 - q.q1) AND r.eff_adr <= q.q3 + 1.5 * (q.q3 - q.q1) THEN true '
          'ELSE false '
        'END AS use_row '
      'FROM rated r INNER JOIN qstats q ON r.gk = q.gk '
    '), '
    'u AS ( '
      'SELECT rf.gk, rf.eff_adr, rf.wgt, '
        'CASE '
          'WHEN SUM(CASE WHEN rf.use_row THEN rf.wgt END) OVER (PARTITION BY rf.gk) > 0 '
            'THEN rf.use_row '
          'ELSE true '
        'END AS use_final '
      'FROM rf '
    '), '
    'uk AS ( SELECT gk, eff_adr, wgt FROM u WHERE use_final AND eff_adr IS NOT NULL ), '
    'ag_avg AS ( '
      'SELECT gk, '
        'ROUND( (SUM(eff_adr * wgt) / NULLIF(SUM(wgt), 0))::numeric, 2) AS avg_daily_rate '
      'FROM uk GROUP BY gk '
    '), '
    'ag_med AS ( '
      'SELECT gk, '
        'ROUND( (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY eff_adr))::numeric, 2) AS median_daily_rate '
      'FROM uk GROUP BY gk '
    ') '
    'SELECT g.gk AS key, g.unique_property_count AS unique_properties, a.avg_daily_rate, m.median_daily_rate, '
    'g.total_units, g.total_sites '
    'FROM grp g '
    'LEFT JOIN ag_avg a ON a.gk = g.gk '
    'LEFT JOIN ag_med m ON m.gk = g.gk '
    'ORDER BY 2 DESC '
    'LIMIT 500';

  RETURN QUERY EXECUTE sql_text
    USING v_state, v_country, v_unit_type, v_is_glamping_property, v_is_open,
          v_city, v_property_type, v_source, v_discovery_source, v_research_status;
END;
$$;

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
  allowed_columns constant text[] := ${fmtPgArray(GLAMPING_RPC_DISTINCT_COLUMNS)};
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

GRANT EXECUTE ON FUNCTION public.aggregate_properties_v2(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distinct_column_values(text, integer) TO authenticated;
`;

writeFileSync(
  join(__dirname, 'migrations', 'sage-ai-extend-glamping-allowlist-rpc.sql'),
  out,
  'utf8'
);
console.log('Wrote scripts/migrations/sage-ai-extend-glamping-allowlist-rpc.sql');
