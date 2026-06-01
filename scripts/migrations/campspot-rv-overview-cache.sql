-- RV Industry Overview: materialized JSON snapshot of server-built aggregates.
-- Full aggregation logic stays in TypeScript (regex-based unit typing, cohort rules).
-- This table stores one row so page loads can use a single SELECT instead of scanning `campspot` + RoverPass.
--
-- After Campspot ETL, call:
--   npm run refresh:rv-overview  (upserts this table + POST invalidate-next-cache), or
--   POST /api/admin/rv-industry-overview/refresh-cache  (full scan + revalidateTag)
-- Bearer: RV_INDUSTRY_OVERVIEW_REFRESH_SECRET when using the API from automation.
--
-- Optional: raise PostgREST max_rows (Supabase Dashboard → Project Settings → API) if you set
-- CAMPSPOT_RV_OVERVIEW_PAGE_SIZE above the default cap (~1000).

CREATE TABLE IF NOT EXISTS campspot_rv_overview_cache (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payload JSONB NOT NULL,
  rows_scanned INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campspot_rv_overview_cache_computed_at_idx
  ON campspot_rv_overview_cache (computed_at DESC);

COMMENT ON TABLE campspot_rv_overview_cache IS
  'Single-row JSON snapshot for /admin/rv-industry-overview; refreshed by TS after full campspot scan.';

ALTER TABLE campspot_rv_overview_cache ENABLE ROW LEVEL SECURITY;

-- No GRANT to anon/authenticated: only the service role (server secret key) bypasses RLS and reads/writes.
