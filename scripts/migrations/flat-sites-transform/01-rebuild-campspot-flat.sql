-- Rebuild public.campspot from normalized campspot.* mirror (Phase 3).
-- Prereqs: campspot.latest_sites, site_monthly_analytics, propertydetails, sitedetails, siteseasonals.
-- Run via: npm run transform:flat-sites

BEGIN;

TRUNCATE TABLE public.campspot RESTART IDENTITY;

INSERT INTO public.campspot (
  duplicatenote,
  source,
  date_added,
  date_updated,
  property_name,
  site_name,
  unit_type,
  property_type,
  property_total_sites,
  address,
  city,
  state,
  zip_code,
  country,
  occupancy_rate_2024,
  avg_retail_daily_rate_2024,
  high_rate_2024,
  low_rate_2024,
  occupancy_rate_2025,
  avg_retail_daily_rate_2025,
  high_rate_2025,
  low_rate_2025,
  revpar_2025,
  high_month_2025,
  high_avg_occupancy_2025,
  low_month_2025,
  low_avg_occupancy_2025,
  occupancy_rate_2026,
  high_rate_2026,
  low_rate_2026,
  revpar_2026,
  high_month_2026,
  high_avg_occupancy_2026,
  low_month_2026,
  low_avg_occupancy_2026,
  winter_weekday,
  winter_weekend,
  spring_weekday,
  spring_weekend,
  summer_weekday,
  summer_weekend,
  fall_weekday,
  fall_weekend,
  url,
  description,
  lon,
  lat,
  pool,
  pets,
  water,
  shower,
  private_bathroom,
  sewer_hook_up,
  electrical_hook_up,
  water_hookup,
  updated_at
)
WITH ls AS (
  SELECT DISTINCT ON (property_id, site_id)
    property_id,
    site_id,
    parent_id,
    site_name,
    site_amenities,
    site_updated_at
  FROM campspot.latest_sites
  ORDER BY property_id, site_id, site_updated_at DESC NULLS LAST
),
site_parent AS (
  SELECT DISTINCT ON (id, property_id)
    id,
    property_id,
    parent_id
  FROM campspot.sites
  ORDER BY id, property_id, scraping_id DESC NULLS LAST
),
parent_sd AS (
  SELECT DISTINCT ON (property_id, id)
    id,
    property_id,
    category,
    name,
    amenities,
    description
  FROM campspot.sitedetails
  WHERE is_parent IS TRUE
  ORDER BY property_id, id, updated_at DESC NULLS LAST
),
year_metrics AS (
  SELECT
    sma.property_id,
    sma.site_id,
    public.flat_occupancy_decimal(avg(CASE WHEN sma.year::int = 2024 THEN sma.avg_occupancy END)) AS occupancy_rate_2024,
    public.flat_rate_text(avg(CASE
      WHEN sma.year::int = 2024 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.avg_price
    END)) AS avg_retail_daily_rate_2024,
    public.flat_rate_text(max(CASE
      WHEN sma.year::int = 2024 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.max_price
    END)) AS high_rate_2024,
    public.flat_rate_text(min(CASE
      WHEN sma.year::int = 2024 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.min_price
    END)) AS low_rate_2024,
    public.flat_occupancy_decimal(avg(CASE WHEN sma.year::int = 2025 THEN sma.avg_occupancy END)) AS occupancy_rate_2025,
    public.flat_rate_text(avg(CASE
      WHEN sma.year::int = 2025 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.avg_price
    END)) AS avg_retail_daily_rate_2025,
    public.flat_rate_text(max(CASE
      WHEN sma.year::int = 2025 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.max_price
    END)) AS high_rate_2025,
    public.flat_rate_text(min(CASE
      WHEN sma.year::int = 2025 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.min_price
    END)) AS low_rate_2025,
    public.flat_rate_text(avg(CASE
      WHEN sma.year::int = 2025 AND sma.avg_occupancy > 5 THEN sma.revpar
    END)) AS revpar_2025,
    public.flat_occupancy_decimal(avg(CASE WHEN sma.year::int = 2026 THEN sma.avg_occupancy END)) AS occupancy_rate_2026,
    public.flat_rate_text(max(CASE
      WHEN sma.year::int = 2026 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.max_price
    END)) AS high_rate_2026,
    public.flat_rate_text(min(CASE
      WHEN sma.year::int = 2026 AND sma.avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(sma.avg_price)
        THEN sma.min_price
    END)) AS low_rate_2026,
    public.flat_rate_text(avg(CASE
      WHEN sma.year::int = 2026 AND sma.avg_occupancy > 5 THEN sma.revpar
    END)) AS revpar_2026
  FROM campspot.site_monthly_analytics sma
  GROUP BY sma.property_id, sma.site_id
),
monthly_2025 AS (
  SELECT
    property_id,
    site_id,
    month::int AS month_num,
    avg_occupancy,
    avg_price,
    high_avg_occupancy,
    low_avg_occupancy
  FROM campspot.site_monthly_analytics
  WHERE year::int = 2025
),
high_low_2025 AS (
  SELECT
    property_id,
    site_id,
    (array_agg(public.flat_month_name(month_num) ORDER BY avg_price DESC NULLS LAST)
      FILTER (WHERE avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(avg_price)))[1] AS high_month_2025,
    public.flat_occupancy_decimal(max(high_avg_occupancy) FILTER (WHERE avg_occupancy > 5)) AS high_avg_occupancy_2025,
    (array_agg(public.flat_month_name(month_num) ORDER BY avg_occupancy ASC NULLS LAST)
      FILTER (WHERE avg_occupancy > 0))[1] AS low_month_2025,
    public.flat_occupancy_decimal(min(low_avg_occupancy) FILTER (WHERE avg_occupancy > 0)) AS low_avg_occupancy_2025
  FROM monthly_2025
  GROUP BY property_id, site_id
),
monthly_2026 AS (
  SELECT
    property_id,
    site_id,
    month::int AS month_num,
    avg_occupancy,
    avg_price,
    high_avg_occupancy,
    low_avg_occupancy
  FROM campspot.site_monthly_analytics
  WHERE year::int = 2026
),
high_low_2026 AS (
  SELECT
    property_id,
    site_id,
    (array_agg(public.flat_month_name(month_num) ORDER BY avg_price DESC NULLS LAST)
      FILTER (WHERE avg_occupancy > 5 AND NOT public.flat_is_placeholder_rate(avg_price)))[1] AS high_month_2026,
    public.flat_occupancy_decimal(max(high_avg_occupancy) FILTER (WHERE avg_occupancy > 5)) AS high_avg_occupancy_2026,
    (array_agg(public.flat_month_name(month_num) ORDER BY avg_occupancy ASC NULLS LAST)
      FILTER (WHERE avg_occupancy > 0))[1] AS low_month_2026,
    public.flat_occupancy_decimal(min(low_avg_occupancy) FILTER (WHERE avg_occupancy > 0)) AS low_avg_occupancy_2026
  FROM monthly_2026
  GROUP BY property_id, site_id
),
seasonal AS (
  SELECT DISTINCT ON (property_id)
    property_id,
    seasonal_rates
  FROM campspot.siteseasonals
  ORDER BY property_id, updated_at DESC NULLS LAST
)
SELECT
  NULL::text AS duplicatenote,
  'Campspot'::text AS source,
  to_char(now() AT TIME ZONE 'UTC', 'MM-DD-YYYY') AS date_added,
  to_char(now() AT TIME ZONE 'UTC', 'MM-DD-YYYY') AS date_updated,
  pd.name AS property_name,
  COALESCE(ls.site_name, psd.name) AS site_name,
  psd.category AS unit_type,
  COALESCE(pd.categories->>0, 'Campground / RV') AS property_type,
  pd.sites_count::text AS property_total_sites,
  pd.address,
  pd.city,
  pd.state,
  pd.postal_code AS zip_code,
  COALESCE(pd.country, 'United States') AS country,
  ym.occupancy_rate_2024,
  ym.avg_retail_daily_rate_2024,
  ym.high_rate_2024,
  ym.low_rate_2024,
  ym.occupancy_rate_2025,
  ym.avg_retail_daily_rate_2025,
  ym.high_rate_2025,
  ym.low_rate_2025,
  ym.revpar_2025,
  hl5.high_month_2025,
  hl5.high_avg_occupancy_2025,
  hl5.low_month_2025,
  hl5.low_avg_occupancy_2025,
  ym.occupancy_rate_2026,
  ym.high_rate_2026,
  ym.low_rate_2026,
  ym.revpar_2026,
  hl6.high_month_2026,
  hl6.high_avg_occupancy_2026,
  hl6.low_month_2026,
  hl6.low_avg_occupancy_2026,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Winter', 'weekday') AS winter_weekday,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Winter', 'weekend') AS winter_weekend,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Spring', 'weekday') AS spring_weekday,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Spring', 'weekend') AS spring_weekend,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Summer', 'weekday') AS summer_weekday,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Summer', 'weekend') AS summer_weekend,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Fall', 'weekday') AS fall_weekday,
  public.flat_seasonal_rate(ss.seasonal_rates, 'Fall', 'weekend') AS fall_weekend,
  pd.link AS url,
  COALESCE(psd.description, pd.description) AS description,
  CASE WHEN pd.coordinates IS NOT NULL
    THEN round(ST_X(pd.coordinates::geometry)::numeric, 6)::text
  END AS lon,
  CASE WHEN pd.coordinates IS NOT NULL
    THEN round(ST_Y(pd.coordinates::geometry)::numeric, 6)::text
  END AS lat,
  public.flat_amenity_yes(pd.amenities::jsonb, 'Pool') AS pool,
  public.flat_amenity_yes(pd.amenities::jsonb, 'Pets') AS pets,
  COALESCE(
    public.flat_amenity_arr_yes(ls.site_amenities::jsonb, 'Water Hook-Up'),
    public.flat_amenity_yes(psd.amenities::jsonb, 'Water Hook-Up')
  ) AS water,
  COALESCE(
    public.flat_amenity_arr_yes(ls.site_amenities::jsonb, 'Private Shower'),
    public.flat_amenity_yes(psd.amenities::jsonb, 'Private Shower')
  ) AS shower,
  CASE
    WHEN psd.amenities::jsonb ? 'Private Bathroom' OR psd.amenities::jsonb ? 'Private Shower' THEN 'Yes'
    WHEN psd.amenities IS NOT NULL THEN 'No'
    ELSE NULL
  END AS private_bathroom,
  COALESCE(
    public.flat_amenity_arr_yes(ls.site_amenities::jsonb, 'Sewer Hook-Up'),
    public.flat_amenity_yes(psd.amenities::jsonb, 'Sewer Hook-Up')
  ) AS sewer_hook_up,
  CASE
    WHEN (
      public.flat_amenity_arr_yes(ls.site_amenities::jsonb, '30-Amp') = 'Yes'
      OR public.flat_amenity_arr_yes(ls.site_amenities::jsonb, '50-Amp') = 'Yes'
      OR public.flat_amenity_yes(psd.amenities::jsonb, '30-Amp') = 'Yes'
      OR public.flat_amenity_yes(psd.amenities::jsonb, '50-Amp') = 'Yes'
    ) THEN 'Yes'
    WHEN ls.site_amenities IS NOT NULL OR psd.amenities IS NOT NULL THEN 'No'
    ELSE NULL
  END AS electrical_hook_up,
  COALESCE(
    public.flat_amenity_arr_yes(ls.site_amenities::jsonb, 'Water Hook-Up'),
    public.flat_amenity_yes(psd.amenities::jsonb, 'Water Hook-Up')
  ) AS water_hookup,
  now() AS updated_at
FROM ls
JOIN campspot.propertydetails pd ON pd.id = ls.property_id
LEFT JOIN site_parent sp ON sp.id = ls.site_id AND sp.property_id = ls.property_id
LEFT JOIN parent_sd psd ON psd.id = COALESCE(ls.parent_id, sp.parent_id) AND psd.property_id = ls.property_id
LEFT JOIN year_metrics ym ON ym.property_id = ls.property_id AND ym.site_id = ls.site_id
LEFT JOIN high_low_2025 hl5 ON hl5.property_id = ls.property_id AND hl5.site_id = ls.site_id
LEFT JOIN high_low_2026 hl6 ON hl6.property_id = ls.property_id AND hl6.site_id = ls.site_id
LEFT JOIN seasonal ss ON ss.property_id = ls.property_id;

COMMIT;
