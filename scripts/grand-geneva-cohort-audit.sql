-- Grand Geneva (Lake Geneva, WI) glamping cohort audit
-- Anchor: 42.594, -88.434
-- Used to validate the dedupe logic in lib/market-report/dedupe.ts and to source
-- the headline numbers in the Grand Geneva luxury-glamping feasibility deck.
--
-- Run via: supabase mcp execute_sql, or psql against sage-outdoor-advisory.
-- Bounding box (~1.5 deg lat ≈ 100mi; lng adjusted for WI latitude):
--   lat 41.0–44.2, lon -90.5..-86.4

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Raw vs. deduped row counts (Tier A, glamping table only)
-- ─────────────────────────────────────────────────────────────────────────────
WITH base AS (
  SELECT
    property_name,
    UPPER(TRIM(state)) AS state,
    COALESCE(NULLIF(TRIM(unit_type), ''), 'Unspecified') AS unit_type_norm
  FROM all_glamping_properties
  WHERE property_name IS NOT NULL
),
collapsed AS (SELECT DISTINCT property_name, state, unit_type_norm FROM base)
SELECT 'raw_rows' AS metric, COUNT(*)::text AS value
  FROM all_glamping_properties
UNION ALL SELECT 'distinct_properties_raw',
  COUNT(DISTINCT (property_name, UPPER(TRIM(state))))::text
  FROM all_glamping_properties WHERE property_name IS NOT NULL
UNION ALL SELECT 'collapsed_property_unit_rows', COUNT(*)::text FROM collapsed
UNION ALL SELECT 'collapsed_distinct_properties',
  COUNT(DISTINCT (property_name, state))::text FROM collapsed;

-- Expected (as of May 2026): 2049 → 1582 → 1261 distinct properties.
-- ~23% inflation from rate-tier and dirty-duplicate rows.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tier A cohort across glamping + campspot + hipcamp, deduped, with two radii
-- ─────────────────────────────────────────────────────────────────────────────
WITH g AS (
  SELECT 'all_glamping_properties' AS src, property_name, UPPER(TRIM(state)) AS state,
    COALESCE(NULLIF(TRIM(unit_type),''),'Unspecified') AS unit_type_norm,
    rate_avg_retail_daily_rate AS adr,
    NULLIF(quantity_of_units,0) AS qty,
    NULLIF(property_total_sites,0) AS sites,
    lat::float AS lat, lon::float AS lon,
    season_open_month, season_close_month
  FROM all_glamping_properties
  WHERE property_name IS NOT NULL
    AND lat BETWEEN 41.0 AND 44.2 AND lon BETWEEN -90.5 AND -86.4
),
cs AS (
  SELECT 'campspot' AS src, property_name, UPPER(TRIM(state)) AS state,
    COALESCE(NULLIF(TRIM(unit_type),''),'Unspecified') AS unit_type_norm,
    NULLIF(REGEXP_REPLACE(avg_retail_daily_rate_2025, '[^0-9.]', '', 'g'),'')::numeric AS adr,
    NULLIF(REGEXP_REPLACE(quantity_of_units, '[^0-9.]', '', 'g'),'')::numeric AS qty,
    NULLIF(REGEXP_REPLACE(property_total_sites, '[^0-9.]', '', 'g'),'')::numeric AS sites,
    lat_num AS lat, lon_num AS lon,
    NULL::smallint AS season_open_month, NULL::smallint AS season_close_month
  FROM campspot
  WHERE property_name IS NOT NULL
    AND lat_num BETWEEN 41.0 AND 44.2 AND lon_num BETWEEN -90.5 AND -86.4
),
hc AS (
  SELECT 'hipcamp' AS src, property_name, UPPER(TRIM(state)) AS state,
    COALESCE(NULLIF(TRIM(unit_type),''),'Unspecified') AS unit_type_norm,
    NULLIF(REGEXP_REPLACE(avg_retail_daily_rate_2025, '[^0-9.]', '', 'g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(quantity_of_units, '[^0-9.]', '', 'g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(property_total_sites, '[^0-9.]', '', 'g'),'')::numeric,
    lat_num, lon_num,
    NULL::smallint, NULL::smallint
  FROM hipcamp
  WHERE property_name IS NOT NULL
    AND lat_num BETWEEN 41.0 AND 44.2 AND lon_num BETWEEN -90.5 AND -86.4
),
u AS (SELECT * FROM g UNION ALL SELECT * FROM cs UNION ALL SELECT * FROM hc),
collapsed AS (
  SELECT src, property_name, state, unit_type_norm,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adr) AS adr_med,
    MIN(adr) AS adr_low, MAX(adr) AS adr_high,
    MAX(qty) AS unit_count, MAX(sites) AS total_sites,
    (ARRAY_AGG(lat ORDER BY lat NULLS LAST))[1] AS lat,
    (ARRAY_AGG(lon ORDER BY lon NULLS LAST))[1] AS lon,
    MIN(season_open_month) AS season_open_month,
    MAX(season_close_month) AS season_close_month
  FROM u
  GROUP BY src, property_name, state, unit_type_norm
),
wd AS (
  SELECT *,
    3958.8 * 2 * ASIN(
      SQRT(POWER(SIN(RADIANS((lat - 42.594) / 2)), 2)
        + COS(RADIANS(42.594)) * COS(RADIANS(lat))
        * POWER(SIN(RADIANS((lon - -88.434) / 2)), 2))
    ) AS dist_mi
  FROM collapsed
)
SELECT
  src,
  COUNT(*) FILTER (WHERE dist_mi <= 100) AS unit_rows_100mi,
  COUNT(DISTINCT (property_name, state)) FILTER (WHERE dist_mi <= 100) AS distinct_props_100mi,
  COUNT(*) FILTER (WHERE dist_mi <= 30) AS unit_rows_30mi,
  COUNT(DISTINCT (property_name, state)) FILTER (WHERE dist_mi <= 30) AS distinct_props_30mi,
  COUNT(*) FILTER (WHERE dist_mi <= 100 AND adr_med >= 400) AS units_adr_ge_400,
  COUNT(*) FILTER (WHERE dist_mi <= 100 AND adr_med >= 600) AS units_adr_ge_600,
  ROUND(AVG(adr_med) FILTER (WHERE dist_mi <= 100)::numeric, 0) AS avg_adr,
  COUNT(*) FILTER (WHERE dist_mi <= 100 AND season_open_month = 1 AND season_close_month = 12) AS year_round_units
FROM wd
GROUP BY src
ORDER BY src;

-- Expected (May 2026):
--   glamping  → 4 / 4 props 100mi, 1 / 1 props 30mi, 1 unit ≥ $400, avg ADR $284
--   campspot  → 55 / 26 props 100mi, 4 / 2 props 30mi, 0 units ≥ $400, avg ADR $78
--   hipcamp   → 125 / 92 props 100mi, 21 / 17 props 30mi, 1 unit ≥ $400, avg ADR $73
--
-- Headline: ~120 properties in 100mi radius, only 2 with ADR ≥ $400/night.
-- The luxury glamping market within ~2hr drive of Lake Geneva is essentially uncontested.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Tier C: feasibility_comp_units high-end benchmark coverage
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  unit_category,
  COUNT(*) AS unit_rows,
  COUNT(DISTINCT property_name) AS distinct_properties,
  ROUND(AVG(avg_annual_adr)::numeric, 0) AS avg_adr,
  COUNT(*) FILTER (WHERE avg_annual_adr >= 400) AS rows_adr_ge_400,
  ROUND(AVG(low_occupancy)::numeric, 2) AS avg_low_occ,
  ROUND(AVG(peak_occupancy)::numeric, 2) AS avg_peak_occ
FROM feasibility_comp_units
GROUP BY unit_category
ORDER BY unit_rows DESC;
