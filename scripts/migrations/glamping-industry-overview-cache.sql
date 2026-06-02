-- Glamping Industry Overview: materialized JSON snapshot (Hipcamp + Sage).
-- Refresh via POST /api/admin/glamping-industry-overview/refresh-cache or npm run refresh:glamping-overview.

CREATE TABLE IF NOT EXISTS glamping_industry_overview_cache (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payload JSONB NOT NULL,
  rows_scanned INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS glamping_industry_overview_cache_computed_at_idx
  ON glamping_industry_overview_cache (computed_at DESC);

COMMENT ON TABLE glamping_industry_overview_cache IS
  'Single-row JSON snapshot for /admin/glamping-industry-overview; Hipcamp + all_glamping_properties.';

ALTER TABLE glamping_industry_overview_cache ENABLE ROW LEVEL SECURITY;
