-- Watermark + audit tables for DigitalOcean read-only sync
-- Run once in Supabase SQL editor (also auto-created by run-sync.ts)

CREATE TABLE IF NOT EXISTS public.do_sync_watermarks (
  source_key TEXT PRIMARY KEY,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01'::timestamptz
);

CREATE TABLE IF NOT EXISTS public.do_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  options JSONB,
  results JSONB,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS do_sync_runs_started_at_idx ON public.do_sync_runs (started_at DESC);

-- bookoutdoors schema (campings DB) — identical mirror
CREATE SCHEMA IF NOT EXISTS bookoutdoors;

ALTER TABLE bookoutdoors.propertys ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookoutdoors.scrapings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookoutdoors.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON bookoutdoors.propertys;
CREATE POLICY "Allow authenticated read" ON bookoutdoors.propertys FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON bookoutdoors.scrapings;
CREATE POLICY "Allow authenticated read" ON bookoutdoors.scrapings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated read" ON bookoutdoors.sites;
CREATE POLICY "Allow authenticated read" ON bookoutdoors.sites FOR SELECT TO authenticated USING (true);
