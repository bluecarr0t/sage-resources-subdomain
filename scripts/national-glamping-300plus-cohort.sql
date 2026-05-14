-- National $300+ glamping cohort, US only, deduped to (source × property × unit_type).
-- Backs:
--   out/national-glamping-300plus-by-unit-type.csv         (row-level master)
--   out/national-glamping-300plus-by-unit-type-summary.csv (per-unit-type rollup)
--
-- Sources: all_glamping_properties + campspot + hipcamp.
-- Dedupe matches lib/market-report/dedupe.ts (median ADR canonical, MAX of unit_count
-- and property_total_sites). State strings are normalized to 2-letter US abbrs and
-- non-US rows are dropped via the us_states / state_full lookups.

WITH us_states AS (
  SELECT UPPER(abbr) AS abbr FROM (VALUES
    ('AL'),('AK'),('AZ'),('AR'),('CA'),('CO'),('CT'),('DE'),('FL'),('GA'),
    ('HI'),('ID'),('IL'),('IN'),('IA'),('KS'),('KY'),('LA'),('ME'),('MD'),
    ('MA'),('MI'),('MN'),('MS'),('MO'),('MT'),('NE'),('NV'),('NH'),('NJ'),
    ('NM'),('NY'),('NC'),('ND'),('OH'),('OK'),('OR'),('PA'),('RI'),('SC'),
    ('SD'),('TN'),('TX'),('UT'),('VT'),('VA'),('WA'),('WV'),('WI'),('WY'),('DC')
  ) AS s(abbr)
),
state_full AS (
  SELECT * FROM (VALUES
    ('alabama','AL'),('alaska','AK'),('arizona','AZ'),('arkansas','AR'),('california','CA'),
    ('colorado','CO'),('connecticut','CT'),('delaware','DE'),('florida','FL'),('georgia','GA'),
    ('hawaii','HI'),('idaho','ID'),('illinois','IL'),('indiana','IN'),('iowa','IA'),
    ('kansas','KS'),('kentucky','KY'),('louisiana','LA'),('maine','ME'),('maryland','MD'),
    ('massachusetts','MA'),('michigan','MI'),('minnesota','MN'),('mississippi','MS'),('missouri','MO'),
    ('montana','MT'),('nebraska','NE'),('nevada','NV'),('new hampshire','NH'),('new jersey','NJ'),
    ('new mexico','NM'),('new york','NY'),('north carolina','NC'),('north dakota','ND'),('ohio','OH'),
    ('oklahoma','OK'),('oregon','OR'),('pennsylvania','PA'),('rhode island','RI'),('south carolina','SC'),
    ('south dakota','SD'),('tennessee','TN'),('texas','TX'),('utah','UT'),('vermont','VT'),
    ('virginia','VA'),('washington','WA'),('west virginia','WV'),('wisconsin','WI'),('wyoming','WY'),
    ('district of columbia','DC')
  ) AS s(name, abbr)
),
g AS (
  SELECT 'all_glamping_properties' AS src, property_name,
    COALESCE((SELECT abbr FROM us_states WHERE abbr = UPPER(TRIM(state))),
             (SELECT abbr FROM state_full WHERE name = LOWER(TRIM(state)))) AS state_abbr,
    city, COALESCE(NULLIF(TRIM(unit_type),''),'Unspecified') AS unit_type_norm,
    rate_avg_retail_daily_rate AS adr,
    NULLIF(quantity_of_units,0) AS qty, NULLIF(property_total_sites,0) AS sites,
    rate_winter_weekday AS winter_wd, rate_winter_weekend AS winter_we,
    rate_summer_weekday AS summer_wd, rate_summer_weekend AS summer_we,
    season_open_month, season_close_month,
    operating_season_months, url, lat::float AS lat, lon::float AS lon,
    NULL::numeric AS occupancy
  FROM all_glamping_properties WHERE property_name IS NOT NULL
),
cs AS (
  SELECT 'campspot' AS src, property_name,
    COALESCE((SELECT abbr FROM us_states WHERE abbr = UPPER(TRIM(state))),
             (SELECT abbr FROM state_full WHERE name = LOWER(TRIM(state)))) AS state_abbr,
    city, COALESCE(NULLIF(TRIM(unit_type),''),'Unspecified'),
    NULLIF(REGEXP_REPLACE(avg_retail_daily_rate_2025,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(quantity_of_units,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(property_total_sites,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(winter_weekday,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(winter_weekend,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(summer_weekday,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(summer_weekend,'[^0-9.]','','g'),'')::numeric,
    NULL::smallint, NULL::smallint, operating_season_months, url, lat_num, lon_num,
    NULLIF(REGEXP_REPLACE(occupancy_rate_2025,'[^0-9.]','','g'),'')::numeric
  FROM campspot WHERE property_name IS NOT NULL
),
hc AS (
  SELECT 'hipcamp' AS src, property_name,
    COALESCE((SELECT abbr FROM us_states WHERE abbr = UPPER(TRIM(state))),
             (SELECT abbr FROM state_full WHERE name = LOWER(TRIM(state)))) AS state_abbr,
    city, COALESCE(NULLIF(TRIM(unit_type),''),'Unspecified'),
    NULLIF(REGEXP_REPLACE(avg_retail_daily_rate_2025,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(quantity_of_units,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(property_total_sites,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(winter_weekday,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(winter_weekend,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(summer_weekday,'[^0-9.]','','g'),'')::numeric,
    NULLIF(REGEXP_REPLACE(summer_weekend,'[^0-9.]','','g'),'')::numeric,
    NULL::smallint, NULL::smallint, operating_season_months, url, lat_num, lon_num,
    NULLIF(REGEXP_REPLACE(occupancy_rate_2025,'[^0-9.]','','g'),'')::numeric
  FROM hipcamp WHERE property_name IS NOT NULL
),
u AS (SELECT * FROM g UNION ALL SELECT * FROM cs UNION ALL SELECT * FROM hc),
collapsed AS (
  SELECT src, property_name, state_abbr,
    (ARRAY_AGG(city ORDER BY (CASE WHEN city IS NOT NULL AND city <> '' THEN 0 ELSE 1 END), city))[1] AS city,
    unit_type_norm,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adr) AS adr_med,
    MIN(adr) AS adr_low, MAX(adr) AS adr_high,
    MAX(qty) AS unit_count, MAX(sites) AS property_total_sites,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY winter_wd) AS winter_weekday,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY winter_we) AS winter_weekend,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY summer_wd) AS summer_weekday,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY summer_we) AS summer_weekend,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY occupancy) AS occupancy_med,
    MIN(season_open_month) AS season_open_month, MAX(season_close_month) AS season_close_month,
    (ARRAY_AGG(operating_season_months) FILTER (WHERE operating_season_months IS NOT NULL))[1] AS operating_season_months,
    (ARRAY_AGG(url) FILTER (WHERE url IS NOT NULL))[1] AS url,
    (ARRAY_AGG(lat ORDER BY lat NULLS LAST))[1] AS lat,
    (ARRAY_AGG(lon ORDER BY lon NULLS LAST))[1] AS lon,
    COUNT(*) AS rate_tier_rows
  FROM u WHERE state_abbr IS NOT NULL
  GROUP BY src, property_name, state_abbr, unit_type_norm
)
-- Row-level master CSV
SELECT
  unit_type_norm AS unit_type,
  property_name, state_abbr AS state, city, src AS source,
  ROUND(adr_med::numeric, 0) AS adr_avg,
  ROUND(adr_low::numeric, 0) AS adr_low,
  ROUND(adr_high::numeric, 0) AS adr_high,
  unit_count, property_total_sites,
  ROUND(winter_weekday::numeric, 0) AS winter_weekday,
  ROUND(winter_weekend::numeric, 0) AS winter_weekend,
  ROUND(summer_weekday::numeric, 0) AS summer_weekday,
  ROUND(summer_weekend::numeric, 0) AS summer_weekend,
  ROUND(occupancy_med::numeric, 3) AS occupancy_2025,
  CASE WHEN season_open_month = 1 AND season_close_month = 12 THEN 'Yes'
       WHEN season_open_month IS NULL AND season_close_month IS NULL THEN 'Unknown'
       ELSE 'No' END AS year_round,
  season_open_month, season_close_month, operating_season_months,
  rate_tier_rows, url, lat, lon
FROM collapsed
WHERE adr_med >= 300
ORDER BY unit_type_norm ASC, adr_med DESC NULLS LAST;

-- Summary CSV (separate query — same `collapsed` CTE, replace SELECT above with):
--
--   SELECT unit_type_norm AS unit_type, COUNT(*) AS unit_type_rows,
--     COUNT(DISTINCT (property_name, state_abbr)) AS distinct_properties,
--     SUM(unit_count)::int AS total_units_known,
--     ROUND(MIN(adr_med)::numeric, 0) AS adr_min,
--     ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY adr_med)::numeric, 0) AS adr_p25,
--     ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY adr_med)::numeric, 0) AS adr_median,
--     ROUND(AVG(adr_med)::numeric, 0) AS adr_mean,
--     ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY adr_med)::numeric, 0) AS adr_p75,
--     ROUND(MAX(adr_med)::numeric, 0) AS adr_max,
--     COUNT(*) FILTER (WHERE adr_med >= 400) AS rows_400_plus,
--     COUNT(*) FILTER (WHERE adr_med >= 600) AS rows_600_plus,
--     COUNT(*) FILTER (WHERE season_open_month = 1 AND season_close_month = 12) AS year_round_rows,
--     COUNT(DISTINCT state_abbr) AS distinct_states
--   FROM collapsed WHERE adr_med >= 300
--   GROUP BY unit_type_norm ORDER BY unit_type_rows DESC;
