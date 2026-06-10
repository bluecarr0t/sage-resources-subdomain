-- =============================================================================
-- ARDR driver analysis — LinkedIn post "The Numbers Behind the Number"
-- Source: Supabase `public.all_sage_data` (sage-outdoor-advisory)
-- Run quarterly via Supabase SQL editor or MCP execute_sql (read-only).
--
-- Cohort (US private-commercial published Glamping, is_open = Yes):
--   • Excludes tent-site / RV pad unit_type inventory
--   • ARDR = rate_avg_retail_daily_rate (positive only)
--
-- Rate aggregation (ALL sections below):
--   • Each row weighted by GREATEST(quantity_of_units, 1) — inventory-weighted
--   • Mean  = SUM(adr * unit_weight) / SUM(unit_weight)
--   • Median = weighted median (50th percentile of unit inventory, not row count)
--   • n_units = SUM(unit_weight); n_properties = COUNT(DISTINCT property_name)
--
-- Geo: haversine miles (no drive-time in DB)
--   • Airport: ≤50 mi to embedded primary commercial airports
--   • Metro 1M+: ≤75 mi to city-center coords (pop ≥1M; see us-demand-driver-cities.ts)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Shared cohort
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS _ardr_cohort ON COMMIT DROP AS
SELECT
  g.id,
  btrim(g.property_name) AS property_name,
  g.state,
  g.lat::float8 AS lat,
  g.lon::float8 AS lon,
  g.rate_avg_retail_daily_rate::numeric AS adr,
  GREATEST(COALESCE(g.quantity_of_units, 1), 1)::numeric AS unit_weight,
  lower(btrim(split_part(regexp_replace(coalesce(g.unit_type, ''), '[,;/|]', ',', 'g'), ',', 1))) AS ut_raw,
  lower(btrim(coalesce(g.unit_hot_tub, ''))) AS unit_hot_tub,
  lower(btrim(coalesce(g.property_hot_tub, ''))) AS property_hot_tub,
  lower(btrim(coalesce(g.unit_sauna, ''))) AS unit_sauna,
  lower(btrim(coalesce(g.property_sauna, ''))) AS property_sauna,
  g.operating_season_months,
  g.season_open_month,
  g.season_close_month,
  g.rate_summer_weekday,
  g.rate_summer_weekend,
  g.date_updated
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

CREATE TEMP TABLE IF NOT EXISTS _ardr_unit_labeled ON COMMIT DROP AS
SELECT
  c.*,
  CASE
    WHEN c.ut_raw ~ '(^|[^a-z])dome|geodome' THEN 'Dome'
    WHEN c.ut_raw ~ 'safari|canvas tent|wall tent|bell tent|lotus tent|glamping tent' THEN 'Safari / canvas tent'
    WHEN c.ut_raw ~ 'yurt' THEN 'Yurt'
    WHEN c.ut_raw ~ 'treehouse|tree house' THEN 'Treehouse'
    WHEN c.ut_raw ~ 'a[- ]?frame' THEN 'A-frame'
    WHEN c.ut_raw ~ 'airstream|vintage trailer' THEN 'Airstream / trailer'
    WHEN c.ut_raw ~ 'cabin|lodge|cottage|chalet|bungalow|tiny house|tiny home' THEN 'Hard-wall cabin / lodge'
    ELSE 'Other'
  END AS unit_bucket
FROM _ardr_cohort c
WHERE c.adr > 0;

-- Property-level flags (geo + seasonality classification only — not used for rate math)
CREATE TEMP TABLE IF NOT EXISTS _ardr_property_flags ON COMMIT DROP AS
SELECT
  property_name,
  bool_or(unit_hot_tub LIKE 'yes%' OR unit_hot_tub = 'y') AS has_unit_hot_tub,
  bool_or(property_hot_tub LIKE 'yes%' OR property_hot_tub = 'y') AS has_property_hot_tub,
  bool_or(unit_sauna LIKE 'yes%' OR unit_sauna = 'y') AS has_unit_sauna,
  bool_or(property_sauna LIKE 'yes%' OR property_sauna = 'y') AS has_property_sauna,
  MAX(
    CASE
      WHEN operating_season_months ~* 'year[ -]?round|365|all[- ]?year' THEN 1
      WHEN season_open_month IS NOT NULL AND season_close_month IS NOT NULL
           AND season_open_month <= 3 AND season_close_month >= 11 THEN 1
      WHEN operating_season_months ~* 'seasonal|closed.*winter|may.*oct|apr.*oct' THEN 0
      WHEN season_open_month IS NOT NULL AND season_close_month IS NOT NULL
           AND season_open_month >= 4 AND season_close_month <= 10 THEN 0
      ELSE NULL
    END
  ) AS is_year_round
FROM _ardr_unit_labeled
WHERE property_name <> ''
GROUP BY property_name;

-- -----------------------------------------------------------------------------
-- 2) Baseline — unit-weighted mean & median (national ARDR)
-- -----------------------------------------------------------------------------
WITH rated AS (
  SELECT adr, unit_weight FROM _ardr_unit_labeled
),
stats AS (
  SELECT
    SUM(unit_weight)::bigint AS n_units,
    COUNT(*) AS n_rows,
    COUNT(DISTINCT u.property_name) AS n_properties
  FROM _ardr_unit_labeled u
),
mean_row AS (
  SELECT ROUND(SUM(adr * unit_weight) / SUM(unit_weight)) AS mean_unit_weighted FROM rated
),
median_row AS (
  SELECT ROUND(adr) AS median_unit_weighted
  FROM (
    SELECT adr, SUM(unit_weight) OVER (ORDER BY adr) AS cum_w, SUM(unit_weight) OVER () AS total_w
    FROM rated
  ) x
  WHERE cum_w >= total_w / 2
  ORDER BY adr
  LIMIT 1
)
SELECT
  'baseline' AS section,
  s.n_properties,
  s.n_rows,
  s.n_units,
  m.mean_unit_weighted,
  (SELECT median_unit_weighted FROM median_row) AS median_unit_weighted,
  (SELECT MIN(date_updated) FROM _ardr_cohort) AS rate_data_min_date_updated,
  (SELECT MAX(date_updated) FROM _ardr_cohort) AS rate_data_max_date_updated
FROM stats s CROSS JOIN mean_row m;

-- -----------------------------------------------------------------------------
-- Reusable pattern: weighted stats by segment (copy for new drivers)
--   stats AS (SELECT segment, SUM(unit_weight) n_units, ... SUM(adr*unit_weight)/SUM(unit_weight) mean_wtd FROM tagged GROUP BY 1)
--   med AS (SELECT DISTINCT ON (segment) segment, ROUND(adr) median_wtd FROM (
--             SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) cw,
--                    SUM(unit_weight) OVER (PARTITION BY segment) tw FROM tagged
--           ) x WHERE cw >= tw/2 ORDER BY segment, adr)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 3) Driver 1 — Unit type premium (inventory-weighted)
-- -----------------------------------------------------------------------------
WITH seg AS (
  SELECT unit_bucket AS segment, adr, unit_weight, property_name
  FROM _ardr_unit_labeled
  WHERE unit_bucket IN ('Dome', 'Safari / canvas tent', 'Hard-wall cabin / lodge')
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(*) AS n_rows,
    COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM seg GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM seg
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT s.segment, s.n_units, s.n_rows, s.n_properties,
  ROUND(s.mean_wtd) AS mean_adr, m.median_wtd AS median_adr
FROM stats s JOIN med m USING (segment)
ORDER BY m.median_wtd DESC;

-- All unit types ranked (weighted median)
WITH stats AS (
  SELECT unit_bucket AS segment, SUM(unit_weight)::bigint AS n_units,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM _ardr_unit_labeled GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT unit_bucket AS segment, adr,
      SUM(unit_weight) OVER (PARTITION BY unit_bucket ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY unit_bucket) AS tw
    FROM _ardr_unit_labeled
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT s.segment, s.n_units, ROUND(s.mean_wtd) AS mean_adr, m.median_wtd
FROM stats s JOIN med m USING (segment)
ORDER BY m.median_wtd DESC NULLS LAST;

-- -----------------------------------------------------------------------------
-- 4) Driver 2 — Hot tub (unit_hot_tub; inventory-weighted)
-- -----------------------------------------------------------------------------
WITH tagged AS (
  SELECT
    CASE WHEN unit_hot_tub LIKE 'yes%' OR unit_hot_tub = 'y' THEN 'With private hot tub' ELSE 'Without' END AS segment,
    adr, unit_weight, property_name, state
  FROM _ardr_unit_labeled
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT s.segment, s.n_units, s.n_properties, ROUND(s.mean_wtd) AS mean_adr, m.median_wtd
FROM stats s JOIN med m USING (segment);

-- Property-level hot tub flag (still inventory-weighted per unit row)
WITH tagged AS (
  SELECT
    CASE WHEN f.has_unit_hot_tub OR f.has_property_hot_tub THEN 'With hot tub' ELSE 'Without' END AS segment,
    u.adr, u.unit_weight, u.property_name
  FROM _ardr_unit_labeled u
  JOIN _ardr_property_flags f ON f.property_name = u.property_name
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT 'property_any_hot_tub' AS level, s.*, m.median_wtd
FROM stats s JOIN med m USING (segment);

-- Texas (unit_hot_tub)
WITH tagged AS (
  SELECT CASE WHEN unit_hot_tub LIKE 'yes%' OR unit_hot_tub = 'y' THEN 'With' ELSE 'Without' END AS segment,
    adr, unit_weight, property_name
  FROM _ardr_unit_labeled WHERE upper(state) = 'TX'
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT 'TX unit_hot_tub' AS scope, s.*, m.median_wtd FROM stats s JOIN med m USING (segment);

-- -----------------------------------------------------------------------------
-- 4b) Driver — Sauna (unit_sauna; inventory-weighted)
-- -----------------------------------------------------------------------------
WITH tagged AS (
  SELECT
    CASE WHEN unit_sauna LIKE 'yes%' OR unit_sauna = 'y' THEN 'With private sauna' ELSE 'Without' END AS segment,
    adr, unit_weight, property_name, state
  FROM _ardr_unit_labeled
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT s.segment, s.n_units, s.n_properties, ROUND(s.mean_wtd) AS mean_adr, m.median_wtd
FROM stats s JOIN med m USING (segment);

-- Property-level sauna flag (inventory-weighted per unit row)
WITH tagged AS (
  SELECT
    CASE WHEN f.has_unit_sauna OR f.has_property_sauna THEN 'With sauna' ELSE 'Without' END AS segment,
    u.adr, u.unit_weight, u.property_name
  FROM _ardr_unit_labeled u
  JOIN _ardr_property_flags f ON f.property_name = u.property_name
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT 'property_any_sauna' AS level, s.*, m.median_wtd
FROM stats s JOIN med m USING (segment);

-- -----------------------------------------------------------------------------
-- 5) Driver 3 — Airport proximity (≤50 mi; inventory-weighted)
-- -----------------------------------------------------------------------------
WITH airports(lat, lon) AS (
  VALUES
    (33.6407, -84.4277), (33.9425, -118.4081), (41.9742, -87.9073), (32.8998, -97.0403),
    (39.8561, -104.6737), (40.6413, -73.7781), (37.6213, -122.3790), (47.4502, -122.3088),
    (36.0840, -115.1537), (28.4312, -81.3081), (25.7959, -80.2870), (33.4373, -112.0078),
    (29.9902, -95.3368), (42.3656, -71.0096), (44.8848, -93.2223), (42.2162, -83.3554),
    (39.8744, -75.2424), (35.2144, -80.9473), (40.7899, -111.9791), (32.7338, -117.1933),
    (27.9755, -82.5332), (45.5898, -122.5951), (38.7487, -90.3700), (39.1774, -76.6684),
    (30.1975, -97.6664), (36.1263, -86.6774), (32.8471, -96.8518), (21.3187, -157.9225),
    (29.9934, -90.2580), (35.8801, -78.7880), (38.6954, -121.5908), (37.3639, -121.9289),
    (39.7173, -86.2944), (39.9980, -82.8919), (39.2976, -94.7139), (40.4915, -80.2329),
    (39.0488, -84.6678), (35.0402, -106.6090)
),
prop_air AS (
  SELECT c.property_name,
    MIN(3958.8 * 2 * asin(sqrt(
      power(sin(radians(a.lat - c.lat) / 2), 2)
      + cos(radians(c.lat)) * cos(radians(a.lat)) * power(sin(radians(a.lon - c.lon) / 2), 2)
    ))) AS min_airport_mi
  FROM _ardr_cohort c
  CROSS JOIN airports a
  WHERE c.property_name <> '' AND c.lat IS NOT NULL AND c.adr > 0
  GROUP BY c.property_name
),
tagged AS (
  SELECT
    CASE WHEN p.min_airport_mi <= 50 THEN 'Within 50 mi of primary airport' ELSE 'Beyond 50 mi' END AS segment,
    u.adr, u.unit_weight, u.property_name
  FROM _ardr_unit_labeled u
  JOIN prop_air p ON p.property_name = u.property_name
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT s.segment, s.n_units, s.n_properties, ROUND(s.mean_wtd) AS mean_adr, m.median_wtd
FROM stats s JOIN med m USING (segment);

-- -----------------------------------------------------------------------------
-- 6) Driver 4 — Seasonality (inventory-weighted blended rate_avg)
-- -----------------------------------------------------------------------------
WITH tagged AS (
  SELECT
    CASE f.is_year_round WHEN 1 THEN 'Year-round operator' WHEN 0 THEN 'Seasonal operator' END AS segment,
    u.adr, u.unit_weight, u.property_name
  FROM _ardr_unit_labeled u
  JOIN _ardr_property_flags f ON f.property_name = u.property_name
  WHERE f.is_year_round IS NOT NULL
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT s.segment, s.n_units, s.n_properties, ROUND(s.mean_wtd) AS mean_blended_adr, m.median_wtd AS median_blended_adr
FROM stats s JOIN med m USING (segment);

-- Peak summer (inventory-weighted; rows with summer rates only)
WITH tagged AS (
  SELECT
    CASE f.is_year_round WHEN 1 THEN 'Year-round' WHEN 0 THEN 'Seasonal' END AS segment,
    (
      COALESCE(NULLIF(u.rate_summer_weekday, 0), u.rate_summer_weekend)
      + COALESCE(NULLIF(u.rate_summer_weekend, 0), u.rate_summer_weekday)
    ) / NULLIF(
      (CASE WHEN u.rate_summer_weekday > 0 THEN 1 ELSE 0 END)
      + (CASE WHEN u.rate_summer_weekend > 0 THEN 1 ELSE 0 END), 0
    ) AS peak_adr,
    u.unit_weight, u.property_name
  FROM _ardr_unit_labeled u
  JOIN _ardr_property_flags f ON f.property_name = u.property_name
  WHERE f.is_year_round IS NOT NULL
    AND (u.rate_summer_weekday > 0 OR u.rate_summer_weekend > 0)
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units,
    SUM(peak_adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(peak_adr) AS median_wtd
  FROM (
    SELECT segment, peak_adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY peak_adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, peak_adr
)
SELECT s.segment, s.n_units, ROUND(s.mean_wtd) AS mean_peak_summer_adr, m.median_wtd AS median_peak_summer_adr
FROM stats s JOIN med m USING (segment);

-- -----------------------------------------------------------------------------
-- 7) Driver 5 — Feeder market (≤75 mi from 1M+ city center; inventory-weighted)
-- -----------------------------------------------------------------------------
WITH metros(lat, lon) AS (
  VALUES
    (40.7128, -74.006), (34.0522, -118.2437), (41.8781, -87.6298), (29.7604, -95.3698),
    (33.4484, -112.074), (39.9526, -75.1652), (29.4241, -98.4936), (32.7157, -117.1611),
    (32.7767, -96.797), (37.3382, -121.8863), (30.2672, -97.7431), (30.3322, -81.6557),
    (32.7555, -97.3308), (39.9612, -82.9988), (35.2271, -80.8431), (37.7749, -122.4194),
    (39.7684, -86.1581), (47.6062, -122.3321), (39.7392, -104.9903), (38.9072, -77.0369),
    (42.3601, -71.0589), (36.1627, -86.7816), (42.3314, -83.0458), (45.5152, -122.6784),
    (36.1699, -115.1398), (33.749, -84.388), (25.7617, -80.1918), (27.9506, -82.4572),
    (28.5383, -81.3792)
),
prop_metro AS (
  SELECT c.property_name,
    MIN(3958.8 * 2 * asin(sqrt(
      power(sin(radians(m.lat - c.lat) / 2), 2)
      + cos(radians(c.lat)) * cos(radians(m.lat)) * power(sin(radians(m.lon - c.lon) / 2), 2)
    ))) AS min_metro_mi
  FROM _ardr_cohort c
  CROSS JOIN metros m
  WHERE c.property_name <> '' AND c.lat IS NOT NULL AND c.adr > 0
  GROUP BY c.property_name
),
tagged AS (
  SELECT
    CASE WHEN p.min_metro_mi <= 75 THEN 'Within 75 mi of 1M+ metro' ELSE 'Beyond 75 mi' END AS segment,
    u.adr, u.unit_weight, u.property_name
  FROM _ardr_unit_labeled u
  JOIN prop_metro p ON p.property_name = u.property_name
),
stats AS (
  SELECT segment, SUM(unit_weight)::bigint AS n_units, COUNT(DISTINCT property_name) AS n_properties,
    SUM(adr * unit_weight) / SUM(unit_weight) AS mean_wtd
  FROM tagged GROUP BY 1
),
med AS (
  SELECT DISTINCT ON (segment) segment, ROUND(adr) AS median_wtd
  FROM (
    SELECT segment, adr, SUM(unit_weight) OVER (PARTITION BY segment ORDER BY adr) AS cw,
      SUM(unit_weight) OVER (PARTITION BY segment) AS tw
    FROM tagged
  ) x WHERE cw >= tw / 2 ORDER BY segment, adr
)
SELECT s.segment, s.n_units, s.n_properties, ROUND(s.mean_wtd) AS mean_adr, m.median_wtd
FROM stats s JOIN med m USING (segment);

-- -----------------------------------------------------------------------------
-- 8) Sanity — 99th percentile on inventory-weighted unit distribution
-- -----------------------------------------------------------------------------
WITH rated AS (SELECT adr, unit_weight FROM _ardr_unit_labeled),
p99 AS (
  SELECT adr AS p99_adr
  FROM (
    SELECT adr, SUM(unit_weight) OVER (ORDER BY adr) AS cw, SUM(unit_weight) OVER () AS tw
    FROM rated
  ) x WHERE cw >= tw * 0.99 ORDER BY adr LIMIT 1
)
SELECT
  SUM(unit_weight)::bigint AS n_units,
  (SELECT ROUND(p99_adr) FROM p99) AS p99_weighted_adr,
  ROUND(SUM(adr * unit_weight) / SUM(unit_weight)) AS mean_before_cap,
  ROUND(SUM(adr * unit_weight) FILTER (WHERE adr <= (SELECT p99_adr FROM p99)) / NULLIF(SUM(unit_weight) FILTER (WHERE adr <= (SELECT p99_adr FROM p99)), 0)) AS mean_after_99pct_cap
FROM rated;
