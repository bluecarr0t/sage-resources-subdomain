-- Phase 2: tourism economics cache + STVR market snapshots
-- Run in Supabase SQL Editor.

-- ============================================================
-- tourism_economics — state/county lodging & tourism spend
-- ============================================================
CREATE TABLE IF NOT EXISTS tourism_economics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geo_level TEXT NOT NULL CHECK (geo_level IN ('state', 'county')),
  state TEXT NOT NULL,
  county TEXT,
  year INTEGER NOT NULL,
  lodging_spend NUMERIC(18, 2),
  total_spend NUMERIC(18, 2),
  employment NUMERIC(12, 2),
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique key treating NULL county as '' so state-level upserts work
CREATE UNIQUE INDEX IF NOT EXISTS tourism_economics_geo_year_unique
  ON tourism_economics (geo_level, state, COALESCE(county, ''), year);

CREATE INDEX IF NOT EXISTS tourism_economics_state_idx ON tourism_economics (state);
CREATE INDEX IF NOT EXISTS tourism_economics_year_idx ON tourism_economics (year);

COMMENT ON TABLE tourism_economics IS 'Cached tourism spend / employment for Demand Indicators (seeded annually).';

ALTER TABLE tourism_economics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tourism_economics" ON tourism_economics;
CREATE POLICY "Public read tourism_economics"
  ON tourism_economics FOR SELECT
  USING (true);

-- ============================================================
-- stvr_market_snapshots — optional AirDNA / STVR cache by lat/lng bucket
-- ============================================================
CREATE TABLE IF NOT EXISTS stvr_market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat_bucket NUMERIC(8, 2) NOT NULL,
  lng_bucket NUMERIC(8, 2) NOT NULL,
  month TEXT NOT NULL,
  listing_count INTEGER,
  occupancy NUMERIC(8, 4),
  adr NUMERIC(12, 2),
  market_name TEXT,
  source TEXT NOT NULL DEFAULT 'airdna',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stvr_market_snapshots_bucket_unique UNIQUE (lat_bucket, lng_bucket, month, source)
);

CREATE INDEX IF NOT EXISTS stvr_market_snapshots_month_idx ON stvr_market_snapshots (month);

COMMENT ON TABLE stvr_market_snapshots IS 'Cached STVR/AirDNA market snapshots keyed by lat/lng bucket + month.';

ALTER TABLE stvr_market_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage stvr_market_snapshots" ON stvr_market_snapshots;
-- Reads allowed for authenticated/service; writes via service role in enrich
CREATE POLICY "Public read stvr_market_snapshots"
  ON stvr_market_snapshots FOR SELECT
  USING (true);
