-- =============================================================================
-- Amenities tagging audit — all_sage_data structured Yes/No flags
-- Cohort: published US private-commercial open Glamping (ARDR-aligned)
-- Re-run via Supabase SQL editor or: npx tsx scripts/run-amenities-audit.ts
-- =============================================================================

-- Cohort size
WITH cohort AS (
  SELECT g.*
  FROM all_sage_data g
  WHERE g.is_glamping_property = 'Yes'
    AND g.research_status = 'published'
    AND (g.land_operator_category IS NULL OR g.land_operator_category = 'private_commercial')
    AND g.country IN ('United States', 'US', 'USA', 'United States of America')
    AND g.property_type = 'Glamping'
    AND lower(btrim(coalesce(g.is_open, ''))) = 'yes'
    AND NOT (coalesce(g.unit_type, '') ~* '\btent\s*site')
    AND lower(regexp_replace(coalesce(g.unit_type, ''), '\s+', ' ', 'g'))
        NOT IN ('vehicles', 'vehicle', 'rv site', 'rv sites')
)
SELECT 'cohort_rows' AS metric, COUNT(*)::bigint AS n FROM cohort
UNION ALL SELECT 'cohort_units', SUM(GREATEST(COALESCE(quantity_of_units, 1), 1))::bigint FROM cohort
UNION ALL SELECT 'distinct_properties', COUNT(DISTINCT property_id)::bigint FROM cohort
UNION ALL SELECT 'rated_rows', COUNT(*)::bigint FROM cohort WHERE rate_avg_retail_daily_rate > 0;

-- Per-field coverage (dynamic unpivot; excludes non-flag columns)
WITH cohort AS (
  SELECT g.*
  FROM all_sage_data g
  WHERE g.is_glamping_property = 'Yes'
    AND g.research_status = 'published'
    AND (g.land_operator_category IS NULL OR g.land_operator_category = 'private_commercial')
    AND g.country IN ('United States', 'US', 'USA', 'United States of America')
    AND g.property_type = 'Glamping'
    AND lower(btrim(coalesce(g.is_open, ''))) = 'yes'
    AND NOT (coalesce(g.unit_type, '') ~* '\btent\s*site')
    AND lower(regexp_replace(coalesce(g.unit_type, ''), '\s+', ' ', 'g'))
        NOT IN ('vehicles', 'vehicle', 'rv site', 'rv sites')
),
exclude AS (
  SELECT unnest(
    ARRAY[
      'unit_type', 'unit_capacity', 'unit_sq_ft', 'unit_description',
      'property_total_sites', 'property_id', 'property_name', 'property_type',
      'property_ota_platforms', 'activities_raw', 'amenities_raw', 'lifestyle_raw'
    ]
  ) AS col
),
expanded AS (
  SELECT
    e.key AS field,
    CASE
      WHEN e.key LIKE 'unit_%' THEN 'unit'
      WHEN e.key LIKE 'property_%' THEN 'property'
      WHEN e.key LIKE 'activities_%' THEN 'activities'
      WHEN e.key LIKE 'setting_%' OR e.key = 'river_stream_or_creek' THEN 'setting'
      WHEN e.key LIKE 'rv_%' THEN 'rv'
    END AS category,
    lower(btrim(coalesce(e.value, ''))) AS val
  FROM cohort c,
  LATERAL jsonb_each_text(to_jsonb(c)) AS e(key, value)
  WHERE (e.key ~ '^(unit_|property_|activities_|setting_|rv_)' OR e.key = 'river_stream_or_creek')
    AND e.key NOT IN (SELECT col FROM exclude)
),
coverage AS (
  SELECT
    field,
    category,
    COUNT(*)::bigint AS total_rows,
    COUNT(*) FILTER (WHERE val IN ('yes', 'y')) AS yes_rows,
    COUNT(*) FILTER (WHERE val IN ('no', 'n')) AS no_rows,
    COUNT(*) FILTER (WHERE val NOT IN ('yes', 'y', 'no', 'n')) AS gap_rows,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE val IN ('yes', 'y', 'no', 'n')) / NULLIF(COUNT(*), 0),
      1
    ) AS pct_explicit
  FROM expanded
  GROUP BY field, category
)
SELECT * FROM coverage ORDER BY gap_rows DESC, field;

-- Summary by category
WITH cohort AS (
  SELECT g.*
  FROM all_sage_data g
  WHERE g.is_glamping_property = 'Yes'
    AND g.research_status = 'published'
    AND (g.land_operator_category IS NULL OR g.land_operator_category = 'private_commercial')
    AND g.country IN ('United States', 'US', 'USA', 'United States of America')
    AND g.property_type = 'Glamping'
    AND lower(btrim(coalesce(g.is_open, ''))) = 'yes'
    AND NOT (coalesce(g.unit_type, '') ~* '\btent\s*site')
    AND lower(regexp_replace(coalesce(g.unit_type, ''), '\s+', ' ', 'g'))
        NOT IN ('vehicles', 'vehicle', 'rv site', 'rv sites')
),
exclude AS (
  SELECT unnest(
    ARRAY[
      'unit_type', 'unit_capacity', 'unit_sq_ft', 'unit_description',
      'property_total_sites', 'property_id', 'property_name', 'property_type',
      'property_ota_platforms', 'activities_raw', 'amenities_raw', 'lifestyle_raw'
    ]
  ) AS col
),
expanded AS (
  SELECT
    e.key AS field,
    CASE
      WHEN e.key LIKE 'unit_%' THEN 'unit'
      WHEN e.key LIKE 'property_%' THEN 'property'
      WHEN e.key LIKE 'activities_%' THEN 'activities'
      WHEN e.key LIKE 'setting_%' OR e.key = 'river_stream_or_creek' THEN 'setting'
      WHEN e.key LIKE 'rv_%' THEN 'rv'
    END AS category,
    lower(btrim(coalesce(e.value, ''))) AS val
  FROM cohort c,
  LATERAL jsonb_each_text(to_jsonb(c)) AS e(key, value)
  WHERE (e.key ~ '^(unit_|property_|activities_|setting_|rv_)' OR e.key = 'river_stream_or_creek')
    AND e.key NOT IN (SELECT col FROM exclude)
),
coverage AS (
  SELECT
    field,
    category,
    COUNT(*) FILTER (WHERE val NOT IN ('yes', 'y', 'no', 'n')) AS gap_rows,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE val IN ('yes', 'y', 'no', 'n')) / NULLIF(COUNT(*), 0),
      1
    ) AS pct_explicit
  FROM expanded
  GROUP BY field, category
)
SELECT
  category,
  COUNT(*) AS fields,
  SUM(gap_rows) AS total_gap_rows,
  ROUND(AVG(pct_explicit), 1) AS avg_pct_explicit,
  MIN(pct_explicit) AS min_pct_explicit,
  COUNT(*) FILTER (WHERE pct_explicit >= 50) AS fields_at_least_50pct,
  COUNT(*) FILTER (WHERE pct_explicit < 25) AS fields_under_25pct
FROM coverage
GROUP BY category
ORDER BY avg_pct_explicit DESC;

-- Raw text fallbacks
SELECT
  COUNT(*) AS cohort_rows,
  COUNT(*) FILTER (WHERE btrim(coalesce(amenities_raw, '')) <> '') AS rows_amenities_raw,
  COUNT(*) FILTER (WHERE btrim(coalesce(activities_raw, '')) <> '') AS rows_activities_raw,
  COUNT(*) FILTER (WHERE btrim(coalesce(lifestyle_raw, '')) <> '') AS rows_lifestyle_raw
FROM all_sage_data g
WHERE g.is_glamping_property = 'Yes'
  AND g.research_status = 'published'
  AND (g.land_operator_category IS NULL OR g.land_operator_category = 'private_commercial')
  AND g.country IN ('United States', 'US', 'USA', 'United States of America')
  AND g.property_type = 'Glamping'
  AND lower(btrim(coalesce(g.is_open, ''))) = 'yes'
  AND NOT (coalesce(g.unit_type, '') ~* '\btent\s*site')
  AND lower(regexp_replace(coalesce(g.unit_type, ''), '\s+', ' ', 'g'))
      NOT IN ('vehicles', 'vehicle', 'rv site', 'rv sites');
