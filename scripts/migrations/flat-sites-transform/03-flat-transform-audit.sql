-- Audit log for Phase 3 flat table rebuilds.

CREATE TABLE IF NOT EXISTS public.flat_transform_runs (
  id BIGSERIAL PRIMARY KEY,
  ota TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  rows_before BIGINT,
  rows_inserted BIGINT,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  options JSONB
);

CREATE INDEX IF NOT EXISTS idx_flat_transform_runs_ota_started
  ON public.flat_transform_runs (ota, started_at DESC);
