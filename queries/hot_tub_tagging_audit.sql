-- =============================================================================
-- Hot tub tagging audit — published US glamping cohort (same filters as ARDR)
-- Run before/after scripts/research-hot-tub-glamping.ts backfill.
-- =============================================================================

WITH cohort AS (
  SELECT
    g.id,
    g.property_id,
    btrim(g.property_name) AS property_name,
    g.site_name,
    g.unit_type,
    g.url,
    g.ota_url_hipcamp,
    g.ota_url_airbnb,
    g.discovery_source,
    GREATEST(COALESCE(g.quantity_of_units, 1), 1)::numeric AS unit_weight,
    lower(btrim(coalesce(g.unit_hot_tub, ''))) AS unit_hot_tub,
    lower(btrim(coalesce(g.property_hot_tub, ''))) AS property_hot_tub,
    lower(btrim(coalesce(g.unit_hot_tub_or_sauna, ''))) AS unit_hot_tub_or_sauna,
    lower(btrim(coalesce(g.unit_sauna, ''))) AS unit_sauna,
    g.rate_avg_retail_daily_rate
  FROM all_glamping_properties g
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
rated AS (
  SELECT * FROM cohort WHERE rate_avg_retail_daily_rate > 0
)
SELECT 'cohort_rows' AS metric, COUNT(*)::bigint AS n FROM cohort
UNION ALL
SELECT 'cohort_units', SUM(unit_weight)::bigint FROM cohort
UNION ALL
SELECT 'distinct_properties', COUNT(DISTINCT property_id)::bigint FROM cohort
UNION ALL
SELECT 'rated_rows', COUNT(*)::bigint FROM rated
UNION ALL
SELECT 'rated_units', SUM(unit_weight)::bigint FROM rated;

-- Field coverage (all cohort rows)
SELECT
  'unit_hot_tub' AS field,
  COUNT(*) FILTER (WHERE unit_hot_tub IN ('yes', 'y')) AS yes_rows,
  COUNT(*) FILTER (WHERE unit_hot_tub IN ('no', 'n')) AS no_rows,
  COUNT(*) FILTER (WHERE unit_hot_tub = '' OR unit_hot_tub IS NULL) AS null_rows,
  ROUND(100.0 * COUNT(*) FILTER (WHERE unit_hot_tub IN ('yes', 'y', 'no', 'n')) / NULLIF(COUNT(*), 0), 1) AS pct_explicit
FROM cohort
UNION ALL
SELECT
  'property_hot_tub',
  COUNT(*) FILTER (WHERE property_hot_tub IN ('yes', 'y')),
  COUNT(*) FILTER (WHERE property_hot_tub IN ('no', 'n')),
  COUNT(*) FILTER (WHERE property_hot_tub = '' OR property_hot_tub IS NULL),
  ROUND(100.0 * COUNT(*) FILTER (WHERE property_hot_tub IN ('yes', 'y', 'no', 'n')) / NULLIF(COUNT(*), 0), 1)
FROM cohort
UNION ALL
SELECT
  'unit_hot_tub_or_sauna',
  COUNT(*) FILTER (WHERE unit_hot_tub_or_sauna IN ('yes', 'y')),
  COUNT(*) FILTER (WHERE unit_hot_tub_or_sauna IN ('no', 'n')),
  COUNT(*) FILTER (WHERE unit_hot_tub_or_sauna = '' OR unit_hot_tub_or_sauna IS NULL),
  ROUND(100.0 * COUNT(*) FILTER (WHERE unit_hot_tub_or_sauna IN ('yes', 'y', 'no', 'n')) / NULLIF(COUNT(*), 0), 1)
FROM cohort;

-- Any hot-tub signal (rated inventory only — ARDR driver universe)
SELECT
  COUNT(*) AS rated_rows,
  SUM(unit_weight)::bigint AS rated_units,
  COUNT(*) FILTER (
    WHERE unit_hot_tub IN ('yes', 'y')
  ) AS rows_unit_tub_yes,
  SUM(unit_weight) FILTER (WHERE unit_hot_tub IN ('yes', 'y'))::bigint AS units_unit_tub_yes,
  COUNT(*) FILTER (
    WHERE property_hot_tub IN ('yes', 'y') AND unit_hot_tub NOT IN ('yes', 'y')
  ) AS rows_property_only_tub,
  COUNT(*) FILTER (
    WHERE unit_hot_tub IN ('yes', 'y', 'no', 'n')
       OR property_hot_tub IN ('yes', 'y', 'no', 'n')
       OR unit_hot_tub_or_sauna IN ('yes', 'y', 'no', 'n')
  ) AS rows_any_explicit,
  ROUND(
    100.0 * SUM(unit_weight) FILTER (
      WHERE unit_hot_tub IN ('yes', 'y', 'no', 'n')
         OR property_hot_tub IN ('yes', 'y', 'no', 'n')
         OR unit_hot_tub_or_sauna IN ('yes', 'y', 'no', 'n')
    ) / NULLIF(SUM(unit_weight), 0),
    1
  ) AS pct_rated_units_any_explicit
FROM rated;

-- URL coverage for web research
SELECT
  COUNT(DISTINCT property_id) AS properties_total,
  COUNT(DISTINCT property_id) FILTER (
    WHERE btrim(coalesce(url, '')) <> ''
       OR btrim(coalesce(ota_url_hipcamp, '')) <> ''
       OR btrim(coalesce(ota_url_airbnb, '')) <> ''
  ) AS properties_with_scrape_url,
  COUNT(DISTINCT property_id) FILTER (
    WHERE (unit_hot_tub = '' OR unit_hot_tub IS NULL)
      AND (property_hot_tub = '' OR property_hot_tub IS NULL)
      AND (unit_hot_tub_or_sauna = '' OR unit_hot_tub_or_sauna IS NULL)
  ) AS properties_all_hot_tub_null,
  COUNT(DISTINCT property_id) FILTER (
    WHERE (unit_hot_tub = '' OR unit_hot_tub IS NULL)
      AND (property_hot_tub = '' OR property_hot_tub IS NULL)
      AND (unit_hot_tub_or_sauna = '' OR unit_hot_tub_or_sauna IS NULL)
      AND (
        btrim(coalesce(url, '')) <> ''
        OR btrim(coalesce(ota_url_hipcamp, '')) <> ''
        OR btrim(coalesce(ota_url_airbnb, '')) <> ''
      )
  ) AS properties_null_tub_with_url
FROM cohort;

-- Top properties by unit inventory (prioritize backfill)
SELECT
  property_id,
  MAX(property_name) AS property_name,
  COUNT(*) AS unit_rows,
  SUM(unit_weight)::bigint AS units,
  MAX(url) AS url,
  COUNT(*) FILTER (WHERE unit_hot_tub IN ('yes', 'y')) AS unit_tub_yes_rows
FROM cohort
GROUP BY property_id
ORDER BY units DESC
LIMIT 30;

-- Prior backfill runs
SELECT
  CASE
    WHEN coalesce(discovery_source, '') ILIKE '%web_research_hot_tub%' THEN 'hot_tub_research'
    ELSE 'other'
  END AS source_bucket,
  COUNT(*) AS rows
FROM cohort
GROUP BY 1
ORDER BY rows DESC;
