-- Hard-Walled Unit (Cabin) Phase 1 Analysis — 2026-06-09
-- Sources:
--   * public.all_sage_data (Sage) — inventory, ADR, seasonal rates, amenities, comp set
--   * public.hipcamp (flat OTA table) — occupancy, OTA ADR, RevPAR (Sage rows have no occupancy)
-- Conventions:
--   * Hard-walled unit types (Sage): Cabin, A-Frame, Tiny Home, Treehouse, Cottage, Lodge,
--     Mirror Cabin, Hobbit House (Airstream/Vintage Trailer explicitly excluded per project brief)
--   * Hard-walled unit types (Hipcamp): Cabin, A Frame, Tiny Home, Treehouse, Bungalow, Shepherd S Hut
--   * Midwest = IL IN IA KS MI MN MO NE ND OH SD WI (lib/comps-v2/us-regions.ts);
--     Hipcamp stores full state names, Sage stores 2-letter abbreviations
--   * Effective ADR (Sage) = mean of populated seasonal rate_* columns, else
--     rate_avg_retail_daily_rate (mirrors lib/sage-ai/effective-glamping-retail-adr.ts)
--   * Hipcamp occupancy_rate_* is a 0-1 fraction stored as text with 'No data' placeholders;
--     usable band 0.10-0.99 (per lib/rv-industry-overview/campspot-rv-overview-standard-filters.ts)
--   * Hipcamp ADR usable band $10-$3,000

-- ============================================================================
-- 0. Reusable Sage cohort with effective ADR (hard-walled, US, open, published)
-- ============================================================================
WITH sage AS (
  SELECT a.*, COALESCE(a.quantity_of_units, 1) AS qty,
    a.state IN ('IL','IN','IA','KS','MI','MN','MO','NE','ND','OH','SD','WI') AS is_midwest,
    COALESCE(
      (SELECT AVG(v) FROM (VALUES
        (CASE WHEN a.rate_winter_weekday::text ~ '^[0-9.]+$' THEN a.rate_winter_weekday::text::numeric END),
        (CASE WHEN a.rate_winter_weekend::text ~ '^[0-9.]+$' THEN a.rate_winter_weekend::text::numeric END),
        (CASE WHEN a.rate_spring_weekday::text ~ '^[0-9.]+$' THEN a.rate_spring_weekday::text::numeric END),
        (CASE WHEN a.rate_spring_weekend::text ~ '^[0-9.]+$' THEN a.rate_spring_weekend::text::numeric END),
        (CASE WHEN a.rate_summer_weekday::text ~ '^[0-9.]+$' THEN a.rate_summer_weekday::text::numeric END),
        (CASE WHEN a.rate_summer_weekend::text ~ '^[0-9.]+$' THEN a.rate_summer_weekend::text::numeric END),
        (CASE WHEN a.rate_fall_weekday::text ~ '^[0-9.]+$' THEN a.rate_fall_weekday::text::numeric END),
        (CASE WHEN a.rate_fall_weekend::text ~ '^[0-9.]+$' THEN a.rate_fall_weekend::text::numeric END)
      ) s(v)),
      NULLIF(a.rate_avg_retail_daily_rate, 0)::numeric) AS adr
  FROM all_sage_data a
  WHERE a.is_glamping_property = 'Yes'
    AND a.is_open = 'Yes'
    AND a.research_status = 'published'
    AND COALESCE(a.country, 'United States') IN ('USA', 'United States', 'US')
    AND a.unit_type IN ('Cabin','A-Frame','Tiny Home','Treehouse','Cottage','Lodge','Mirror Cabin','Hobbit House')
)
SELECT COUNT(*) AS rows, COUNT(DISTINCT property_id) AS properties, SUM(qty) AS units,
  COUNT(*) FILTER (WHERE is_midwest) AS midwest_rows,
  COUNT(DISTINCT property_id) FILTER (WHERE is_midwest) AS midwest_properties,
  SUM(qty) FILTER (WHERE is_midwest) AS midwest_units
FROM sage;

-- ============================================================================
-- 1. Cabin ADR distribution (Sage) — US vs Midwest
-- ============================================================================
-- Replace the unit_type filter with = 'Cabin' inside the sage CTE above, then:
-- SELECT scope, COUNT(adr), SUM(qty),
--   AVG(adr), SUM(adr*qty)/SUM(qty),                      -- unit-weighted ADR
--   PERCENTILE_CONT(0.25/0.5/0.75/0.9) WITHIN GROUP (ORDER BY adr)
-- FROM sage [WHERE is_midwest] ...

-- ============================================================================
-- 2. Cabin seasonal rate spreads (Sage) — US vs Midwest
-- ============================================================================
-- AVG of each numeric rate_<season>_<daypart> column over the cabin cohort,
-- splitting on is_midwest (see CTE pattern in section 0).

-- ============================================================================
-- 3. Cabin occupancy / RevPAR (Hipcamp) — US vs Midwest
-- ============================================================================
WITH hc AS (
  SELECT
    state IN ('Illinois','Indiana','Iowa','Kansas','Michigan','Minnesota','Missouri',
              'Nebraska','North Dakota','Ohio','South Dakota','Wisconsin') AS is_midwest,
    CASE WHEN occupancy_rate_2024 ~ '^[0-9.]+$' THEN occupancy_rate_2024::numeric END AS occ24,
    CASE WHEN occupancy_rate_2025 ~ '^[0-9.]+$' THEN occupancy_rate_2025::numeric END AS occ25,
    CASE WHEN occupancy_rate_2026 ~ '^[0-9.]+$' THEN occupancy_rate_2026::numeric END AS occ26,
    CASE WHEN avg_retail_daily_rate_2025 ~ '^[0-9.]+$' THEN avg_retail_daily_rate_2025::numeric END AS adr25,
    CASE WHEN revpar_2025 ~ '^[0-9.]+$' THEN revpar_2025::numeric END AS revpar25,
    CASE WHEN high_avg_occupancy_2025 ~ '^[0-9.]+$' THEN high_avg_occupancy_2025::numeric END AS hi_occ25,
    CASE WHEN low_avg_occupancy_2025 ~ '^[0-9.]+$' THEN low_avg_occupancy_2025::numeric END AS lo_occ25
  FROM hipcamp
  WHERE unit_type = 'Cabin'
    AND COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
)
SELECT scope,
  COUNT(*) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99) AS n25,
  ROUND(100 * AVG(occ25) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99), 1) AS avg_occ25,
  ROUND(100 * (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY occ25)
    FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99))::numeric, 1) AS med_occ25,
  ROUND(100 * AVG(occ24) FILTER (WHERE occ24 BETWEEN 0.10 AND 0.99), 1) AS avg_occ24,
  ROUND(100 * AVG(occ26) FILTER (WHERE occ26 BETWEEN 0.10 AND 0.99), 1) AS avg_occ26_ytd,
  ROUND(AVG(adr25) FILTER (WHERE adr25 BETWEEN 10 AND 3000), 0) AS avg_adr25,
  ROUND(AVG(revpar25) FILTER (WHERE revpar25 BETWEEN 1 AND 3000), 0) AS avg_revpar25,
  ROUND(100 * AVG(hi_occ25) FILTER (WHERE hi_occ25 BETWEEN 0.10 AND 1), 1) AS avg_high_month_occ25,
  ROUND(100 * AVG(lo_occ25) FILTER (WHERE lo_occ25 BETWEEN 0 AND 1), 1) AS avg_low_month_occ25
FROM (
  SELECT 'US' AS scope, * FROM hc
  UNION ALL
  SELECT 'Midwest', * FROM hc WHERE is_midwest
) t
GROUP BY scope;

-- ============================================================================
-- 4. Cabin occupancy by ADR band (Hipcamp) — does occupancy hold at $400-600?
-- ============================================================================
WITH hc AS (
  SELECT
    state IN ('Illinois','Indiana','Iowa','Kansas','Michigan','Minnesota','Missouri',
              'Nebraska','North Dakota','Ohio','South Dakota','Wisconsin') AS is_midwest,
    CASE WHEN occupancy_rate_2025 ~ '^[0-9.]+$' THEN occupancy_rate_2025::numeric END AS occ25,
    CASE WHEN avg_retail_daily_rate_2025 ~ '^[0-9.]+$' THEN avg_retail_daily_rate_2025::numeric END AS adr25,
    CASE WHEN revpar_2025 ~ '^[0-9.]+$' THEN revpar_2025::numeric END AS revpar25
  FROM hipcamp
  WHERE unit_type = 'Cabin'
    AND COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
), b AS (
  SELECT *, CASE
    WHEN adr25 < 100 THEN '1: <$100'
    WHEN adr25 < 200 THEN '2: $100-199'
    WHEN adr25 < 300 THEN '3: $200-299'
    WHEN adr25 < 400 THEN '4: $300-399'
    WHEN adr25 <= 600 THEN '5: $400-600 (target)'
    ELSE '6: >$600' END AS band
  FROM hc WHERE adr25 BETWEEN 10 AND 3000
)
SELECT band, COUNT(*) AS sites,
  COUNT(*) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99) AS sites_with_occ,
  ROUND(100 * AVG(occ25) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99), 1) AS avg_occ25,
  ROUND(100 * (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY occ25)
    FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99))::numeric, 1) AS med_occ25,
  ROUND(AVG(revpar25) FILTER (WHERE revpar25 BETWEEN 1 AND 3000), 0) AS avg_revpar25,
  COUNT(*) FILTER (WHERE is_midwest) AS midwest_sites,
  ROUND(100 * AVG(occ25) FILTER (WHERE is_midwest AND occ25 BETWEEN 0.10 AND 0.99), 1) AS midwest_avg_occ25
FROM b GROUP BY band ORDER BY band;

-- ============================================================================
-- 5. Cabin occupancy by Midwest state (Hipcamp)
-- ============================================================================
WITH hc AS (
  SELECT state,
    CASE WHEN occupancy_rate_2024 ~ '^[0-9.]+$' THEN occupancy_rate_2024::numeric END AS occ24,
    CASE WHEN occupancy_rate_2025 ~ '^[0-9.]+$' THEN occupancy_rate_2025::numeric END AS occ25,
    CASE WHEN avg_retail_daily_rate_2025 ~ '^[0-9.]+$' THEN avg_retail_daily_rate_2025::numeric END AS adr25,
    CASE WHEN revpar_2025 ~ '^[0-9.]+$' THEN revpar_2025::numeric END AS revpar25,
    high_month_2025, low_month_2025
  FROM hipcamp
  WHERE unit_type = 'Cabin'
    AND COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
    AND state IN ('Illinois','Indiana','Iowa','Kansas','Michigan','Minnesota','Missouri',
                  'Nebraska','North Dakota','Ohio','South Dakota','Wisconsin')
)
SELECT state, COUNT(*) AS sites,
  COUNT(*) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99) AS n_occ25,
  ROUND(100 * AVG(occ25) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99), 1) AS avg_occ25,
  ROUND(100 * AVG(occ24) FILTER (WHERE occ24 BETWEEN 0.10 AND 0.99), 1) AS avg_occ24,
  ROUND(AVG(adr25) FILTER (WHERE adr25 BETWEEN 10 AND 3000), 0) AS avg_adr25,
  ROUND(AVG(revpar25) FILTER (WHERE revpar25 BETWEEN 1 AND 3000), 0) AS avg_revpar25,
  MODE() WITHIN GROUP (ORDER BY high_month_2025)
    FILTER (WHERE COALESCE(high_month_2025, '') NOT IN ('', 'No data')) AS typical_high_month,
  MODE() WITHIN GROUP (ORDER BY low_month_2025)
    FILTER (WHERE COALESCE(low_month_2025, '') NOT IN ('', 'No data')) AS typical_low_month
FROM hc GROUP BY state ORDER BY sites DESC;

-- ============================================================================
-- 6. Unit-type comparison — Sage inventory + ADR side
--    (unit_type IN hard-walled list + Safari Tent / Bell Tent / Yurt / Dome /
--     Covered Wagon for canvas-vs-hard-wall contrast)
-- ============================================================================
-- Use the sage CTE from section 0 with the expanded unit_type list, then:
-- SELECT unit_type, COUNT(*), COUNT(DISTINCT property_id), SUM(qty),
--   AVG(adr), PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adr),
--   SUM(adr*qty)/SUM(qty),
--   AVG(CASE WHEN unit_capacity::text ~ '^[0-9]+$' THEN unit_capacity::text::numeric END)
-- GROUP BY unit_type;

-- 6b. Unit-type comparison — Hipcamp occupancy side
WITH hc AS (
  SELECT unit_type,
    state IN ('Illinois','Indiana','Iowa','Kansas','Michigan','Minnesota','Missouri',
              'Nebraska','North Dakota','Ohio','South Dakota','Wisconsin') AS is_midwest,
    CASE WHEN occupancy_rate_2024 ~ '^[0-9.]+$' THEN occupancy_rate_2024::numeric END AS occ24,
    CASE WHEN occupancy_rate_2025 ~ '^[0-9.]+$' THEN occupancy_rate_2025::numeric END AS occ25,
    CASE WHEN avg_retail_daily_rate_2025 ~ '^[0-9.]+$' THEN avg_retail_daily_rate_2025::numeric END AS adr25,
    CASE WHEN revpar_2025 ~ '^[0-9.]+$' THEN revpar_2025::numeric END AS revpar25
  FROM hipcamp
  WHERE COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
    AND unit_type IN ('Cabin','A Frame','Tiny Home','Treehouse','Bungalow','Shepherd S Hut',
                      'Safari Tent','Canvas Tent','Bell Tent','Yurt','Dome')
)
SELECT unit_type, COUNT(*) AS sites,
  COUNT(*) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99) AS n_occ25,
  ROUND(100 * AVG(occ25) FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99), 1) AS avg_occ25,
  ROUND(100 * (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY occ25)
    FILTER (WHERE occ25 BETWEEN 0.10 AND 0.99))::numeric, 1) AS med_occ25,
  ROUND(100 * AVG(occ24) FILTER (WHERE occ24 BETWEEN 0.10 AND 0.99), 1) AS avg_occ24,
  ROUND(AVG(adr25) FILTER (WHERE adr25 BETWEEN 10 AND 3000), 0) AS avg_adr25,
  ROUND(AVG(revpar25) FILTER (WHERE revpar25 BETWEEN 1 AND 3000), 0) AS avg_revpar25,
  ROUND(100 * AVG(occ25) FILTER (WHERE is_midwest AND occ25 BETWEEN 0.10 AND 0.99), 1) AS midwest_avg_occ25
FROM hc GROUP BY unit_type ORDER BY sites DESC;

-- ============================================================================
-- 7. Unique-unit premium — within-property standard vs specialty (Sage)
-- ============================================================================
-- Using the section-0 sage CTE WITHOUT the unit_type filter:
-- grouped AS (
--   SELECT property_id,
--     AVG(adr) FILTER (WHERE unit_type IN ('Cabin','Tiny Home','Cottage','A-Frame')) AS standard_adr,
--     AVG(adr) FILTER (WHERE unit_type IN ('Treehouse','Mirror Cabin','Hobbit House','Covered Wagon')) AS unique_adr
--   FROM sage GROUP BY property_id
-- )
-- SELECT COUNT(*), AVG(standard_adr), AVG(unique_adr),
--   AVG(unique_adr / standard_adr) - 1 AS avg_premium,
--   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY unique_adr / standard_adr) - 1 AS median_premium
-- FROM grouped WHERE standard_adr > 0 AND unique_adr IS NOT NULL;

-- 7b. Same-property treehouse vs standard occupancy (Hipcamp, property_name grain)
WITH hc AS (
  SELECT property_name, unit_type,
    CASE WHEN occupancy_rate_2025 ~ '^[0-9.]+$' THEN occupancy_rate_2025::numeric END AS occ25,
    CASE WHEN avg_retail_daily_rate_2025 ~ '^[0-9.]+$' THEN avg_retail_daily_rate_2025::numeric END AS adr25
  FROM hipcamp
  WHERE COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
), grouped AS (
  SELECT property_name,
    AVG(occ25) FILTER (WHERE unit_type IN ('Cabin','Tiny Home','A Frame') AND occ25 BETWEEN 0.10 AND 0.99) AS std_occ,
    AVG(occ25) FILTER (WHERE unit_type = 'Treehouse' AND occ25 BETWEEN 0.10 AND 0.99) AS th_occ,
    AVG(adr25) FILTER (WHERE unit_type IN ('Cabin','Tiny Home','A Frame') AND adr25 BETWEEN 10 AND 3000) AS std_adr,
    AVG(adr25) FILTER (WHERE unit_type = 'Treehouse' AND adr25 BETWEEN 10 AND 3000) AS th_adr
  FROM hc GROUP BY property_name
)
SELECT COUNT(*) AS properties_with_both,
  ROUND(100 * AVG(std_occ), 1) AS avg_std_occ25,
  ROUND(100 * AVG(th_occ), 1) AS avg_treehouse_occ25,
  ROUND(AVG(std_adr)::numeric, 0) AS avg_std_adr25,
  ROUND(AVG(th_adr)::numeric, 0) AS avg_treehouse_adr25,
  ROUND(100 * (AVG(th_adr / NULLIF(std_adr, 0)) - 1)::numeric, 1) AS treehouse_adr_premium_pct
FROM grouped WHERE std_occ IS NOT NULL AND th_occ IS NOT NULL;

-- ============================================================================
-- 8. $400-600 effective-ADR hard-walled cohort + amenity prevalence (Sage)
-- ============================================================================
-- Filter the section-0 sage CTE to adr BETWEEN 400 AND 600, then aggregate:
--   COUNT(*), COUNT(DISTINCT property_id), SUM(qty),
--   share of rows with property_restaurant/property_food_on_site = 'Yes' (F&B),
--   property_sauna, property_fitness_room, property_general_store, property_pool,
--   property_hot_tub/unit_hot_tub, unit_private_bathroom, unit_full_kitchen,
--   unit_air_conditioning, glamping_service_tier mix.
-- Property list: GROUP BY property_id with STRING_AGG(DISTINCT unit_type),
--   SUM(qty), AVG(adr), ordered Midwest-first.

-- ============================================================================
-- 9. High-quality cabin resort comp set (Sage, property level)
-- ============================================================================
-- prop AS (per-property rollup of the unfiltered sage CTE):
--   hw_units  = SUM(qty) over hard-walled unit types
--   all_units = SUM(qty)
--   hw_adr    = AVG(adr) over hard-walled rows
--   unit_mix  = STRING_AGG(DISTINCT unit_type || ' x' || qty)
--   amenity flags via BOOL_OR(col ILIKE 'yes')
-- National screen: hw_units >= 2 AND hw_units/all_units >= 0.5
--                  AND (hw_adr >= 300 OR tier IN ('luxury','upscale'))
-- Midwest screen (looser, to surface enough regional comps):
--                  hw_units >= 1 AND (hw_adr >= 200 OR tier IN ('luxury','upscale'))
-- ORDER BY is_midwest DESC, hw_adr DESC;
