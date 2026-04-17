-- ============================================================================
-- Sage AI: property_geocode cache + nearest_attractions/properties_within_radius RPCs
--
-- Adds a PostGIS-backed geocode cache for all_glamping_properties, plus two
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
-- property_geocode: one row per all_glamping_properties row we've resolved.
-- The generated `geom` column lets PostGIS use the GIST index for fast
-- radius queries without the tool having to touch ST_* in application code.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_geocode (
  property_id       BIGINT PRIMARY KEY
    REFERENCES all_glamping_properties(id) ON DELETE CASCADE,
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
  'Cached geocoded lat/lng for all_glamping_properties. Populated by the geocode_property tool on-demand and by scripts/backfill-property-geocode.ts.';

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
    JOIN all_glamping_properties ap ON ap.id = p.property_id
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
  JOIN all_glamping_properties ap ON ap.id = pg.property_id
  WHERE ST_DWithin(pg.geom, origin, radius_m)
  ORDER BY distance_km ASC
  LIMIT capped_lim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.properties_within_radius(double precision, double precision, integer, integer) TO authenticated;
