-- Create table to store discovery pipeline run history and metrics
-- Run this SQL in Supabase SQL Editor or use: npx tsx scripts/apply-discovery-runs-migration.ts

CREATE TABLE IF NOT EXISTS glamping_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  articles_found INT NOT NULL DEFAULT 0,
  articles_fetched INT NOT NULL DEFAULT 0,
  articles_failed INT NOT NULL DEFAULT 0,
  properties_extracted INT NOT NULL DEFAULT 0,
  properties_new INT NOT NULL DEFAULT 0,
  properties_inserted INT NOT NULL DEFAULT 0,
  processed_urls_count INT NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_glamping_discovery_runs_completed_at
  ON glamping_discovery_runs (completed_at DESC NULLS LAST);

COMMENT ON TABLE glamping_discovery_runs IS
  'Run history and metrics for the glamping discovery pipeline.';
