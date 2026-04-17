-- =============================================================================
-- Unified Comps Materialized View
--
-- Prerequisite: `public.property_geocode` must exist for the Sage branch JOIN
-- (see scripts/migrations/sage-ai-property-geocode.sql). Without it, CREATE
-- MATERIALIZED VIEW fails.
--
-- Combines 5 data sources into a single indexed matview for the /admin/comps
-- page:
--   1. feasibility_comparables + reports + feasibility_comp_units  (source='reports')
--   2. all_glamping_properties                                     (source='all_glamping_properties')
--   3. hipcamp                                                     (source='hipcamp')
--   4. campspot                                                    (source='campspot')
--   5. all_roverpass_data_new                                      (source='all_roverpass_data_new')
--
-- Row shape is designed so one row = one property. Pagination, sort, filters
-- and fuzzy search all run against this matview via Postgres indexes, giving
-- sub-100ms page loads for /api/admin/comps/unified.
--
-- Refresh nightly via pg_cron (see bottom of file) or via Vercel cron fallback
-- calling /api/admin/comps/unified/refresh.
-- =============================================================================

BEGIN;

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- Helper: safely coerce dirty TEXT columns in hipcamp / campspot to numeric.
-- Strips currency symbols, commas, whitespace; returns NULL on empty or invalid
-- inputs so the matview refresh never fails on a malformed row.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_numeric(v text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  cleaned text;
BEGIN
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  cleaned := regexp_replace(v, '[^0-9.\-]', '', 'g');
  IF cleaned IS NULL OR cleaned = '' OR cleaned = '-' OR cleaned = '.' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN cleaned::numeric;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- -----------------------------------------------------------------------------
-- Helper: convert 'Yes' / 'Y' / 'true' / '1' text columns to boolean for
-- building amenity_keywords arrays.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_yes(v text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN v IS NULL THEN FALSE
    WHEN lower(trim(v)) IN ('yes', 'y', 'true', 't', '1') THEN TRUE
    ELSE FALSE
  END;
$$;

-- -----------------------------------------------------------------------------
-- Full state/province names for FTS: `state` is stored as e.g. TX; without this,
-- searching "texas" does not match the tsvector. Appended to search_tsv only.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.state_full_name_for_tsvector(p_state text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE upper(trim(COALESCE(p_state, '')))
    WHEN 'AL' THEN ' Alabama'
    WHEN 'AK' THEN ' Alaska'
    WHEN 'AZ' THEN ' Arizona'
    WHEN 'AR' THEN ' Arkansas'
    WHEN 'CA' THEN ' California'
    WHEN 'CO' THEN ' Colorado'
    WHEN 'CT' THEN ' Connecticut'
    WHEN 'DE' THEN ' Delaware'
    WHEN 'FL' THEN ' Florida'
    WHEN 'GA' THEN ' Georgia'
    WHEN 'HI' THEN ' Hawaii'
    WHEN 'ID' THEN ' Idaho'
    WHEN 'IL' THEN ' Illinois'
    WHEN 'IN' THEN ' Indiana'
    WHEN 'IA' THEN ' Iowa'
    WHEN 'KS' THEN ' Kansas'
    WHEN 'KY' THEN ' Kentucky'
    WHEN 'LA' THEN ' Louisiana'
    WHEN 'ME' THEN ' Maine'
    WHEN 'MD' THEN ' Maryland'
    WHEN 'MA' THEN ' Massachusetts'
    WHEN 'MI' THEN ' Michigan'
    WHEN 'MN' THEN ' Minnesota'
    WHEN 'MS' THEN ' Mississippi'
    WHEN 'MO' THEN ' Missouri'
    WHEN 'MT' THEN ' Montana'
    WHEN 'NE' THEN ' Nebraska'
    WHEN 'NV' THEN ' Nevada'
    WHEN 'NH' THEN ' New Hampshire'
    WHEN 'NJ' THEN ' New Jersey'
    WHEN 'NM' THEN ' New Mexico'
    WHEN 'NY' THEN ' New York'
    WHEN 'NC' THEN ' North Carolina'
    WHEN 'ND' THEN ' North Dakota'
    WHEN 'OH' THEN ' Ohio'
    WHEN 'OK' THEN ' Oklahoma'
    WHEN 'OR' THEN ' Oregon'
    WHEN 'PA' THEN ' Pennsylvania'
    WHEN 'RI' THEN ' Rhode Island'
    WHEN 'SC' THEN ' South Carolina'
    WHEN 'SD' THEN ' South Dakota'
    WHEN 'TN' THEN ' Tennessee'
    WHEN 'TX' THEN ' Texas'
    WHEN 'UT' THEN ' Utah'
    WHEN 'VT' THEN ' Vermont'
    WHEN 'VA' THEN ' Virginia'
    WHEN 'WA' THEN ' Washington'
    WHEN 'WV' THEN ' West Virginia'
    WHEN 'WI' THEN ' Wisconsin'
    WHEN 'WY' THEN ' Wyoming'
    WHEN 'DC' THEN ' District of Columbia'
    WHEN 'AB' THEN ' Alberta'
    WHEN 'BC' THEN ' British Columbia'
    WHEN 'MB' THEN ' Manitoba'
    WHEN 'NB' THEN ' New Brunswick'
    WHEN 'NL' THEN ' Newfoundland and Labrador'
    WHEN 'NS' THEN ' Nova Scotia'
    WHEN 'NT' THEN ' Northwest Territories'
    WHEN 'NU' THEN ' Nunavut'
    WHEN 'ON' THEN ' Ontario'
    WHEN 'PE' THEN ' Prince Edward Island'
    WHEN 'QC' THEN ' Quebec'
    WHEN 'SK' THEN ' Saskatchewan'
    WHEN 'YT' THEN ' Yukon'
    ELSE ''
  END;
$$;

-- -----------------------------------------------------------------------------
-- Detect US state from comparable overview text (e.g. "East Texas" -> TX).
-- Matview `state` prefers this over `feasibility_comparables.state` when the overview
-- names a state (fixes wrong spreadsheet cells like CO vs Texas in the description).
-- Longest multi-word names first (West Virginia before Virginia).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.us_state_abbrev_from_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_text IS NULL OR btrim(p_text) = '' THEN NULL
    WHEN lower(p_text) ~ E'(^|[^a-z])north\s+carolina([^a-z]|$)' THEN 'NC'
    WHEN lower(p_text) ~ E'(^|[^a-z])south\s+carolina([^a-z]|$)' THEN 'SC'
    WHEN lower(p_text) ~ E'(^|[^a-z])new\s+hampshire([^a-z]|$)' THEN 'NH'
    WHEN lower(p_text) ~ E'(^|[^a-z])west\s+virginia([^a-z]|$)' THEN 'WV'
    WHEN lower(p_text) ~ E'(^|[^a-z])massachusetts([^a-z]|$)' THEN 'MA'
    WHEN lower(p_text) ~ E'(^|[^a-z])north\s+dakota([^a-z]|$)' THEN 'ND'
    WHEN lower(p_text) ~ E'(^|[^a-z])rhode\s+island([^a-z]|$)' THEN 'RI'
    WHEN lower(p_text) ~ E'(^|[^a-z])south\s+dakota([^a-z]|$)' THEN 'SD'
    WHEN lower(p_text) ~ E'(^|[^a-z])pennsylvania([^a-z]|$)' THEN 'PA'
    WHEN lower(p_text) ~ E'(^|[^a-z])connecticut([^a-z]|$)' THEN 'CT'
    WHEN lower(p_text) ~ E'(^|[^a-z])mississippi([^a-z]|$)' THEN 'MS'
    WHEN lower(p_text) ~ E'(^|[^a-z])new\s+jersey([^a-z]|$)' THEN 'NJ'
    WHEN lower(p_text) ~ E'(^|[^a-z])new\s+mexico([^a-z]|$)' THEN 'NM'
    WHEN lower(p_text) ~ E'(^|[^a-z])california([^a-z]|$)' THEN 'CA'
    WHEN lower(p_text) ~ E'(^|[^a-z])washington([^a-z]|$)' THEN 'WA'
    WHEN lower(p_text) ~ E'(^|[^a-z])minnesota([^a-z]|$)' THEN 'MN'
    WHEN lower(p_text) ~ E'(^|[^a-z])louisiana([^a-z]|$)' THEN 'LA'
    WHEN lower(p_text) ~ E'(^|[^a-z])tennessee([^a-z]|$)' THEN 'TN'
    WHEN lower(p_text) ~ E'(^|[^a-z])wisconsin([^a-z]|$)' THEN 'WI'
    WHEN lower(p_text) ~ E'(^|[^a-z])new\s+york([^a-z]|$)' THEN 'NY'
    WHEN lower(p_text) ~ E'(^|[^a-z])maryland([^a-z]|$)' THEN 'MD'
    WHEN lower(p_text) ~ E'(^|[^a-z])oklahoma([^a-z]|$)' THEN 'OK'
    WHEN lower(p_text) ~ E'(^|[^a-z])virginia([^a-z]|$)' THEN 'VA'
    WHEN lower(p_text) ~ E'(^|[^a-z])colorado([^a-z]|$)' THEN 'CO'
    WHEN lower(p_text) ~ E'(^|[^a-z])delaware([^a-z]|$)' THEN 'DE'
    WHEN lower(p_text) ~ E'(^|[^a-z])illinois([^a-z]|$)' THEN 'IL'
    WHEN lower(p_text) ~ E'(^|[^a-z])kentucky([^a-z]|$)' THEN 'KY'
    WHEN lower(p_text) ~ E'(^|[^a-z])michigan([^a-z]|$)' THEN 'MI'
    WHEN lower(p_text) ~ E'(^|[^a-z])missouri([^a-z]|$)' THEN 'MO'
    WHEN lower(p_text) ~ E'(^|[^a-z])nebraska([^a-z]|$)' THEN 'NE'
    WHEN lower(p_text) ~ E'(^|[^a-z])arkansas([^a-z]|$)' THEN 'AR'
    WHEN lower(p_text) ~ E'(^|[^a-z])vermont([^a-z]|$)' THEN 'VT'
    WHEN lower(p_text) ~ E'(^|[^a-z])arizona([^a-z]|$)' THEN 'AZ'
    WHEN lower(p_text) ~ E'(^|[^a-z])florida([^a-z]|$)' THEN 'FL'
    WHEN lower(p_text) ~ E'(^|[^a-z])georgia([^a-z]|$)' THEN 'GA'
    WHEN lower(p_text) ~ E'(^|[^a-z])indiana([^a-z]|$)' THEN 'IN'
    WHEN lower(p_text) ~ E'(^|[^a-z])montana([^a-z]|$)' THEN 'MT'
    WHEN lower(p_text) ~ E'(^|[^a-z])alabama([^a-z]|$)' THEN 'AL'
    WHEN lower(p_text) ~ E'(^|[^a-z])wyoming([^a-z]|$)' THEN 'WY'
    WHEN lower(p_text) ~ E'(^|[^a-z])hawaii([^a-z]|$)' THEN 'HI'
    WHEN lower(p_text) ~ E'(^|[^a-z])kansas([^a-z]|$)' THEN 'KS'
    WHEN lower(p_text) ~ E'(^|[^a-z])nevada([^a-z]|$)' THEN 'NV'
    WHEN lower(p_text) ~ E'(^|[^a-z])oregon([^a-z]|$)' THEN 'OR'
    WHEN lower(p_text) ~ E'(^|[^a-z])alaska([^a-z]|$)' THEN 'AK'
    WHEN lower(p_text) ~ E'(^|[^a-z])idaho([^a-z]|$)' THEN 'ID'
    WHEN lower(p_text) ~ E'(^|[^a-z])maine([^a-z]|$)' THEN 'ME'
    WHEN lower(p_text) ~ E'(^|[^a-z])texas([^a-z]|$)' THEN 'TX'
    WHEN lower(p_text) ~ E'(^|[^a-z])iowa([^a-z]|$)' THEN 'IA'
    WHEN lower(p_text) ~ E'(^|[^a-z])ohio([^a-z]|$)' THEN 'OH'
    WHEN lower(p_text) ~ E'(^|[^a-z])utah([^a-z]|$)' THEN 'UT'
    ELSE NULL
  END;
$$;

-- Sage `all_glamping_properties` is unit-centric: the accommodation label often
-- lives in site_name while unit_type is generic or empty. Admin comps filters
-- apply ILIKE on unified_comps.unit_type only, so we merge unit_type +
-- site_name + property_type for Sage rows (Past Reports already carry rich
-- unit strings from feasibility_comp_units).
CREATE OR REPLACE FUNCTION public.sage_unified_unit_text(
  p_unit_type text,
  p_site_name text,
  p_property_type text
) RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(
    trim(
      concat_ws(
        ' ',
        NULLIF(trim(p_unit_type), ''),
        NULLIF(trim(p_site_name), ''),
        NULLIF(trim(p_property_type), '')
      )
    ),
    ''
  );
$$;

-- Stable key for deduping “properties” vs site/unit rows: prefer ~5dp geohash from
-- lat/lon when valid; else normalized street + locality; else name + locality fallback.
CREATE OR REPLACE FUNCTION public.unified_address_key(
  p_street text,
  p_city text,
  p_state text,
  p_country text,
  p_lat numeric,
  p_lon numeric,
  p_property_name text
) RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    CASE
      WHEN p_lat IS NOT NULL AND p_lon IS NOT NULL
        AND p_lat::double precision BETWEEN -90 AND 90
        AND p_lon::double precision BETWEEN -180 AND 180
      THEN md5(
        'geo:' || round(p_lat::numeric, 5)::text || ':' || round(p_lon::numeric, 5)::text
      )
      WHEN NULLIF(trim(coalesce(p_street, '')), '') IS NOT NULL THEN
        md5(
          'street:' ||
          lower(
            regexp_replace(
              trim(
                concat_ws(
                  ' ',
                  nullif(trim(p_street), ''),
                  nullif(trim(coalesce(p_city, '')), ''),
                  nullif(trim(coalesce(p_state, '')), ''),
                  nullif(trim(coalesce(p_country, '')), '')
                )
              ),
              '\s+',
              ' ',
              'g'
            )
          )
        )
      ELSE
        md5(
          'fb:' ||
          lower(
            regexp_replace(
              trim(
                concat_ws(
                  ' ',
                  nullif(trim(coalesce(p_property_name, '')), ''),
                  nullif(trim(coalesce(p_city, '')), ''),
                  nullif(trim(coalesce(p_state, '')), ''),
                  nullif(trim(coalesce(p_country, '')), '')
                )
              ),
              '\s+',
              ' ',
              'g'
            )
          )
        )
    END,
    md5('unknown')
  );
$$;

-- -----------------------------------------------------------------------------
-- Drop existing view (indexes/cron will be re-created below)
-- -----------------------------------------------------------------------------
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
    NULLIF(g.rate_winter_weekday, 0),
    NULLIF(g.rate_winter_weekend, 0),
    NULLIF(g.rate_spring_weekday, 0),
    NULLIF(g.rate_spring_weekend, 0),
    NULLIF(g.rate_fall_weekday, 0),
    NULLIF(g.rate_fall_weekend, 0),
    NULLIF(g.rate_summer_weekday, 0),
    NULLIF(g.rate_summer_weekend, 0)
  )                                                                   AS low_adr,
  GREATEST(
    NULLIF(g.rate_winter_weekday, 0),
    NULLIF(g.rate_winter_weekend, 0),
    NULLIF(g.rate_spring_weekday, 0),
    NULLIF(g.rate_spring_weekend, 0),
    NULLIF(g.rate_fall_weekday, 0),
    NULLIF(g.rate_fall_weekend, 0),
    NULLIF(g.rate_summer_weekday, 0),
    NULLIF(g.rate_summer_weekend, 0)
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
  AND COALESCE(g.is_closed, 'No') <> 'Yes'

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

-- -----------------------------------------------------------------------------
-- Refresh helpers callable from Supabase-js (.rpc(...)):
--   - used by the Vercel cron fallback at /api/cron/refresh-unified-comps
--   - `_concurrently` is the fast path; the plain version is the fallback
--     for the very first refresh after a rebuild when the matview is empty.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_unified_comps_concurrently()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.unified_comps;
$fn$;

CREATE OR REPLACE FUNCTION public.refresh_unified_comps()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  REFRESH MATERIALIZED VIEW public.unified_comps;
$fn$;

GRANT EXECUTE ON FUNCTION public.refresh_unified_comps_concurrently() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_unified_comps() TO service_role;

-- -----------------------------------------------------------------------------
-- pg_cron nightly refresh (concurrent; read traffic is never blocked).
-- Uses DO block so the migration still succeeds when pg_cron isn't available —
-- in that case the Vercel cron fallback at /api/admin/comps/unified/refresh
-- takes over.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('refresh-unified-comps')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'refresh-unified-comps'
      );

    PERFORM cron.schedule(
      'refresh-unified-comps',
      '0 9 * * *',  -- daily at 09:00 UTC (≈ 02:00 PT / 04:00 CT)
      $cron$REFRESH MATERIALIZED VIEW CONCURRENTLY public.unified_comps$cron$
    );
  END IF;
END $$;

COMMIT;
