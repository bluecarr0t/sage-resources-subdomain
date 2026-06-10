-- Rebuild unified_comps matview with Sage is_open column (includes closed / pre-opening sites).
DROP MATERIALIZED VIEW IF EXISTS public.unified_comps CASCADE;

-- -----------------------------------------------------------------------------
-- The materialized view
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW public.unified_comps AS
-- --------- 1. Past reports (feasibility_comparables) --------------------------
WITH report_units AS (
  SELECT
    u.comparable_id,
    array_agg(DISTINCT u.unit_type) FILTER (WHERE u.unit_type IS NOT NULL) AS unit_types,
    array_agg(DISTINCT u.unit_category) FILTER (WHERE u.unit_category IS NOT NULL) AS unit_categories,
    MIN(u.low_adr) AS low_adr,
    MAX(u.peak_adr) AS peak_adr,
    AVG(u.avg_annual_adr) AS avg_adr,
    AVG(u.low_occupancy) AS low_occupancy,
    AVG(u.peak_occupancy) AS peak_occupancy,
    SUM(u.num_units) AS total_num_units
  FROM public.feasibility_comp_units u
  GROUP BY u.comparable_id
)
SELECT
  ('rep:' || fc.id::text)                                             AS id,
  'reports'::text                                                     AS source,
  fc.id::text                                                         AS source_row_id,
  COALESCE(NULLIF(trim(fc.comp_name), ''), 'Unknown')                 AS property_name,
  r.city                                                              AS city,
  UPPER(COALESCE(
    NULLIF(public.us_state_abbrev_from_text(fc.overview), ''),
    NULLIF(trim(fc.state), ''),
    r.state
  )) AS state,
  r.country                                                           AS country,
  r.latitude::numeric                                                 AS lat,
  r.longitude::numeric                                                AS lon,
  fc.property_type                                                    AS property_type,
  CASE
    WHEN ru.unit_types IS NOT NULL AND array_length(ru.unit_types, 1) > 0
      THEN array_to_string(ru.unit_types, ', ')
    ELSE NULL
  END                                                                 AS unit_type,
  CASE
    WHEN ru.unit_categories IS NOT NULL AND array_length(ru.unit_categories, 1) > 0
      THEN ru.unit_categories[1]
    ELSE NULL
  END                                                                 AS unit_category,
  ru.unit_categories                                                  AS unit_categories,
  fc.total_sites::numeric                                             AS total_sites,
  ru.total_num_units                                                  AS num_units,
  ru.low_adr                                                          AS low_adr,
  ru.peak_adr                                                         AS peak_adr,
  ru.avg_adr                                                          AS avg_adr,
  ru.low_occupancy                                                    AS low_occupancy,
  ru.peak_occupancy                                                   AS peak_occupancy,
  fc.quality_score                                                    AS quality_score,
  COALESCE(fc.amenity_keywords, ARRAY[]::text[])                      AS amenity_keywords,
  r.study_id                                                          AS study_id,
  fc.overview                                                         AS overview,
  r.property_name                                                     AS report_property_name,
  NULL::text                                                          AS website_url,
  public.unified_address_key(
    NULLIF(trim(concat_ws(' ', NULLIF(trim(r.address_1), ''), NULLIF(trim(r.address_2), ''))), ''),
    r.city,
    UPPER(COALESCE(
      NULLIF(public.us_state_abbrev_from_text(fc.overview), ''),
      NULLIF(trim(fc.state), ''),
      r.state
    )),
    r.country,
    r.latitude::numeric,
    r.longitude::numeric,
    COALESCE(NULLIF(trim(fc.comp_name), ''), 'Unknown')
  )                                                                 AS address_key,
  fc.created_at                                                       AS created_at,
  'Yes'::text                                                         AS is_glamping_property,
  NULL::text                                                          AS is_open,
  to_tsvector(
    'simple',
    COALESCE(fc.comp_name, '') || ' ' ||
    COALESCE(fc.overview, '') || ' ' ||
    COALESCE(r.city, '') || ' ' ||
    COALESCE(
      NULLIF(public.us_state_abbrev_from_text(fc.overview), ''),
      NULLIF(trim(fc.state), ''),
      r.state
    ) || ' ' ||
    COALESCE(r.country, '') || ' ' ||
    COALESCE(r.study_id, '') || ' ' ||
    COALESCE(array_to_string(ru.unit_types, ' '), '') || ' ' ||
    COALESCE(array_to_string(ru.unit_categories, ' '), '') || ' ' ||
    COALESCE(array_to_string(fc.amenity_keywords, ' '), '') || ' ' ||
    public.state_full_name_for_tsvector(UPPER(COALESCE(
      NULLIF(public.us_state_abbrev_from_text(fc.overview), ''),
      NULLIF(trim(fc.state), ''),
      r.state
    )))
  )                                                                   AS search_tsv
FROM public.feasibility_comparables fc
JOIN public.reports r ON r.id = fc.report_id
LEFT JOIN report_units ru ON ru.comparable_id = fc.id
WHERE fc.comp_name IS NOT NULL
  AND length(trim(fc.comp_name)) BETWEEN 1 AND 80

UNION ALL

-- --------- 2. all_glamping_properties -----------------------------------------
-- Coordinates: prefer `lat`/`lon` on the row; fall back to `property_geocode`
-- (Sage AI / scripts/backfill-property-geocode.ts) when main columns are null.
SELECT
  ('glamp:' || g.id::text)                                            AS id,
  'all_glamping_properties'::text                                     AS source,
  g.id::text                                                          AS source_row_id,
  COALESCE(NULLIF(trim(g.property_name), ''), 'Unknown')              AS property_name,
  g.city,
  UPPER(NULLIF(trim(g.state), ''))                                    AS state,
  g.country,
  COALESCE(g.lat, pg.latitude)                                        AS lat,
  COALESCE(g.lon, pg.longitude)                                       AS lon,
  g.property_type,
  public.sage_unified_unit_text(g.unit_type, g.site_name, g.property_type) AS unit_type,
  -- Leave unit_category NULL; matched to feasibility unit_category via UI filter when values overlap.
  NULL::text                                                          AS unit_category,
  NULL::text[]                                                        AS unit_categories,
  g.property_total_sites                                              AS total_sites,
  g.quantity_of_units                                                 AS num_units,
  LEAST(
    NULLIF(public.safe_numeric(g.rate_winter_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_winter_weekend), 0),
    NULLIF(public.safe_numeric(g.rate_spring_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_spring_weekend), 0),
    NULLIF(public.safe_numeric(g.rate_fall_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_fall_weekend), 0),
    NULLIF(public.safe_numeric(g.rate_summer_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_summer_weekend), 0)
  )                                                                   AS low_adr,
  GREATEST(
    NULLIF(public.safe_numeric(g.rate_winter_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_winter_weekend), 0),
    NULLIF(public.safe_numeric(g.rate_spring_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_spring_weekend), 0),
    NULLIF(public.safe_numeric(g.rate_fall_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_fall_weekend), 0),
    NULLIF(public.safe_numeric(g.rate_summer_weekday), 0),
    NULLIF(public.safe_numeric(g.rate_summer_weekend), 0)
  )                                                                   AS peak_adr,
  g.rate_avg_retail_daily_rate                                        AS avg_adr,
  NULL::numeric                                                       AS low_occupancy,
  NULL::numeric                                                       AS peak_occupancy,
  g.quality_score                                                     AS quality_score,
  (
    SELECT ARRAY(
      SELECT kw FROM unnest(ARRAY[
        CASE WHEN public.is_yes(g.property_pool) THEN 'pool' END,
        CASE WHEN public.is_yes(g.property_hot_tub) THEN 'hot tub' END,
        CASE WHEN public.is_yes(g.property_sauna) THEN 'sauna' END,
        CASE WHEN public.is_yes(g.property_restaurant) THEN 'restaurant' END,
        CASE WHEN public.is_yes(g.property_food_on_site) THEN 'food on site' END,
        CASE WHEN public.is_yes(g.property_dog_park) THEN 'dog park' END,
        CASE WHEN public.is_yes(g.property_clubhouse) THEN 'clubhouse' END,
        CASE WHEN public.is_yes(g.property_laundry) THEN 'laundry' END,
        CASE WHEN public.is_yes(g.property_playground) THEN 'playground' END,
        CASE WHEN public.is_yes(g.property_waterpark) THEN 'waterpark' END,
        CASE WHEN public.is_yes(g.property_waterfront) THEN 'waterfront' END,
        CASE WHEN public.is_yes(g.property_fitness_room) THEN 'fitness room' END,
        CASE WHEN public.is_yes(g.property_general_store) THEN 'general store' END,
        CASE WHEN public.is_yes(g.unit_wifi) THEN 'wifi' END,
        CASE WHEN public.is_yes(g.unit_air_conditioning) THEN 'air conditioning' END,
        CASE WHEN public.is_yes(g.unit_gas_fireplace) THEN 'gas fireplace' END,
        CASE WHEN public.is_yes(g.unit_pets) THEN 'pets allowed' END,
        CASE WHEN public.is_yes(g.unit_full_kitchen) THEN 'full kitchen' END,
        CASE WHEN public.is_yes(g.unit_kitchenette) THEN 'kitchenette' END,
        CASE WHEN public.is_yes(g.unit_ada_accessibility) THEN 'ada accessible' END,
        CASE WHEN public.is_yes(g.unit_private_bathroom) THEN 'private bathroom' END
      ]) kw
      WHERE kw IS NOT NULL
    )
  )                                                                   AS amenity_keywords,
  NULL::text                                                          AS study_id,
  g.description                                                       AS overview,
  NULL::text                                                          AS report_property_name,
  -- Sage: `all_glamping_properties.url` only (no `google_website_uri` column in this schema).
  NULLIF(trim(g.url), '') AS website_url,
  public.unified_address_key(
    NULLIF(trim(g.address), ''),
    g.city,
    UPPER(NULLIF(trim(g.state), '')),
    g.country,
    COALESCE(g.lat, pg.latitude),
    COALESCE(g.lon, pg.longitude),
    COALESCE(NULLIF(trim(g.property_name), ''), 'Unknown')
  )                                                                 AS address_key,
  COALESCE(g.created_at, g.updated_at)                                AS created_at,
  g.is_glamping_property::text                                        AS is_glamping_property,
  CASE
    WHEN COALESCE(NULLIF(trim(g.is_open), ''), 'Yes') IN ('No') THEN 'Closed'
    ELSE COALESCE(NULLIF(trim(g.is_open), ''), 'Yes')
  END                                                                 AS is_open,
  to_tsvector(
    'simple',
    COALESCE(g.property_name, '') || ' ' ||
    COALESCE(g.description, '') || ' ' ||
    COALESCE(g.city, '') || ' ' ||
    COALESCE(g.state, '') || ' ' ||
    COALESCE(g.country, '') || ' ' ||
    COALESCE(public.sage_unified_unit_text(g.unit_type, g.site_name, g.property_type), '') || ' ' ||
    public.state_full_name_for_tsvector(UPPER(NULLIF(trim(g.state), '')))
  )                                                                   AS search_tsv
FROM public.all_glamping_properties g
LEFT JOIN public.property_geocode pg ON pg.property_id = g.id
WHERE g.property_name IS NOT NULL
  AND length(trim(g.property_name)) > 0

UNION ALL

-- --------- 3. hipcamp ---------------------------------------------------------
SELECT
  ('hip:' || h.id::text)                                              AS id,
  'hipcamp'::text                                                     AS source,
  h.id::text                                                          AS source_row_id,
  COALESCE(NULLIF(trim(h.property_name), ''), 'Unknown')              AS property_name,
  h.city,
  UPPER(NULLIF(trim(h.state), ''))                                    AS state,
  h.country,
  COALESCE(h.lat_num::numeric, public.safe_numeric(h.lat))             AS lat,
  COALESCE(h.lon_num::numeric, public.safe_numeric(h.lon))               AS lon,
  h.property_type,
  h.unit_type,
  NULL::text                                                          AS unit_category,
  NULL::text[]                                                        AS unit_categories,
  public.safe_numeric(h.property_total_sites)                         AS total_sites,
  public.safe_numeric(h.quantity_of_units)                            AS num_units,
  COALESCE(
    public.safe_numeric(h.low_rate_2025),
    public.safe_numeric(h.low_rate_2024),
    public.safe_numeric(h.low_rate_next_12_months)
  )                                                                   AS low_adr,
  COALESCE(
    public.safe_numeric(h.high_rate_2025),
    public.safe_numeric(h.high_rate_2024),
    public.safe_numeric(h.high_rate_next_12_months)
  )                                                                   AS peak_adr,
  COALESCE(
    public.safe_numeric(h.avg_retail_daily_rate_2025),
    public.safe_numeric(h.avg_retail_daily_rate_2024),
    public.safe_numeric(h.avg_rate_next_12_months)
  )                                                                   AS avg_adr,
  COALESCE(
    public.safe_numeric(h.low_avg_occupancy_2025),
    public.safe_numeric(h.occupancy_rate_2025),
    public.safe_numeric(h.occupancy_rate_2024)
  )                                                                   AS low_occupancy,
  COALESCE(
    public.safe_numeric(h.high_avg_occupancy_2025),
    public.safe_numeric(h.occupancy_rate_2026)
  )                                                                   AS peak_occupancy,
  NULL::numeric                                                       AS quality_score,
  (
    SELECT ARRAY(
      SELECT kw FROM unnest(ARRAY[
        CASE WHEN public.is_yes(h.pool) THEN 'pool' END,
        CASE WHEN public.is_yes(h.hot_tub_sauna) THEN 'hot tub' END,
        CASE WHEN public.is_yes(h.pets) THEN 'pets allowed' END,
        CASE WHEN public.is_yes(h.wifi) THEN 'wifi' END,
        CASE WHEN public.is_yes(h.laundry) THEN 'laundry' END,
        CASE WHEN public.is_yes(h.playground) THEN 'playground' END,
        CASE WHEN public.is_yes(h.campfires) THEN 'campfires' END,
        CASE WHEN public.is_yes(h.waterfront) THEN 'waterfront' END,
        CASE WHEN public.is_yes(h.restaurant) THEN 'restaurant' END,
        CASE WHEN public.is_yes(h.dog_park) THEN 'dog park' END,
        CASE WHEN public.is_yes(h.clubhouse) THEN 'clubhouse' END,
        CASE WHEN public.is_yes(h.waterpark) THEN 'waterpark' END,
        CASE WHEN public.is_yes(h.general_store) THEN 'general store' END,
        CASE WHEN public.is_yes(h.private_bathroom) THEN 'private bathroom' END,
        CASE WHEN public.is_yes(h.kitchen) THEN 'kitchen' END
      ]) kw
      WHERE kw IS NOT NULL
    )
  )                                                                   AS amenity_keywords,
  NULL::text                                                          AS study_id,
  h.description                                                       AS overview,
  NULL::text                                                          AS report_property_name,
  NULLIF(trim(h.url), '')                                            AS website_url,
  public.unified_address_key(
    NULLIF(trim(h.address), ''),
    h.city,
    UPPER(NULLIF(trim(h.state), '')),
    h.country,
    COALESCE(h.lat_num::numeric, public.safe_numeric(h.lat)),
    COALESCE(h.lon_num::numeric, public.safe_numeric(h.lon)),
    COALESCE(NULLIF(trim(h.property_name), ''), 'Unknown')
  )                                                                 AS address_key,
  COALESCE(h.created_at, h.updated_at)                                AS created_at,
  'Yes'::text                                                         AS is_glamping_property,
  NULL::text                                                          AS is_open,
  to_tsvector(
    'simple',
    COALESCE(h.property_name, '') || ' ' ||
    COALESCE(h.city, '') || ' ' ||
    COALESCE(h.state, '') || ' ' ||
    COALESCE(h.country, '') || ' ' ||
    COALESCE(h.unit_type, '') || ' ' ||
    COALESCE(h.property_type, '') || ' ' ||
    public.state_full_name_for_tsvector(UPPER(NULLIF(trim(h.state), '')))
  )                                                                   AS search_tsv
FROM public.hipcamp h
WHERE h.property_name IS NOT NULL
  AND length(trim(h.property_name)) > 0

UNION ALL

-- --------- 4. campspot --------------------------------------------------------
SELECT
  ('camp:' || c.id::text)                                             AS id,
  'campspot'::text                                                    AS source,
  c.id::text                                                          AS source_row_id,
  COALESCE(NULLIF(trim(c.property_name), ''), 'Unknown')              AS property_name,
  c.city,
  UPPER(NULLIF(trim(c.state), ''))                                    AS state,
  c.country,
  COALESCE(c.lat_num::numeric, public.safe_numeric(c.lat))            AS lat,
  COALESCE(c.lon_num::numeric, public.safe_numeric(c.lon))            AS lon,
  c.property_type,
  c.unit_type,
  NULL::text                                                          AS unit_category,
  NULL::text[]                                                        AS unit_categories,
  public.safe_numeric(c.property_total_sites)                         AS total_sites,
  public.safe_numeric(c.quantity_of_units)                            AS num_units,
  COALESCE(
    public.safe_numeric(c.low_rate_2025),
    public.safe_numeric(c.low_rate_2024),
    public.safe_numeric(c.low_rate_next_12_months)
  )                                                                   AS low_adr,
  COALESCE(
    public.safe_numeric(c.high_rate_2025),
    public.safe_numeric(c.high_rate_2024),
    public.safe_numeric(c.high_rate_next_12_months)
  )                                                                   AS peak_adr,
  COALESCE(
    public.safe_numeric(c.avg_retail_daily_rate_2025),
    public.safe_numeric(c.avg_retail_daily_rate_2024),
    public.safe_numeric(c.avg_rate_next_12_months)
  )                                                                   AS avg_adr,
  COALESCE(
    public.safe_numeric(c.low_avg_occupancy_2025),
    public.safe_numeric(c.occupancy_rate_2025),
    public.safe_numeric(c.occupancy_rate_2024)
  )                                                                   AS low_occupancy,
  COALESCE(
    public.safe_numeric(c.high_avg_occupancy_2025),
    public.safe_numeric(c.occupancy_rate_2026)
  )                                                                   AS peak_occupancy,
  NULL::numeric                                                       AS quality_score,
  (
    SELECT ARRAY(
      SELECT kw FROM unnest(ARRAY[
        CASE WHEN public.is_yes(c.pool) THEN 'pool' END,
        CASE WHEN public.is_yes(c.hot_tub_sauna) THEN 'hot tub' END,
        CASE WHEN public.is_yes(c.pets) THEN 'pets allowed' END,
        CASE WHEN public.is_yes(c.wifi) THEN 'wifi' END,
        CASE WHEN public.is_yes(c.laundry) THEN 'laundry' END,
        CASE WHEN public.is_yes(c.playground) THEN 'playground' END,
        CASE WHEN public.is_yes(c.campfires) THEN 'campfires' END,
        CASE WHEN public.is_yes(c.waterfront) THEN 'waterfront' END,
        CASE WHEN public.is_yes(c.restaurant) THEN 'restaurant' END,
        CASE WHEN public.is_yes(c.dog_park) THEN 'dog park' END,
        CASE WHEN public.is_yes(c.clubhouse) THEN 'clubhouse' END,
        CASE WHEN public.is_yes(c.waterpark) THEN 'waterpark' END,
        CASE WHEN public.is_yes(c.general_store) THEN 'general store' END,
        CASE WHEN public.is_yes(c.private_bathroom) THEN 'private bathroom' END,
        CASE WHEN public.is_yes(c.kitchen) THEN 'kitchen' END
      ]) kw
      WHERE kw IS NOT NULL
    )
  )                                                                   AS amenity_keywords,
  NULL::text                                                          AS study_id,
  c.description                                                       AS overview,
  NULL::text                                                          AS report_property_name,
  NULLIF(trim(c.url), '')                                            AS website_url,
  public.unified_address_key(
    NULLIF(trim(c.address), ''),
    c.city,
    UPPER(NULLIF(trim(c.state), '')),
    c.country,
    COALESCE(c.lat_num::numeric, public.safe_numeric(c.lat)),
    COALESCE(c.lon_num::numeric, public.safe_numeric(c.lon)),
    COALESCE(NULLIF(trim(c.property_name), ''), 'Unknown')
  )                                                                 AS address_key,
  COALESCE(c.created_at, c.updated_at)                                AS created_at,
  'Yes'::text                                                         AS is_glamping_property,
  NULL::text                                                          AS is_open,
  to_tsvector(
    'simple',
    COALESCE(c.property_name, '') || ' ' ||
    COALESCE(c.city, '') || ' ' ||
    COALESCE(c.state, '') || ' ' ||
    COALESCE(c.country, '') || ' ' ||
    COALESCE(c.unit_type, '') || ' ' ||
    COALESCE(c.property_type, '') || ' ' ||
    public.state_full_name_for_tsvector(UPPER(NULLIF(trim(c.state), '')))
  )                                                                   AS search_tsv
FROM public.campspot c
WHERE c.property_name IS NOT NULL
  AND length(trim(c.property_name)) > 0

UNION ALL

-- --------- 5. all_roverpass_data_new (unified schema, identical to glamping) --
SELECT
  ('rover:' || rp.id::text)                                           AS id,
  'all_roverpass_data_new'::text                                      AS source,
  rp.id::text                                                         AS source_row_id,
  COALESCE(NULLIF(trim(rp.property_name), ''), 'Unknown')             AS property_name,
  rp.city,
  UPPER(NULLIF(trim(rp.state), ''))                                   AS state,
  rp.country,
  rp.lat,
  rp.lon,
  rp.property_type,
  rp.unit_type,
  NULL::text                                                          AS unit_category,
  NULL::text[]                                                        AS unit_categories,
  rp.property_total_sites                                             AS total_sites,
  rp.quantity_of_units                                                AS num_units,
  LEAST(
    NULLIF(rp.rate_winter_weekday, 0),
    NULLIF(rp.rate_winter_weekend, 0),
    NULLIF(rp.rate_spring_weekday, 0),
    NULLIF(rp.rate_spring_weekend, 0),
    NULLIF(rp.rate_fall_weekday, 0),
    NULLIF(rp.rate_fall_weekend, 0),
    NULLIF(rp.rate_summer_weekday, 0),
    NULLIF(rp.rate_summer_weekend, 0)
  )                                                                   AS low_adr,
  GREATEST(
    NULLIF(rp.rate_winter_weekday, 0),
    NULLIF(rp.rate_winter_weekend, 0),
    NULLIF(rp.rate_spring_weekday, 0),
    NULLIF(rp.rate_spring_weekend, 0),
    NULLIF(rp.rate_fall_weekday, 0),
    NULLIF(rp.rate_fall_weekend, 0),
    NULLIF(rp.rate_summer_weekday, 0),
    NULLIF(rp.rate_summer_weekend, 0)
  )                                                                   AS peak_adr,
  rp.rate_avg_retail_daily_rate                                       AS avg_adr,
  rp.roverpass_occupancy_rate                                         AS low_occupancy,
  rp.roverpass_occupancy_rate                                         AS peak_occupancy,
  rp.quality_score                                                    AS quality_score,
  (
    SELECT ARRAY(
      SELECT kw FROM unnest(ARRAY[
        CASE WHEN public.is_yes(rp.property_pool) THEN 'pool' END,
        CASE WHEN public.is_yes(rp.property_hot_tub) THEN 'hot tub' END,
        CASE WHEN public.is_yes(rp.property_sauna) THEN 'sauna' END,
        CASE WHEN public.is_yes(rp.property_restaurant) THEN 'restaurant' END,
        CASE WHEN public.is_yes(rp.property_food_on_site) THEN 'food on site' END,
        CASE WHEN public.is_yes(rp.property_dog_park) THEN 'dog park' END,
        CASE WHEN public.is_yes(rp.property_clubhouse) THEN 'clubhouse' END,
        CASE WHEN public.is_yes(rp.property_laundry) THEN 'laundry' END,
        CASE WHEN public.is_yes(rp.property_playground) THEN 'playground' END,
        CASE WHEN public.is_yes(rp.property_waterpark) THEN 'waterpark' END,
        CASE WHEN public.is_yes(rp.property_waterfront) THEN 'waterfront' END,
        CASE WHEN public.is_yes(rp.property_fitness_room) THEN 'fitness room' END,
        CASE WHEN public.is_yes(rp.property_general_store) THEN 'general store' END,
        CASE WHEN public.is_yes(rp.unit_wifi) THEN 'wifi' END,
        CASE WHEN public.is_yes(rp.unit_air_conditioning) THEN 'air conditioning' END,
        CASE WHEN public.is_yes(rp.unit_gas_fireplace) THEN 'gas fireplace' END,
        CASE WHEN public.is_yes(rp.unit_pets) THEN 'pets allowed' END,
        CASE WHEN public.is_yes(rp.unit_full_kitchen) THEN 'full kitchen' END,
        CASE WHEN public.is_yes(rp.unit_kitchenette) THEN 'kitchenette' END,
        CASE WHEN public.is_yes(rp.unit_ada_accessibility) THEN 'ada accessible' END,
        CASE WHEN public.is_yes(rp.unit_private_bathroom) THEN 'private bathroom' END
      ]) kw
      WHERE kw IS NOT NULL
    )
  )                                                                   AS amenity_keywords,
  NULL::text                                                          AS study_id,
  rp.description                                                      AS overview,
  NULL::text                                                          AS report_property_name,
  NULLIF(trim(rp.url), '')                                           AS website_url,
  public.unified_address_key(
    NULLIF(trim(rp.address), ''),
    rp.city,
    UPPER(NULLIF(trim(rp.state), '')),
    rp.country,
    rp.lat,
    rp.lon,
    COALESCE(NULLIF(trim(rp.property_name), ''), 'Unknown')
  )                                                                 AS address_key,
  COALESCE(rp.created_at, rp.updated_at)                              AS created_at,
  rp.is_glamping_property::text                                       AS is_glamping_property,
  NULL::text                                                          AS is_open,
  to_tsvector(
    'simple',
    COALESCE(rp.property_name, '') || ' ' ||
    COALESCE(rp.description, '') || ' ' ||
    COALESCE(rp.city, '') || ' ' ||
    COALESCE(rp.state, '') || ' ' ||
    COALESCE(rp.country, '') || ' ' ||
    COALESCE(rp.unit_type, '') || ' ' ||
    COALESCE(rp.property_type, '') || ' ' ||
    public.state_full_name_for_tsvector(UPPER(NULLIF(trim(rp.state), '')))
  )                                                                   AS search_tsv
FROM public.all_roverpass_data_new rp
WHERE rp.property_name IS NOT NULL
  AND length(trim(rp.property_name)) > 0
  AND COALESCE(rp.is_closed, 'No') <> 'Yes';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
-- UNIQUE index on the synthetic `id` is required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX unified_comps_pk ON public.unified_comps (id);

CREATE INDEX unified_comps_search_gin
  ON public.unified_comps USING GIN (search_tsv);

CREATE INDEX unified_comps_name_trgm
  ON public.unified_comps USING GIN (property_name gin_trgm_ops);

CREATE INDEX unified_comps_source
  ON public.unified_comps (source);

CREATE INDEX unified_comps_sage_is_open
  ON public.unified_comps (is_open)
  WHERE source = 'all_glamping_properties' AND is_open IS NOT NULL;

CREATE INDEX unified_comps_source_state
  ON public.unified_comps (source, state);

CREATE INDEX unified_comps_state
  ON public.unified_comps (state);

CREATE INDEX unified_comps_created_at_desc
  ON public.unified_comps (created_at DESC);

CREATE INDEX unified_comps_quality_score
  ON public.unified_comps (quality_score DESC NULLS LAST);

CREATE INDEX unified_comps_total_sites
  ON public.unified_comps (total_sites DESC NULLS LAST);

CREATE INDEX unified_comps_low_adr
  ON public.unified_comps (low_adr) WHERE low_adr IS NOT NULL;

CREATE INDEX unified_comps_peak_adr
  ON public.unified_comps (peak_adr) WHERE peak_adr IS NOT NULL;

CREATE INDEX unified_comps_keywords_gin
  ON public.unified_comps USING GIN (amenity_keywords);

CREATE INDEX unified_comps_unit_categories_gin
  ON public.unified_comps USING GIN (unit_categories);

CREATE INDEX unified_comps_study_id
  ON public.unified_comps (study_id) WHERE study_id IS NOT NULL;

CREATE INDEX unified_comps_address_key
  ON public.unified_comps (address_key);

-- -----------------------------------------------------------------------------
-- Grants: let the admin service role read the matview. API routes gate via
-- `withAdminAuth`, not RLS (matviews don't support RLS).
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.unified_comps TO authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- Initial populate (non-concurrent on first creation)
-- -----------------------------------------------------------------------------
REFRESH MATERIALIZED VIEW public.unified_comps;
