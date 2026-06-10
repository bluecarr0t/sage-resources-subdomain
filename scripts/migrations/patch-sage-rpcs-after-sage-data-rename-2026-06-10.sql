-- Patch Postgres RPCs / functions after all_sage_data rename
-- Safe to re-run (CREATE OR REPLACE).

-- >>> from sage-ai-property-geocode.sql
-- ============================================================================
-- Sage AI: property_geocode cache + nearest_attractions/properties_within_radius RPCs
--
-- Adds a PostGIS-backed geocode cache for all_sage_data, plus two
-- RPCs the chat tools call:
--   * properties_within_radius(lat, lng, radius_km, limit_rows)
--   * nearest_attractions_v1(origin, radius_km, types, lim)
--
-- ski_resorts.lat/lon and national-parks.latitude/longitude are TEXT columns
-- (populated by scrapers with mixed formats). We DO NOT alter those tables —
-- the RPC inline-casts with a regex guard so malformed rows are skipped
-- instead of failing the migration.
--
-- Apply with:
--   psql $DATABASE_URL -f scripts/migrations/sage-ai-property-geocode.sql
-- or via the Supabase SQL editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------------------
-- property_geocode: one row per all_sage_data row we've resolved.
-- The generated `geom` column lets PostGIS use the GIST index for fast
-- radius queries without the tool having to touch ST_* in application code.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_geocode (
  property_id       BIGINT PRIMARY KEY
    REFERENCES all_sage_data(id) ON DELETE CASCADE,
  latitude          NUMERIC(9, 6) NOT NULL,
  longitude         NUMERIC(9, 6) NOT NULL,
  geom              GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS
                      (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
  source            TEXT NOT NULL
    CHECK (source IN ('db', 'google_places', 'google_geocoding', 'manual')),
  confidence        SMALLINT CHECK (confidence BETWEEN 0 AND 100),
  place_id          TEXT,
  formatted_address TEXT,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  stale_after       TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '180 days')
);

CREATE INDEX IF NOT EXISTS idx_property_geocode_geom
  ON property_geocode USING GIST (geom);

ALTER TABLE property_geocode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geocode readable to authed" ON property_geocode;
CREATE POLICY "geocode readable to authed"
  ON property_geocode FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies: writes go through the service role
-- (chat route with service key) or a future admin endpoint.

COMMENT ON TABLE property_geocode IS
  'Cached geocoded lat/lng for all_sage_data. Populated by the geocode_property tool on-demand and by scripts/backfill-property-geocode.ts.';

-- ----------------------------------------------------------------------------
-- nearest_attractions_v1
--   Returns the closest rows from any combination of property_geocode,
--   ski_resorts, national-parks within radius_km of origin.
--   `types` is an array of 'property' | 'ski_resort' | 'national_park'.
--
-- Note the inline regex on ski_resorts.lat/lon and national-parks.latitude/longitude:
-- those columns are TEXT (scrapers' fault). The regex guards the cast so rows
-- with garbage coordinates are silently skipped — preferred over failing the
-- whole RPC.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.nearest_attractions_v1(double precision, double precision, integer, text[], integer);

CREATE FUNCTION public.nearest_attractions_v1(
  origin_lat double precision,
  origin_lng double precision,
  radius_km  integer,
  types      text[] DEFAULT ARRAY['property', 'ski_resort', 'national_park']::text[],
  lim        integer DEFAULT 10
)
RETURNS TABLE (
  type        text,
  id          text,
  name        text,
  distance_km numeric,
  latitude    numeric,
  longitude   numeric,
  url         text,
  state       text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  capped_lim integer := LEAST(GREATEST(lim, 1), 50);
  radius_m   double precision := LEAST(GREATEST(radius_km, 1), 500) * 1000.0;
  origin     geography := ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography;
BEGIN
  RETURN QUERY
  WITH property_rows AS (
    SELECT
      'property'::text                                           AS type,
      p.id::text                                                  AS id,
      COALESCE(ap.property_name, 'Unknown')                       AS name,
      (ST_Distance(p.geom, origin) / 1000.0)::numeric(10, 2)      AS distance_km,
      p.latitude                                                  AS latitude,
      p.longitude                                                 AS longitude,
      ap.url                                                      AS url,
      ap.state                                                    AS state
    FROM property_geocode p
    JOIN all_sage_data ap ON ap.id = p.property_id
    WHERE 'property' = ANY(types)
      AND ST_DWithin(p.geom, origin, radius_m)
  ),
  ski_rows AS (
    SELECT
      'ski_resort'::text                                          AS type,
      sr.id::text                                                 AS id,
      sr.name                                                     AS name,
      (ST_Distance(
        ST_SetSRID(ST_MakePoint(sr.lon::double precision, sr.lat::double precision), 4326)::geography,
        origin
      ) / 1000.0)::numeric(10, 2)                                 AS distance_km,
      sr.lat::numeric                                             AS latitude,
      sr.lon::numeric                                             AS longitude,
      sr.website_url                                              AS url,
      sr.state_province                                           AS state
    FROM ski_resorts sr
    WHERE 'ski_resort' = ANY(types)
      AND sr.lat ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND sr.lon ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(sr.lon::double precision, sr.lat::double precision), 4326)::geography,
        origin,
        radius_m
      )
  ),
  park_rows AS (
    SELECT
      'national_park'::text                                       AS type,
      np.id::text                                                 AS id,
      np.name                                                     AS name,
      (ST_Distance(
        ST_SetSRID(ST_MakePoint(np.longitude::double precision, np.latitude::double precision), 4326)::geography,
        origin
      ) / 1000.0)::numeric(10, 2)                                 AS distance_km,
      np.latitude::numeric                                        AS latitude,
      np.longitude::numeric                                       AS longitude,
      np.url                                                      AS url,
      np.state                                                    AS state
    FROM "national-parks" np
    WHERE 'national_park' = ANY(types)
      AND np.latitude::text  ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND np.longitude::text ~ '^-?[0-9]+(\.[0-9]+)?$'
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(np.longitude::double precision, np.latitude::double precision), 4326)::geography,
        origin,
        radius_m
      )
  )
  SELECT * FROM property_rows
  UNION ALL
  SELECT * FROM ski_rows
  UNION ALL
  SELECT * FROM park_rows
  ORDER BY distance_km ASC
  LIMIT capped_lim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.nearest_attractions_v1(double precision, double precision, integer, text[], integer) TO authenticated;

-- ----------------------------------------------------------------------------
-- properties_within_radius
--   Returns properties (joined with property_geocode) whose cached geom is
--   within radius_km of (lat, lng). Wraps the logic used by query_properties'
--   optional `near` filter.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.properties_within_radius(double precision, double precision, integer, integer);

CREATE FUNCTION public.properties_within_radius(
  lat        double precision,
  lng        double precision,
  radius_km  integer,
  limit_rows integer DEFAULT 50
)
RETURNS TABLE (
  id                          bigint,
  property_name               text,
  city                        text,
  state                       text,
  country                     text,
  unit_type                   text,
  property_type               text,
  url                         text,
  property_total_sites        numeric,
  quantity_of_units           numeric,
  rate_avg_retail_daily_rate  numeric,
  research_status             text,
  latitude                    numeric,
  longitude                   numeric,
  distance_km                 numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  capped_lim integer := LEAST(GREATEST(limit_rows, 1), 500);
  radius_m   double precision := LEAST(GREATEST(radius_km, 1), 500) * 1000.0;
  origin     geography := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
BEGIN
  RETURN QUERY
  SELECT
    ap.id,
    ap.property_name,
    ap.city,
    ap.state,
    ap.country,
    ap.unit_type,
    ap.property_type,
    ap.url,
    ap.property_total_sites,
    ap.quantity_of_units,
    ap.rate_avg_retail_daily_rate,
    ap.research_status,
    pg.latitude,
    pg.longitude,
    (ST_Distance(pg.geom, origin) / 1000.0)::numeric(10, 2) AS distance_km
  FROM property_geocode pg
  JOIN all_sage_data ap ON ap.id = pg.property_id
  WHERE ST_DWithin(pg.geom, origin, radius_m)
  ORDER BY distance_km ASC
  LIMIT capped_lim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.properties_within_radius(double precision, double precision, integer, integer) TO authenticated;

-- >>> from sage-ai-property-embeddings.sql
-- ============================================================================
-- Sage AI: property_embeddings + semantic_search_properties_v1 RPC
--
-- Vector embeddings of all_sage_data.{property_name, description,
-- amenities, unit_type, property_type} for similarity search via pgvector.
-- Uses OpenAI text-embedding-3-small (1536 dims) to match the existing
-- report_embeddings convention.
--
-- Apply with:
--   psql $DATABASE_URL -f scripts/migrations/sage-ai-property-embeddings.sql
-- or via the Supabase SQL editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS property_embeddings (
  property_id   BIGINT PRIMARY KEY
    REFERENCES all_sage_data(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  content_hash  TEXT NOT NULL,
  source_fields TEXT[] NOT NULL
    DEFAULT ARRAY['property_name','description','amenities','unit_type','property_type']::text[],
  model         TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding     VECTOR(1536) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ivfflat cosine index. lists=100 is a reasonable default for <1M rows;
-- revisit once we have >500k properties. HNSW is also an option but ivfflat
-- has the smallest write amplification for a backfill pipeline that runs
-- nightly.
CREATE INDEX IF NOT EXISTS idx_property_embeddings_vector
  ON property_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_property_embeddings_content_hash
  ON property_embeddings (content_hash);

ALTER TABLE property_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "embeddings readable to authed" ON property_embeddings;
CREATE POLICY "embeddings readable to authed"
  ON property_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE property_embeddings IS
  'Vector embeddings of all_sage_data text content. Populated by scripts/embed-glamping-properties.ts. Used by the semantic_search_properties tool.';

-- ----------------------------------------------------------------------------
-- semantic_search_properties_v1
--   Returns the top-N properties by cosine similarity to query_embedding,
--   optionally filtered by state/country/unit_type.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.semantic_search_properties_v1(vector, integer, text, text, text, real);

CREATE FUNCTION public.semantic_search_properties_v1(
  query_embedding vector(1536),
  match_count     integer DEFAULT 10,
  filter_state    text    DEFAULT NULL,
  filter_country  text    DEFAULT NULL,
  filter_unit_type text   DEFAULT NULL,
  min_similarity  real    DEFAULT 0.0
)
RETURNS TABLE (
  id                          bigint,
  property_name               text,
  city                        text,
  state                       text,
  country                     text,
  unit_type                   text,
  property_type               text,
  url                         text,
  description                 text,
  similarity                  real
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  capped integer := LEAST(GREATEST(match_count, 1), 50);
BEGIN
  RETURN QUERY
  SELECT
    ap.id,
    ap.property_name,
    ap.city,
    ap.state,
    ap.country,
    ap.unit_type,
    ap.property_type,
    ap.url,
    ap.description,
    (1 - (pe.embedding <=> query_embedding))::real AS similarity
  FROM property_embeddings pe
  JOIN all_sage_data ap ON ap.id = pe.property_id
  WHERE (filter_state     IS NULL OR ap.state   ILIKE filter_state)
    AND (filter_country   IS NULL OR ap.country ILIKE '%' || filter_country || '%')
    AND (filter_unit_type IS NULL OR ap.unit_type ILIKE '%' || filter_unit_type || '%')
    AND (1 - (pe.embedding <=> query_embedding)) >= min_similarity
  ORDER BY pe.embedding <=> query_embedding ASC
  LIMIT capped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.semantic_search_properties_v1(vector, integer, text, text, text, real) TO authenticated;

-- >>> from sage-ai-extend-glamping-allowlist-rpc.sql
-- ============================================================================
-- Sage AI: extend aggregate_properties_v2 / distinct_column_values allowlists
-- to full glamping property feature columns (unit_*, property_*, activities_*,
-- setting_*, rv_*, etc.). Safe to re-run: drops and recreates the functions.
--
-- Apply in Supabase SQL editor (or: psql $DATABASE_URL -f this file).
-- Regenerate: npx tsx scripts/emit-sage-ai-glamping-rpc-extension.ts
-- ============================================================================

-- Dedupe key aligned with count_unique_properties / Sage AI tools (address, else name|city|state|country)
CREATE OR REPLACE FUNCTION public.sage_property_dedupe_key_for_aggregation(
  p_address        text,
  p_property_name  text,
  p_city          text,
  p_state         text,
  p_country       text
) RETURNS text
LANGUAGE SQL
STABLE
AS $$
  SELECT
    CASE
      WHEN NULLIF(btrim(COALESCE(p_address, '')), '') IS NOT NULL
      THEN lower(btrim(COALESCE(p_address, '')))
      ELSE
        lower(btrim(COALESCE(p_property_name, '')))
        || '|' || lower(btrim(COALESCE(p_city, '')))
        || '|' || lower(btrim(COALESCE(p_state, '')))
        || '|' || lower(btrim(COALESCE(p_country, '')))
    END
$$;

DROP FUNCTION IF EXISTS public.aggregate_properties_v2(text, jsonb);
DROP FUNCTION IF EXISTS public.distinct_column_values(text, integer);

CREATE FUNCTION public.aggregate_properties_v2(
  group_by text,
  filters  jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  key                 text,
  unique_properties  bigint,
  avg_daily_rate      numeric,
  median_daily_rate   numeric,
  total_units         bigint,
  total_sites         bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed_columns constant text[] := ARRAY[
    'research_status',
    'is_glamping_property',
    'is_open',
    'property_type',
    'land_operator_category',
    'source',
    'discovery_source',
    'city',
    'state',
    'zip_code',
    'country',
    'lat',
    'lon',
    'property_total_sites',
    'quantity_of_units',
    'year_site_opened',
    'operating_season_months',
    'number_of_locations',
    'unit_type',
    'unit_capacity',
    'unit_sq_ft',
    'unit_bed',
    'unit_shower',
    'unit_water',
    'unit_electricity',
    'unit_picnic_table',
    'unit_wifi',
    'unit_pets',
    'unit_private_bathroom',
    'unit_full_kitchen',
    'unit_kitchenette',
    'unit_ada_accessibility',
    'unit_patio',
    'unit_air_conditioning',
    'unit_gas_fireplace',
    'unit_hot_tub_or_sauna',
    'unit_hot_tub',
    'unit_sauna',
    'unit_cable',
    'unit_campfires',
    'unit_charcoal_grill',
    'unit_mini_fridge',
    'unit_bathtub',
    'unit_wood_burning_stove',
    'rate_avg_retail_daily_rate',
    'rate_winter_weekday',
    'rate_winter_weekend',
    'rate_spring_weekday',
    'rate_spring_weekend',
    'rate_summer_weekday',
    'rate_summer_weekend',
    'rate_fall_weekday',
    'rate_fall_weekend',
    'rate_category',
    'property_laundry',
    'property_playground',
    'property_pool',
    'property_food_on_site',
    'property_sauna',
    'property_hot_tub',
    'property_restaurant',
    'property_dog_park',
    'property_clubhouse',
    'property_alcohol_available',
    'property_golf_cart_rental',
    'property_waterpark',
    'property_general_store',
    'property_waterfront',
    'property_extended_stay',
    'property_family_friendly',
    'property_remote_work_friendly',
    'property_fitness_room',
    'property_propane_refilling_station',
    'property_pickball_courts',
    'property_age_restricted_55_plus',
    'property_has_rentals',
    'property_lgbtiq_friendly',
    'property_gasoline_nearby',
    'property_basketball',
    'property_volleyball',
    'property_jet_skiing',
    'property_mobile_home_community',
    'property_tennis',
    'minimum_nights',
    'rv_vehicle_length',
    'rv_parking',
    'rv_accommodates_slideout',
    'rv_surface_type',
    'rv_surface_level',
    'rv_vehicles_fifth_wheels',
    'rv_vehicles_class_a_rvs',
    'rv_vehicles_class_b_rvs',
    'rv_vehicles_class_c_rvs',
    'rv_vehicles_toy_hauler',
    'rv_sewer_hook_up',
    'rv_electrical_hook_up',
    'rv_generators_allowed',
    'rv_water_hookup',
    'activities_fishing',
    'activities_surfing',
    'activities_horseback_riding',
    'activities_paddling',
    'activities_climbing',
    'activities_off_roading_ohv',
    'activities_boating',
    'activities_swimming',
    'activities_wind_sports',
    'activities_snow_sports',
    'activities_whitewater_paddling',
    'activities_fall_fun',
    'activities_hiking',
    'activities_wildlife_watching',
    'activities_biking',
    'activities_canoeing_kayaking',
    'activities_hunting',
    'activities_golf',
    'activities_backpacking',
    'activities_historic_sightseeing',
    'activities_scenic_drives',
    'activities_stargazing',
    'setting_ranch',
    'setting_beach',
    'setting_coastal',
    'setting_suburban',
    'setting_forest',
    'setting_field',
    'setting_wetlands',
    'setting_hot_spring',
    'setting_desert',
    'setting_canyon',
    'setting_waterfall',
    'setting_swimming_hole',
    'setting_lake',
    'setting_cave',
    'setting_redwoods',
    'setting_farm',
    'river_stream_or_creek',
    'setting_mountainous',
    'quality_score',
    'roverpass_occupancy_rate',
    'roverpass_occupancy_year'
  ];
  v_state                 text := filters->>'state';
  v_country               text := filters->>'country';
  v_unit_type             text := filters->>'unit_type';
  v_is_glamping_property  text := filters->>'is_glamping_property';
  v_is_open               text := filters->>'is_open';
  v_city                  text := filters->>'city';
  v_property_type         text := filters->>'property_type';
  v_source                text := filters->>'source';
  v_discovery_source      text := filters->>'discovery_source';
  v_research_status       text := filters->>'research_status';
  sql_text                text;
BEGIN
  IF NOT (group_by = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'group_by % is not in the allowlist', group_by
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  sql_text :=
    'WITH s AS ( '
      'SELECT '
        'COALESCE(' || quote_ident(group_by) || '::text, ''Unknown'') AS gk, '
        'GREATEST(COALESCE(quantity_of_units, 1), 1)::numeric AS wgt, '
        'quantity_of_units, '
        'property_total_sites, '
        'public.sage_property_dedupe_key_for_aggregation('
        'address::text, property_name, city, state, country) AS property_key, '
        'COALESCE( (SELECT ROUND(AVG(v::numeric), 2) FROM unnest(ARRAY['
        'rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, '
        'rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend'
        ']) AS t(v) WHERE v IS NOT NULL AND v::numeric > 0), '
        'NULLIF(rate_avg_retail_daily_rate, 0)::numeric) AS eff_adr '
      'FROM all_sage_data WHERE '
        '($1::text IS NULL OR state ILIKE $1) '
        'AND ($2::text IS NULL OR country ILIKE ''%'' || $2 || ''%'') '
        'AND ($3::text IS NULL OR unit_type ILIKE ''%'' || $3 || ''%'') '
        'AND ($4::text IS NULL OR is_glamping_property = $4) '
        'AND ($5::text IS NULL OR is_open = $5) '
        'AND ($6::text IS NULL OR city ILIKE $6) '
        'AND ($7::text IS NULL OR property_type ILIKE ''%'' || $7 || ''%'') '
        'AND ($8::text IS NULL OR source = $8) '
        'AND ($9::text IS NULL OR discovery_source = $9) '
        'AND ($10::text IS NULL OR LOWER(research_status) = LOWER($10)) '
    '), '
    'grp AS ( '
      'SELECT gk, COUNT(DISTINCT property_key)::bigint AS unique_property_count, '
        'COALESCE(SUM(quantity_of_units), 0)::bigint AS total_units, '
        'COALESCE(SUM(property_total_sites), 0)::bigint AS total_sites '
      'FROM s GROUP BY gk '
    '), '
    'rated AS ( SELECT gk, eff_adr, wgt FROM s WHERE eff_adr IS NOT NULL AND eff_adr::numeric > 0 ), '
    'qstats AS ( '
      'SELECT gk, COUNT(*)::bigint AS n, '
        'PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY eff_adr) AS q1, '
        'PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY eff_adr) AS q3 '
      'FROM rated GROUP BY gk '
    '), '
    'rf AS ( '
      'SELECT r.gk, r.eff_adr, r.wgt, q.n, q.q1, q.q3, '
        'CASE '
          'WHEN q.n < 4 THEN true '
          'WHEN (q.q3 - q.q1) = 0 OR (q.q3 - q.q1) IS NULL THEN true '
          'WHEN r.eff_adr >= q.q1 - 1.5 * (q.q3 - q.q1) AND r.eff_adr <= q.q3 + 1.5 * (q.q3 - q.q1) THEN true '
          'ELSE false '
        'END AS use_row '
      'FROM rated r INNER JOIN qstats q ON r.gk = q.gk '
    '), '
    'u AS ( '
      'SELECT rf.gk, rf.eff_adr, rf.wgt, '
        'CASE '
          'WHEN SUM(CASE WHEN rf.use_row THEN rf.wgt END) OVER (PARTITION BY rf.gk) > 0 '
            'THEN rf.use_row '
          'ELSE true '
        'END AS use_final '
      'FROM rf '
    '), '
    'uk AS ( SELECT gk, eff_adr, wgt FROM u WHERE use_final AND eff_adr IS NOT NULL ), '
    'ag_avg AS ( '
      'SELECT gk, '
        'ROUND( (SUM(eff_adr * wgt) / NULLIF(SUM(wgt), 0))::numeric, 2) AS avg_daily_rate '
      'FROM uk GROUP BY gk '
    '), '
    'ag_med AS ( '
      'SELECT gk, '
        'ROUND( (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY eff_adr))::numeric, 2) AS median_daily_rate '
      'FROM uk GROUP BY gk '
    ') '
    'SELECT g.gk AS key, g.unique_property_count AS unique_properties, a.avg_daily_rate, m.median_daily_rate, '
    'g.total_units, g.total_sites '
    'FROM grp g '
    'LEFT JOIN ag_avg a ON a.gk = g.gk '
    'LEFT JOIN ag_med m ON m.gk = g.gk '
    'ORDER BY 2 DESC '
    'LIMIT 500';

  RETURN QUERY EXECUTE sql_text
    USING v_state, v_country, v_unit_type, v_is_glamping_property, v_is_open,
          v_city, v_property_type, v_source, v_discovery_source, v_research_status;
END;
$$;

CREATE FUNCTION public.distinct_column_values(
  col      text,
  max_rows integer DEFAULT 50
)
RETURNS TABLE (
  value     text,
  row_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed_columns constant text[] := ARRAY[
    'research_status',
    'is_glamping_property',
    'is_open',
    'property_name',
    'site_name',
    'slug',
    'property_type',
    'land_operator_category',
    'source',
    'discovery_source',
    'date_added',
    'date_updated',
    'address',
    'city',
    'state',
    'zip_code',
    'country',
    'lat',
    'lon',
    'property_total_sites',
    'quantity_of_units',
    'year_site_opened',
    'operating_season_months',
    'number_of_locations',
    'unit_type',
    'unit_capacity',
    'unit_sq_ft',
    'unit_bed',
    'unit_shower',
    'unit_water',
    'unit_electricity',
    'unit_picnic_table',
    'unit_wifi',
    'unit_pets',
    'unit_private_bathroom',
    'unit_full_kitchen',
    'unit_kitchenette',
    'unit_ada_accessibility',
    'unit_patio',
    'unit_air_conditioning',
    'unit_gas_fireplace',
    'unit_hot_tub_or_sauna',
    'unit_hot_tub',
    'unit_sauna',
    'unit_cable',
    'unit_campfires',
    'unit_charcoal_grill',
    'unit_mini_fridge',
    'unit_bathtub',
    'unit_wood_burning_stove',
    'rate_avg_retail_daily_rate',
    'rate_winter_weekday',
    'rate_winter_weekend',
    'rate_spring_weekday',
    'rate_spring_weekend',
    'rate_summer_weekday',
    'rate_summer_weekend',
    'rate_fall_weekday',
    'rate_fall_weekend',
    'rate_category',
    'property_laundry',
    'property_playground',
    'property_pool',
    'property_food_on_site',
    'property_sauna',
    'property_hot_tub',
    'property_restaurant',
    'property_dog_park',
    'property_clubhouse',
    'property_alcohol_available',
    'property_golf_cart_rental',
    'property_waterpark',
    'property_general_store',
    'property_waterfront',
    'property_extended_stay',
    'property_family_friendly',
    'property_remote_work_friendly',
    'property_fitness_room',
    'property_propane_refilling_station',
    'property_pickball_courts',
    'property_age_restricted_55_plus',
    'property_has_rentals',
    'property_lgbtiq_friendly',
    'property_gasoline_nearby',
    'property_basketball',
    'property_volleyball',
    'property_jet_skiing',
    'property_mobile_home_community',
    'property_tennis',
    'url',
    'phone_number',
    'minimum_nights',
    'rv_vehicle_length',
    'rv_parking',
    'rv_accommodates_slideout',
    'rv_surface_type',
    'rv_surface_level',
    'rv_vehicles_fifth_wheels',
    'rv_vehicles_class_a_rvs',
    'rv_vehicles_class_b_rvs',
    'rv_vehicles_class_c_rvs',
    'rv_vehicles_toy_hauler',
    'rv_sewer_hook_up',
    'rv_electrical_hook_up',
    'rv_generators_allowed',
    'rv_water_hookup',
    'activities_fishing',
    'activities_surfing',
    'activities_horseback_riding',
    'activities_paddling',
    'activities_climbing',
    'activities_off_roading_ohv',
    'activities_boating',
    'activities_swimming',
    'activities_wind_sports',
    'activities_snow_sports',
    'activities_whitewater_paddling',
    'activities_fall_fun',
    'activities_hiking',
    'activities_wildlife_watching',
    'activities_biking',
    'activities_canoeing_kayaking',
    'activities_hunting',
    'activities_golf',
    'activities_backpacking',
    'activities_historic_sightseeing',
    'activities_scenic_drives',
    'activities_stargazing',
    'setting_ranch',
    'setting_beach',
    'setting_coastal',
    'setting_suburban',
    'setting_forest',
    'setting_field',
    'setting_wetlands',
    'setting_hot_spring',
    'setting_desert',
    'setting_canyon',
    'setting_waterfall',
    'setting_swimming_hole',
    'setting_lake',
    'setting_cave',
    'setting_redwoods',
    'setting_farm',
    'river_stream_or_creek',
    'setting_mountainous',
    'quality_score',
    'created_at',
    'updated_at',
    'roverpass_campground_id',
    'roverpass_occupancy_rate',
    'roverpass_occupancy_year'
  ];
  sql_text text;
  capped   integer := LEAST(GREATEST(max_rows, 1), 500);
BEGIN
  IF NOT (col = ANY(allowed_columns)) THEN
    RAISE EXCEPTION 'column % is not in the allowlist', col
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  sql_text := format($f$
    SELECT
      %1$I::text        AS value,
      COUNT(*)::bigint  AS row_count
    FROM all_sage_data
    WHERE %1$I IS NOT NULL
    GROUP BY %1$I
    ORDER BY row_count DESC, value ASC
    LIMIT $1
  $f$, col);

  RETURN QUERY EXECUTE sql_text USING capped;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aggregate_properties_v2(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.distinct_column_values(text, integer) TO authenticated;

-- >>> from sage-ai-top-multi-location-chains-rpc.sql
-- ============================================================================
-- Sage AI: top_multi_location_chains — ranked multi-location glamping operators
--
-- Chain label (`sage_chain_label_from_property_name`):
--   1) Longest-match **known brand prefix** (lowercased), so e.g. rows named
--      "Postcard Cabins Big Bear" and "Under Canvas Yosemite" roll up to
--      "postcard cabins" / "under canvas" instead of one group per outpost.
--   2) Else text before spaced em dash / en dash / hyphen (e.g. "Brand — X").
--   3) Else full trimmed name (lowercased).
-- Keep the prefix array ordered **longer strings before shorter** so
-- e.g. "getaway house" wins over "getaway".
--
-- Dedupes physical locations with sage_property_dedupe_key_for_aggregation.
-- Ranks by MAX(reported number_of_locations) in the group.
--
-- Apply in Supabase SQL editor or: psql $DATABASE_URL -f this file
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sage_chain_label_from_property_name(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  n              text := btrim(COALESCE(p_name, ''));
  ln             text;
  p              text;
  -- Longest prefixes first (multi-word national / regional glamping brands).
  prefixes       text[] := ARRAY[
    'collective retreats',
    'postcard cabins',
    'rvc outdoor destinations',
    'sundance by basecamp',
    'trailer inn lodging',
    -- 'ulum' must precede 'under canvas' so "ULUM Moab" and any future
    -- "ULUM ..." outposts roll up to their own chain rather than to the
    -- Under Canvas core safari-camp brand.
    'ulum',
    'under canvas',
    'wander camp',
    'timberline glamping co.',
    'getaway house',
    'brush creek ranch',
    'long live the simple life',
    'firelight camps',
    'nomadic resort',
    'autocamp',
    'huttopia',
    'getaway',
    'koa holiday',
    'trailer inn',
    'yogi bear''s jellystone park',
    'jellystone park',
    'koa'
  ];
BEGIN
  IF n = '' THEN
    RETURN '';
  END IF;

  ln := lower(n);

  FOREACH p IN ARRAY prefixes
  LOOP
    IF ln = p
      OR ln LIKE p || ' %'
      OR ln LIKE p || '-%'
      OR ln LIKE p || ' -%'
      OR ln LIKE p || ' –%'
      OR ln LIKE p || ' —%'
    THEN
      RETURN p;
    END IF;
  END LOOP;

  IF strpos(n, ' — ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' — ') - 1)));
  END IF;
  IF strpos(n, ' – ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' – ') - 1)));
  END IF;
  IF strpos(n, ' - ') > 0 THEN
    RETURN lower(btrim(split_part(n, ' - ', 1)));
  END IF;

  RETURN lower(n);
END;
$$;

DROP FUNCTION IF EXISTS public.top_multi_location_chains(integer, numeric, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.top_multi_location_chains(
  p_limit                   integer DEFAULT 10,
  p_min_reported_locations  numeric DEFAULT 2,
  p_min_chain_age_years     integer DEFAULT 5,
  p_country                 text DEFAULT NULL,
  p_is_open                 text DEFAULT NULL,
  p_is_glamping_property    text DEFAULT NULL
)
RETURNS TABLE (
  chain_label                  text,
  reported_brand_locations   numeric,
  earliest_site_year           numeric,
  properties_in_sage           bigint,
  total_glamping_units_in_sage bigint,
  sample_property_name         text,
  sample_city                  text,
  sample_state                 text,
  sample_country               text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      g.address,
      g.property_name,
      g.city,
      g.state,
      g.country,
      g.number_of_locations::numeric AS nol,
      g.year_site_opened::numeric    AS yso,
      GREATEST(COALESCE(g.quantity_of_units, 0), 0)::numeric AS qty,
      lower(public.sage_chain_label_from_property_name(g.property_name)) AS chain_key
    FROM all_sage_data g
    WHERE g.number_of_locations IS NOT NULL
      AND g.number_of_locations::numeric >= p_min_reported_locations
      AND (p_country IS NULL OR g.country ILIKE '%' || p_country || '%')
      AND (p_is_open IS NULL OR g.is_open = p_is_open)
      AND (p_is_glamping_property IS NULL OR g.is_glamping_property = p_is_glamping_property)
      AND lower(public.sage_chain_label_from_property_name(g.property_name)) <> ''
  ),
  by_property AS (
    SELECT
      public.sage_property_dedupe_key_for_aggregation(
        f.address::text, f.property_name, f.city, f.state, f.country
      ) AS pk,
      MAX(f.chain_key) AS chain_key,
      MAX(f.nol) AS prop_reported_locations,
      MIN(f.yso) AS prop_earliest_year,
      MAX(f.property_name) AS prop_name_sample,
      MAX(f.city) AS prop_city,
      MAX(f.state) AS prop_state,
      MAX(f.country) AS prop_country,
      SUM(f.qty) AS units_at_property
    FROM filtered f
    GROUP BY 1
  ),
  rolled AS (
    SELECT
      b.chain_key,
      MAX(b.prop_reported_locations) AS reported_brand_locations,
      MIN(b.prop_earliest_year) AS earliest_site_year,
      COUNT(*)::bigint AS properties_in_sage,
      COALESCE(SUM(b.units_at_property), 0)::bigint AS total_glamping_units_in_sage,
      MAX(b.prop_name_sample) AS sample_property_name,
      MAX(b.prop_city) AS sample_city,
      MAX(b.prop_state) AS sample_state,
      MAX(b.prop_country) AS sample_country
    FROM by_property b
    GROUP BY b.chain_key
  )
  SELECT
    CASE r.chain_key
      WHEN 'autocamp' THEN 'AutoCamp'
      WHEN 'koa' THEN 'KOA'
      WHEN 'rvc outdoor destinations' THEN 'RVC Outdoor Destinations'
      ELSE initcap(r.chain_key)
    END AS chain_label,
    r.reported_brand_locations,
    r.earliest_site_year,
    r.properties_in_sage,
    r.total_glamping_units_in_sage,
    r.sample_property_name,
    r.sample_city,
    r.sample_state,
    r.sample_country
  FROM rolled r
  WHERE
    (
      p_min_chain_age_years IS NULL
      OR (
        r.earliest_site_year IS NOT NULL
        AND r.earliest_site_year::integer <= EXTRACT(YEAR FROM CURRENT_DATE)::integer - p_min_chain_age_years
      )
    )
  ORDER BY r.reported_brand_locations DESC NULLS LAST, r.properties_in_sage DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.top_multi_location_chains(integer, numeric, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.top_multi_location_chains(integer, numeric, integer, text, text, text) TO service_role;

-- >>> from unified-comps-sage-property-group-key-2026-05-18.sql
-- Dedupe Sage rows in unified comps list/map by property_id (not per-site geohash).
-- Fixes duplicate list rows when site rows have slightly different lat/lon or addresses.

CREATE OR REPLACE FUNCTION public.unified_comps_property_group_key(
  p_source text,
  p_source_row_id text,
  p_address_key text,
  p_id text
) RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_source = 'all_sage_data' THEN
      p_source || E'\x01' || COALESCE(
        (
          SELECT g.property_id::text
          FROM public.all_sage_data g
          WHERE g.id::text = p_source_row_id
            AND g.property_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.all_sage_data g2
              WHERE g2.property_id = g.property_id
                AND g2.id <> g.id
            )
          LIMIT 1
        ),
        COALESCE(NULLIF(trim(p_address_key), ''), p_id)
      )
    ELSE
      p_source || E'\x01' || COALESCE(NULLIF(trim(p_address_key), ''), p_id)
  END;
$$;

-- Recreate list RPC (extends admin-cohort version with property_group_key grouping).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_list_properties'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_list_properties(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50,
  p_sort_by text DEFAULT 'created_at',
  p_sort_asc boolean DEFAULT false,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (anchor jsonb, site_rows jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_per_page integer := least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_sort text := lower(btrim(coalesce(p_sort_by, 'created_at')));
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_list_properties: pass either p_tsquery or p_ilike_terms, not both';
  END IF;
  IF v_sort NOT IN ('created_at', 'property_name', 'state', 'total_sites', 'quality_score', 'low_adr', 'peak_adr') THEN
    v_sort := 'created_at';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT uc.*
    FROM public.unified_comps uc
    WHERE
      (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND uc.property_type = 'Glamping'
          AND (
            uc.source <> 'all_sage_data'
            OR EXISTS (
              SELECT 1 FROM public.all_sage_data g
              WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ),
  grouped AS (
    SELECT
      public.unified_comps_property_group_key(f.source, f.source_row_id, f.address_key, f.id) AS prop_key,
      (jsonb_agg(to_jsonb(f) ORDER BY
        CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN f.property_name END ASC NULLS LAST,
        CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN f.property_name END DESC NULLS LAST,
        CASE WHEN v_sort = 'state' AND p_sort_asc THEN f.state END ASC NULLS LAST,
        CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN f.state END DESC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN f.total_sites END ASC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN f.total_sites END DESC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN f.quality_score END ASC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN f.quality_score END DESC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN f.low_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN f.low_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN f.peak_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN f.peak_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN f.created_at END ASC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN f.created_at END DESC NULLS LAST,
        f.id ASC
      ))->0 AS anchor,
      jsonb_agg(to_jsonb(f) ORDER BY f.id) AS site_rows
    FROM filtered f
    GROUP BY public.unified_comps_property_group_key(f.source, f.source_row_id, f.address_key, f.id)
  )
  SELECT g.anchor, g.site_rows
  FROM grouped g
  ORDER BY
    CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN g.anchor->>'property_name' END ASC NULLS LAST,
    CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN g.anchor->>'property_name' END DESC NULLS LAST,
    CASE WHEN v_sort = 'state' AND p_sort_asc THEN g.anchor->>'state' END ASC NULLS LAST,
    CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN g.anchor->>'state' END DESC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN (g.anchor->>'total_sites')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN (g.anchor->>'total_sites')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN (g.anchor->>'quality_score')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN (g.anchor->>'quality_score')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN (g.anchor->>'low_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN (g.anchor->>'low_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END ASC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END DESC NULLS LAST,
    g.anchor->>'id' ASC
  LIMIT v_per_page OFFSET v_offset;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_aggregate_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_aggregate_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (row_count bigint, distinct_address_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_aggregate_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(
      DISTINCT public.unified_comps_property_group_key(
        uc.source, uc.source_row_id, uc.address_key, uc.id
      )
    )::bigint
  FROM public.unified_comps uc
  WHERE
    (p_sources IS NULL OR uc.source = ANY (p_sources))
    AND (p_states IS NULL OR uc.state = ANY (p_states))
    AND (p_countries IS NULL OR uc.country = ANY (p_countries))
    AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
    AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
    AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
    AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
    AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
    AND (
      NOT COALESCE(p_apply_admin_cohort, false)
      OR (
        uc.is_glamping_property = 'Yes'
        AND uc.property_type = 'Glamping'
        AND (
          uc.source <> 'all_sage_data'
          OR EXISTS (
            SELECT 1 FROM public.all_sage_data g
            WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
          )
        )
      )
    )
    AND (
      p_unit_categories IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
        WHERE uc.unit_category = c.cat
          OR uc.unit_type ILIKE (
            '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
          ) ESCAPE '\'
      )
    )
    AND (
      (NOT use_fts AND NOT use_ilike)
      OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
      OR (
        use_ilike
        AND NOT EXISTS (
          SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
          WHERE NOT (
            uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
          )
        )
      )
    );
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (source text, marker_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_geo_marker_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT t.source, COUNT(*)::bigint
  FROM (
    SELECT DISTINCT
      uc.source,
      public.unified_comps_property_group_key(uc.source, uc.source_row_id, uc.address_key, uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND uc.property_type = 'Glamping'
          AND (
            uc.source <> 'all_sage_data'
            OR EXISTS (
              SELECT 1 FROM public.all_sage_data g
              WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unified_comps_property_group_key(text, text, text, text) TO authenticated, anon, service_role;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS rp
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'unified_comps_list_properties',
        'unified_comps_aggregate_counts',
        'unified_comps_geo_marker_counts'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', r.rp);
  END LOOP;
END $$;

-- >>> from unified-comps-admin-cohort-filter-2026-05-18.sql
-- /admin/comps cohort: published Sage + is_glamping_property = Yes + property_type = Glamping.
-- Pass p_apply_admin_cohort := true from admin list / aggregate / geo count RPCs.

-- Shared predicate (inline in each function):
--   AND (NOT COALESCE(p_apply_admin_cohort, false) OR (
--     uc.is_glamping_property = 'Yes'
--     AND uc.property_type = 'Glamping'
--     AND (
--       uc.source <> 'all_sage_data'
--       OR EXISTS (
--         SELECT 1 FROM public.all_sage_data g
--         WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
--       )
--     )
--   ))

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_list_properties'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_list_properties(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50,
  p_sort_by text DEFAULT 'created_at',
  p_sort_asc boolean DEFAULT false,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (anchor jsonb, site_rows jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_per_page integer := least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_sort text := lower(btrim(coalesce(p_sort_by, 'created_at')));
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_list_properties: pass either p_tsquery or p_ilike_terms, not both';
  END IF;
  IF v_sort NOT IN ('created_at', 'property_name', 'state', 'total_sites', 'quality_score', 'low_adr', 'peak_adr') THEN
    v_sort := 'created_at';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT uc.*
    FROM public.unified_comps uc
    WHERE
      (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND uc.property_type = 'Glamping'
          AND (
            uc.source <> 'all_sage_data'
            OR EXISTS (
              SELECT 1
              FROM public.all_sage_data g
              WHERE g.id::text = uc.source_row_id
                AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ),
  grouped AS (
    SELECT
      f.source,
      COALESCE(NULLIF(trim(f.address_key), ''), f.id) AS prop_key,
      (jsonb_agg(to_jsonb(f) ORDER BY
        CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN f.property_name END ASC NULLS LAST,
        CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN f.property_name END DESC NULLS LAST,
        CASE WHEN v_sort = 'state' AND p_sort_asc THEN f.state END ASC NULLS LAST,
        CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN f.state END DESC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN f.total_sites END ASC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN f.total_sites END DESC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN f.quality_score END ASC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN f.quality_score END DESC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN f.low_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN f.low_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN f.peak_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN f.peak_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN f.created_at END ASC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN f.created_at END DESC NULLS LAST,
        f.id ASC
      ))->0 AS anchor,
      jsonb_agg(to_jsonb(f) ORDER BY f.id) AS site_rows
    FROM filtered f
    GROUP BY f.source, COALESCE(NULLIF(trim(f.address_key), ''), f.id)
  )
  SELECT g.anchor, g.site_rows
  FROM grouped g
  ORDER BY
    CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN g.anchor->>'property_name' END ASC NULLS LAST,
    CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN g.anchor->>'property_name' END DESC NULLS LAST,
    CASE WHEN v_sort = 'state' AND p_sort_asc THEN g.anchor->>'state' END ASC NULLS LAST,
    CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN g.anchor->>'state' END DESC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN (g.anchor->>'total_sites')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN (g.anchor->>'total_sites')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN (g.anchor->>'quality_score')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN (g.anchor->>'quality_score')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN (g.anchor->>'low_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN (g.anchor->>'low_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END ASC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END DESC NULLS LAST,
    g.anchor->>'id' ASC
  LIMIT v_per_page
  OFFSET v_offset;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_aggregate_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_aggregate_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (row_count bigint, distinct_address_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_aggregate_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT COUNT(*)::bigint, COUNT(DISTINCT uc.address_key)::bigint
  FROM public.unified_comps uc
  WHERE
    (p_sources IS NULL OR uc.source = ANY (p_sources))
    AND (p_states IS NULL OR uc.state = ANY (p_states))
    AND (p_countries IS NULL OR uc.country = ANY (p_countries))
    AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
    AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
    AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
    AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
    AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
    AND (
      NOT COALESCE(p_apply_admin_cohort, false)
      OR (
        uc.is_glamping_property = 'Yes'
        AND uc.property_type = 'Glamping'
        AND (
          uc.source <> 'all_sage_data'
          OR EXISTS (
            SELECT 1 FROM public.all_sage_data g
            WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
          )
        )
      )
    )
    AND (
      p_unit_categories IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
        WHERE uc.unit_category = c.cat
          OR uc.unit_type ILIKE (
            '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
          ) ESCAPE '\'
      )
    )
    AND (
      (NOT use_fts AND NOT use_ilike)
      OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
      OR (
        use_ilike
        AND NOT EXISTS (
          SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
          WHERE NOT (
            uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
          )
        )
      )
    );
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (source text, marker_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_geo_marker_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT t.source, COUNT(*)::bigint
  FROM (
    SELECT DISTINCT uc.source, COALESCE(NULLIF(trim(uc.address_key), ''), '__row:' || uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND uc.property_type = 'Glamping'
          AND (
            uc.source <> 'all_sage_data'
            OR EXISTS (
              SELECT 1 FROM public.all_sage_data g
              WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS rp
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'unified_comps_list_properties',
        'unified_comps_aggregate_counts',
        'unified_comps_geo_marker_counts'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', r.rp);
  END LOOP;
END $$;

-- >>> from unified-comps-admin-cohort-reports-property-type-2026-06-01.sql
-- Admin glamping-properties cohort: Past Reports (source = reports) skip property_type = Glamping.
-- Comparables often have property_type NULL; they remain is_glamping_property = Yes in the matview.
-- Sage rows still require property_type = Glamping + research_status = published when cohort is on.
-- Also exempts reports from p_property_types filter when p_apply_admin_cohort is true (API passes Glamping).


-- Recreate list RPC (extends admin-cohort version with property_group_key grouping).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_list_properties'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_list_properties(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50,
  p_sort_by text DEFAULT 'created_at',
  p_sort_asc boolean DEFAULT false,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (anchor jsonb, site_rows jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_per_page integer := least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_sort text := lower(btrim(coalesce(p_sort_by, 'created_at')));
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_list_properties: pass either p_tsquery or p_ilike_terms, not both';
  END IF;
  IF v_sort NOT IN ('created_at', 'property_name', 'state', 'total_sites', 'quality_score', 'low_adr', 'peak_adr') THEN
    v_sort := 'created_at';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT uc.*
    FROM public.unified_comps uc
    WHERE
      (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types) OR (COALESCE(p_apply_admin_cohort, false) AND uc.source = 'reports'))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND (uc.source = 'reports' OR uc.property_type = 'Glamping')
          AND (
            uc.source <> 'all_sage_data'
            OR EXISTS (
              SELECT 1 FROM public.all_sage_data g
              WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ),
  grouped AS (
    SELECT
      public.unified_comps_property_group_key(f.source, f.source_row_id, f.address_key, f.id) AS prop_key,
      (jsonb_agg(to_jsonb(f) ORDER BY
        CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN f.property_name END ASC NULLS LAST,
        CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN f.property_name END DESC NULLS LAST,
        CASE WHEN v_sort = 'state' AND p_sort_asc THEN f.state END ASC NULLS LAST,
        CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN f.state END DESC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN f.total_sites END ASC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN f.total_sites END DESC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN f.quality_score END ASC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN f.quality_score END DESC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN f.low_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN f.low_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN f.peak_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN f.peak_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN f.created_at END ASC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN f.created_at END DESC NULLS LAST,
        f.id ASC
      ))->0 AS anchor,
      jsonb_agg(to_jsonb(f) ORDER BY f.id) AS site_rows
    FROM filtered f
    GROUP BY public.unified_comps_property_group_key(f.source, f.source_row_id, f.address_key, f.id)
  )
  SELECT g.anchor, g.site_rows
  FROM grouped g
  ORDER BY
    CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN g.anchor->>'property_name' END ASC NULLS LAST,
    CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN g.anchor->>'property_name' END DESC NULLS LAST,
    CASE WHEN v_sort = 'state' AND p_sort_asc THEN g.anchor->>'state' END ASC NULLS LAST,
    CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN g.anchor->>'state' END DESC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN (g.anchor->>'total_sites')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN (g.anchor->>'total_sites')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN (g.anchor->>'quality_score')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN (g.anchor->>'quality_score')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN (g.anchor->>'low_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN (g.anchor->>'low_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END ASC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END DESC NULLS LAST,
    g.anchor->>'id' ASC
  LIMIT v_per_page OFFSET v_offset;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_aggregate_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_aggregate_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (row_count bigint, distinct_address_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_aggregate_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(
      DISTINCT public.unified_comps_property_group_key(
        uc.source, uc.source_row_id, uc.address_key, uc.id
      )
    )::bigint
  FROM public.unified_comps uc
  WHERE
    (p_sources IS NULL OR uc.source = ANY (p_sources))
    AND (p_states IS NULL OR uc.state = ANY (p_states))
    AND (p_countries IS NULL OR uc.country = ANY (p_countries))
    AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
    AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
    AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
    AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types) OR (COALESCE(p_apply_admin_cohort, false) AND uc.source = 'reports'))
    AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
    AND (
      NOT COALESCE(p_apply_admin_cohort, false)
      OR (
        uc.is_glamping_property = 'Yes'
        AND (uc.source = 'reports' OR uc.property_type = 'Glamping')
        AND (
          uc.source <> 'all_sage_data'
          OR EXISTS (
            SELECT 1 FROM public.all_sage_data g
            WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
          )
        )
      )
    )
    AND (
      p_unit_categories IS NULL
      OR EXISTS (
        SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
        WHERE uc.unit_category = c.cat
          OR uc.unit_type ILIKE (
            '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
          ) ESCAPE '\'
      )
    )
    AND (
      (NOT use_fts AND NOT use_ilike)
      OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
      OR (
        use_ilike
        AND NOT EXISTS (
          SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
          WHERE NOT (
            uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
          )
        )
      )
    );
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_apply_admin_cohort boolean DEFAULT false
)
RETURNS TABLE (source text, marker_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_geo_marker_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT t.source, COUNT(*)::bigint
  FROM (
    SELECT DISTINCT
      uc.source,
      public.unified_comps_property_group_key(uc.source, uc.source_row_id, uc.address_key, uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types) OR (COALESCE(p_apply_admin_cohort, false) AND uc.source = 'reports'))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        NOT COALESCE(p_apply_admin_cohort, false)
        OR (
          uc.is_glamping_property = 'Yes'
          AND (uc.source = 'reports' OR uc.property_type = 'Glamping')
          AND (
            uc.source <> 'all_sage_data'
            OR EXISTS (
              SELECT 1 FROM public.all_sage_data g
              WHERE g.id::text = uc.source_row_id AND g.research_status = 'published'
            )
          )
        )
      )
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1 FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.city ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
              OR uc.state ILIKE ('%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
$$;

-- >>> from unified-comps-sage-property-type-filter-2026-05-18.sql
-- Sage property_type facet + filter support for /admin/comps (Property Type filter).

CREATE OR REPLACE FUNCTION public.unified_comps_facets()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sources',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT source AS s
          FROM public.unified_comps
          WHERE source IS NOT NULL AND btrim(source) <> ''
        ) src
      ),
      '[]'::jsonb
    ),
    'states',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT state AS s
          FROM public.unified_comps
          WHERE state IS NOT NULL AND btrim(state) <> ''
        ) st
      ),
      '[]'::jsonb
    ),
    'unit_categories',
    COALESCE(
      (
        SELECT jsonb_agg(c ORDER BY c)
        FROM (
          SELECT DISTINCT unit_category AS c
          FROM public.unified_comps
          WHERE unit_category IS NOT NULL AND btrim(unit_category) <> ''
        ) uc
      ),
      '[]'::jsonb
    ),
    'keywords',
    COALESCE(
      (
        SELECT jsonb_agg(k ORDER BY k)
        FROM (
          SELECT DISTINCT btrim(kw) AS k
          FROM public.unified_comps u
          CROSS JOIN LATERAL unnest(u.amenity_keywords) AS kw
          WHERE u.amenity_keywords IS NOT NULL AND btrim(kw) <> ''
        ) kw
      ),
      '[]'::jsonb
    ),
    'sage_property_types',
    COALESCE(
      (
        SELECT jsonb_agg(pt ORDER BY pt)
        FROM (
          SELECT DISTINCT property_type AS pt
          FROM public.unified_comps
          WHERE source = 'all_sage_data'
            AND property_type IS NOT NULL
            AND btrim(property_type) <> ''
        ) sage_pt
      ),
      '[]'::jsonb
    )
  );
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_aggregate_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_aggregate_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL
)
RETURNS TABLE (
  row_count bigint,
  distinct_address_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_aggregate_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(DISTINCT uc.address_key)::bigint
  FROM public.unified_comps uc
  WHERE
    (p_sources IS NULL OR uc.source = ANY (p_sources))
    AND (p_states IS NULL OR uc.state = ANY (p_states))
    AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
    AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
    AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
    AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
    AND (
      p_unit_categories IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(p_unit_categories) AS c (cat)
        WHERE uc.unit_category = c.cat
          OR uc.unit_type ILIKE (
            '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
          ) ESCAPE '\'
      )
    )
    AND (
      (NOT use_fts AND NOT use_ilike)
      OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
      OR (
        use_ilike
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(p_ilike_terms) AS t (term)
          WHERE NOT (
            uc.property_name ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR uc.city ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR COALESCE(uc.overview, '') ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR uc.state ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
          )
        )
      )
    );
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL
)
RETURNS TABLE (
  source text,
  marker_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_geo_marker_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    t.source,
    COUNT(*)::bigint
  FROM (
    SELECT DISTINCT
      uc.source,
      COALESCE(NULLIF(trim(uc.address_key), ''), '__row:' || uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL
      AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.city ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.state ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
$$;

DO $$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'unified_comps_facets'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;

  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'unified_comps_aggregate_counts'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;

  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'unified_comps_geo_marker_counts'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;
END $$;

-- >>> from unified-comps-country-filter-2026-05-18.sql
-- Country filter for /admin/comps: facets + list/aggregate/geo RPCs.

CREATE OR REPLACE FUNCTION public.unified_comps_facets()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sources',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT source AS s
          FROM public.unified_comps
          WHERE source IS NOT NULL AND btrim(source) <> ''
        ) src
      ),
      '[]'::jsonb
    ),
    'countries',
    COALESCE(
      (
        SELECT jsonb_agg(c ORDER BY c)
        FROM (
          SELECT DISTINCT country AS c
          FROM public.unified_comps
          WHERE country IS NOT NULL AND btrim(country) <> ''
        ) co
      ),
      '[]'::jsonb
    ),
    'states',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT state AS s
          FROM public.unified_comps
          WHERE state IS NOT NULL AND btrim(state) <> ''
        ) st
      ),
      '[]'::jsonb
    ),
    'unit_categories',
    COALESCE(
      (
        SELECT jsonb_agg(c ORDER BY c)
        FROM (
          SELECT DISTINCT unit_category AS c
          FROM public.unified_comps
          WHERE unit_category IS NOT NULL AND btrim(unit_category) <> ''
        ) uc
      ),
      '[]'::jsonb
    ),
    'keywords',
    COALESCE(
      (
        SELECT jsonb_agg(k ORDER BY k)
        FROM (
          SELECT DISTINCT btrim(kw) AS k
          FROM public.unified_comps u
          CROSS JOIN LATERAL unnest(u.amenity_keywords) AS kw
          WHERE u.amenity_keywords IS NOT NULL AND btrim(kw) <> ''
        ) kw
      ),
      '[]'::jsonb
    ),
    'sage_property_types',
    COALESCE(
      (
        SELECT jsonb_agg(pt ORDER BY pt)
        FROM (
          SELECT DISTINCT property_type AS pt
          FROM public.unified_comps
          WHERE source = 'all_sage_data'
            AND property_type IS NOT NULL
            AND btrim(property_type) <> ''
        ) sage_pt
      ),
      '[]'::jsonb
    )
  );
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_list_properties'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_list_properties(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50,
  p_sort_by text DEFAULT 'created_at',
  p_sort_asc boolean DEFAULT false
)
RETURNS TABLE (
  anchor jsonb,
  site_rows jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_per_page integer := least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_per_page, 50), 1), 100);
  v_sort text := lower(btrim(coalesce(p_sort_by, 'created_at')));
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_list_properties: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  IF v_sort NOT IN (
    'created_at', 'property_name', 'state', 'total_sites', 'quality_score', 'low_adr', 'peak_adr'
  ) THEN
    v_sort := 'created_at';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT uc.*
    FROM public.unified_comps uc
    WHERE
      (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.city ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.state ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
            )
          )
        )
      )
  ),
  grouped AS (
    SELECT
      f.source,
      COALESCE(NULLIF(trim(f.address_key), ''), f.id) AS prop_key,
      (jsonb_agg(to_jsonb(f) ORDER BY
        CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN f.property_name END ASC NULLS LAST,
        CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN f.property_name END DESC NULLS LAST,
        CASE WHEN v_sort = 'state' AND p_sort_asc THEN f.state END ASC NULLS LAST,
        CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN f.state END DESC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN f.total_sites END ASC NULLS LAST,
        CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN f.total_sites END DESC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN f.quality_score END ASC NULLS LAST,
        CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN f.quality_score END DESC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN f.low_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN f.low_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN f.peak_adr END ASC NULLS LAST,
        CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN f.peak_adr END DESC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN f.created_at END ASC NULLS LAST,
        CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN f.created_at END DESC NULLS LAST,
        f.id ASC
      ))->0 AS anchor,
      jsonb_agg(to_jsonb(f) ORDER BY f.id) AS site_rows
    FROM filtered f
    GROUP BY f.source, COALESCE(NULLIF(trim(f.address_key), ''), f.id)
  )
  SELECT g.anchor, g.site_rows
  FROM grouped g
  ORDER BY
    CASE WHEN v_sort = 'property_name' AND p_sort_asc THEN g.anchor->>'property_name' END ASC NULLS LAST,
    CASE WHEN v_sort = 'property_name' AND NOT p_sort_asc THEN g.anchor->>'property_name' END DESC NULLS LAST,
    CASE WHEN v_sort = 'state' AND p_sort_asc THEN g.anchor->>'state' END ASC NULLS LAST,
    CASE WHEN v_sort = 'state' AND NOT p_sort_asc THEN g.anchor->>'state' END DESC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND p_sort_asc THEN (g.anchor->>'total_sites')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'total_sites' AND NOT p_sort_asc THEN (g.anchor->>'total_sites')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND p_sort_asc THEN (g.anchor->>'quality_score')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'quality_score' AND NOT p_sort_asc THEN (g.anchor->>'quality_score')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND p_sort_asc THEN (g.anchor->>'low_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'low_adr' AND NOT p_sort_asc THEN (g.anchor->>'low_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END ASC NULLS LAST,
    CASE WHEN v_sort = 'peak_adr' AND NOT p_sort_asc THEN (g.anchor->>'peak_adr')::numeric END DESC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END ASC NULLS LAST,
    CASE WHEN v_sort = 'created_at' AND NOT p_sort_asc THEN (g.anchor->>'created_at')::timestamptz END DESC NULLS LAST,
    g.anchor->>'id' ASC
  LIMIT v_per_page
  OFFSET v_offset;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_aggregate_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_aggregate_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL
)
RETURNS TABLE (
  row_count bigint,
  distinct_address_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_aggregate_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(DISTINCT uc.address_key)::bigint
  FROM public.unified_comps uc
  WHERE
    (p_sources IS NULL OR uc.source = ANY (p_sources))
    AND (p_states IS NULL OR uc.state = ANY (p_states))
    AND (p_countries IS NULL OR uc.country = ANY (p_countries))
    AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
    AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
    AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
    AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
    AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
    AND (
      p_unit_categories IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(p_unit_categories) AS c (cat)
        WHERE uc.unit_category = c.cat
          OR uc.unit_type ILIKE (
            '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
          ) ESCAPE '\'
      )
    )
    AND (
      (NOT use_fts AND NOT use_ilike)
      OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
      OR (
        use_ilike
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(p_ilike_terms) AS t (term)
          WHERE NOT (
            uc.property_name ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR uc.city ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR COALESCE(uc.overview, '') ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
            OR uc.state ILIKE (
              '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
          )
        )
      )
    );
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_countries text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_property_types text[] DEFAULT NULL,
  p_is_open text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL
)
RETURNS TABLE (
  source text,
  marker_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_geo_marker_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    t.source,
    COUNT(*)::bigint
  FROM (
    SELECT DISTINCT
      uc.source,
      COALESCE(NULLIF(trim(uc.address_key), ''), '__row:' || uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL
      AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_countries IS NULL OR uc.country = ANY (p_countries))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (p_property_types IS NULL OR uc.property_type = ANY (p_property_types))
      AND (p_is_open IS NULL OR uc.is_open = ANY (p_is_open))
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.city ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.state ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS rp
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'unified_comps_facets',
        'unified_comps_list_properties',
        'unified_comps_aggregate_counts',
        'unified_comps_geo_marker_counts'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', r.rp);
  END LOOP;
END $$;

-- >>> from unified-comps-geo-marker-counts-rpc.sql
-- Exact geocoded map-marker counts per `source` for unified_comps (same filter
-- semantics as unified_comps_aggregate_counts + lat/lon NOT NULL).
--
-- Marker = one row per (source, COALESCE(trim(address_key), '__row:' || id)),
-- matching app/api/admin/comps/unified/geo/route.ts `addressKeyGroupKey` collapse.
--
-- GRANT uses regprocedure so the signature always matches PostgreSQL.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS rp
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname = 'unified_comps_geo_marker_counts'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.rp);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.unified_comps_geo_marker_counts(
  p_sources text[] DEFAULT NULL,
  p_states text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_min_adr numeric DEFAULT NULL,
  p_max_adr numeric DEFAULT NULL,
  p_unit_categories text[] DEFAULT NULL,
  p_tsquery text DEFAULT NULL,
  p_ilike_terms text[] DEFAULT NULL
)
RETURNS TABLE (
  source text,
  marker_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_fts boolean := p_tsquery IS NOT NULL AND btrim(p_tsquery) <> '';
  use_ilike boolean := p_ilike_terms IS NOT NULL AND coalesce(array_length(p_ilike_terms, 1), 0) > 0;
BEGIN
  IF use_fts AND use_ilike THEN
    RAISE EXCEPTION 'unified_comps_geo_marker_counts: pass either p_tsquery or p_ilike_terms, not both';
  END IF;

  RETURN QUERY
  SELECT
    t.source,
    COUNT(*)::bigint
  FROM (
    SELECT DISTINCT
      uc.source,
      COALESCE(NULLIF(trim(uc.address_key), ''), '__row:' || uc.id) AS marker_key
    FROM public.unified_comps uc
    WHERE
      uc.lat IS NOT NULL
      AND uc.lon IS NOT NULL
      AND (p_sources IS NULL OR uc.source = ANY (p_sources))
      AND (p_states IS NULL OR uc.state = ANY (p_states))
      AND (p_keywords IS NULL OR uc.amenity_keywords && p_keywords)
      AND (p_min_adr IS NULL OR uc.low_adr >= p_min_adr)
      AND (p_max_adr IS NULL OR uc.peak_adr <= p_max_adr)
      AND (
        p_unit_categories IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(p_unit_categories) AS c (cat)
          WHERE uc.unit_category = c.cat
            OR uc.unit_type ILIKE (
              '%' || replace(replace(replace(c.cat, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
            ) ESCAPE '\'
        )
      )
      AND (
        (NOT use_fts AND NOT use_ilike)
        OR (use_fts AND uc.search_tsv @@ to_tsquery('simple', p_tsquery))
        OR (
          use_ilike
          AND NOT EXISTS (
            SELECT 1
            FROM unnest(p_ilike_terms) AS t (term)
            WHERE NOT (
              uc.property_name ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.city ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR COALESCE(uc.overview, '') ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
              OR uc.state ILIKE (
                '%' || replace(replace(replace(t.term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%'
              ) ESCAPE '\'
            )
          )
        )
      )
  ) t
  GROUP BY t.source;
END;
$$;

DO $$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'unified_comps_geo_marker_counts'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;
END $$;

-- >>> from unified-comps-facets-rpc.sql
-- Distinct facet values for /admin/comps filter dropdowns.
-- Replaces scanning unified_comps with a row LIMIT (which missed most states).

CREATE OR REPLACE FUNCTION public.unified_comps_facets()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sources',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT source AS s
          FROM public.unified_comps
          WHERE source IS NOT NULL AND btrim(source) <> ''
        ) src
      ),
      '[]'::jsonb
    ),
    'states',
    COALESCE(
      (
        SELECT jsonb_agg(s ORDER BY s)
        FROM (
          SELECT DISTINCT state AS s
          FROM public.unified_comps
          WHERE state IS NOT NULL AND btrim(state) <> ''
        ) st
      ),
      '[]'::jsonb
    ),
    'unit_categories',
    COALESCE(
      (
        SELECT jsonb_agg(c ORDER BY c)
        FROM (
          SELECT DISTINCT unit_category AS c
          FROM public.unified_comps
          WHERE unit_category IS NOT NULL AND btrim(unit_category) <> ''
        ) uc
      ),
      '[]'::jsonb
    ),
    'keywords',
    COALESCE(
      (
        SELECT jsonb_agg(k ORDER BY k)
        FROM (
          SELECT DISTINCT btrim(kw) AS k
          FROM public.unified_comps u
          CROSS JOIN LATERAL unnest(u.amenity_keywords) AS kw
          WHERE u.amenity_keywords IS NOT NULL AND btrim(kw) <> ''
        ) kw
      ),
      '[]'::jsonb
    )
  );
$$;

DO $$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'unified_comps_facets'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, anon, service_role', fn);
  END IF;
END $$;

-- >>> from unified-comps-fuzzy-rpc.sql
-- =============================================================================
-- Fuzzy search RPC for the unified_comps materialized view.
--
-- Fallback used by /api/admin/comps/unified when exact tsvector search returns
-- zero rows. Uses pg_trgm similarity() on property_name + overview.
--
-- Returns the synthetic `id` column of `unified_comps` (e.g. "rep:<uuid>",
-- "glamp:42") so the API can re-fetch the full row.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.search_unified_comps_fuzzy(
  p_terms text[],
  p_similarity_threshold float DEFAULT 0.4,
  p_limit int DEFAULT 500,
  p_sources text[] DEFAULT NULL
)
RETURNS TABLE (id text, score float)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  term text;
  max_score float;
BEGIN
  IF p_terms IS NULL OR array_length(p_terms, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      u.id,
      u.property_name,
      u.overview,
      u.source
    FROM public.unified_comps u
    WHERE (p_sources IS NULL OR u.source = ANY(p_sources))
  ),
  scored AS (
    SELECT
      c.id,
      -- Best similarity across all terms (AND-ish: require each term to cross threshold)
      (
        SELECT MIN(
          GREATEST(
            similarity(lower(c.property_name), lower(t)),
            similarity(lower(COALESCE(c.overview, '')), lower(t))
          )
        )
        FROM unnest(p_terms) t
      ) AS min_term_score
    FROM candidates c
  )
  SELECT s.id, s.min_term_score::float AS score
  FROM scored s
  WHERE s.min_term_score IS NOT NULL
    AND s.min_term_score >= p_similarity_threshold
  ORDER BY s.min_term_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_unified_comps_fuzzy(text[], float, int, text[])
  TO authenticated, anon, service_role;

