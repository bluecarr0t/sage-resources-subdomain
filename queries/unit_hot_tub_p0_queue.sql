-- =============================================================================
-- Prioritized unit_hot_tub blank queue (Amenity Impact P0)
-- Safari Tent + Cabin first, then other blanks by unit_weight DESC.
-- =============================================================================

WITH cohort AS (
  SELECT
    g.id,
    g.property_id,
    btrim(g.property_name) AS property_name,
    g.site_name,
    g.unit_type,
    g.state,
    g.url,
    g.ota_url_hipcamp,
    g.ota_url_airbnb,
    g.discovery_source,
    GREATEST(COALESCE(g.quantity_of_units, 1), 1)::numeric AS unit_weight,
    g.rate_avg_retail_daily_rate,
    nullif(btrim(coalesce(g.unit_hot_tub, '')), '') AS unit_hot_tub_current,
    nullif(btrim(coalesce(g.property_hot_tub, '')), '') AS property_hot_tub_current,
    nullif(btrim(coalesce(g.unit_hot_tub_or_sauna, '')), '') AS unit_hot_tub_or_sauna_current
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
    AND nullif(btrim(coalesce(g.unit_hot_tub, '')), '') IS NULL
)
SELECT
  CASE
    WHEN lower(btrim(coalesce(unit_type, ''))) IN ('safari tent', 'cabin')
      THEN 'P0-Safari/Cabin-blank'
    ELSE 'P0-other-blank'
  END AS priority_stratum,
  id,
  property_id,
  property_name,
  site_name,
  unit_type,
  state,
  unit_weight,
  rate_avg_retail_daily_rate,
  unit_hot_tub_current,
  property_hot_tub_current,
  unit_hot_tub_or_sauna_current,
  url,
  ota_url_hipcamp,
  ota_url_airbnb,
  discovery_source
FROM cohort
ORDER BY
  CASE
    WHEN lower(btrim(coalesce(unit_type, ''))) IN ('safari tent', 'cabin') THEN 0
    ELSE 1
  END,
  unit_weight DESC,
  id ASC;
