-- Reference POIs for market-report demand drivers (state parks, major outdoor sites).
-- Run in Supabase SQL Editor. Does not touch county-population / county-gdp tables.

CREATE TABLE IF NOT EXISTS outdoor_recreation_sites (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  site_type TEXT NOT NULL,
  state TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  annual_visitors BIGINT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT outdoor_recreation_sites_source_key UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS outdoor_recreation_sites_lat_idx
  ON outdoor_recreation_sites (latitude);
CREATE INDEX IF NOT EXISTS outdoor_recreation_sites_lon_idx
  ON outdoor_recreation_sites (longitude);
CREATE INDEX IF NOT EXISTS outdoor_recreation_sites_state_idx
  ON outdoor_recreation_sites (state);

COMMENT ON TABLE outdoor_recreation_sites IS 'Non-NPS outdoor anchors for demand-driver scoring (state parks, climbing hubs, etc.).';

-- Seed: Smith Rock State Park (Terrebonne, OR) — Bend-area climbing / day-use anchor
INSERT INTO outdoor_recreation_sites (name, site_type, state, latitude, longitude, source, source_id)
VALUES (
  'Smith Rock State Park',
  'state_park',
  'OR',
  44.3679,
  -121.1406,
  'manual_seed',
  'smith-rock-or'
)
ON CONFLICT (source, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  site_type = EXCLUDED.site_type,
  state = EXCLUDED.state,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();
