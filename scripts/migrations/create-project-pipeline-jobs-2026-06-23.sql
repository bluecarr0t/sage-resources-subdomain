-- Job Numbers Google Sheet → Supabase mirror for cron sync.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.project_pipeline_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_number TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  property_location TEXT NOT NULL DEFAULT '',
  appraiser_consultant TEXT NOT NULL DEFAULT '',
  proj_mgr TEXT NOT NULL DEFAULT '',
  contract_start TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  date_completed TEXT NOT NULL DEFAULT '',
  commercial_outdoor TEXT NOT NULL DEFAULT '',
  property_type TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT '',
  sent_to_client TEXT NOT NULL DEFAULT '',
  author_slack_username TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  sheet_row_index INTEGER NOT NULL,
  sheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  last_sync_run_id UUID NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_pipeline_jobs_sheet_job_unique UNIQUE (sheet_id, sheet_name, job_number)
);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_job_number
  ON public.project_pipeline_jobs (job_number);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_sheet
  ON public.project_pipeline_jobs (sheet_id, sheet_name);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_commercial_outdoor
  ON public.project_pipeline_jobs (commercial_outdoor);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_due_date
  ON public.project_pipeline_jobs (due_date);

COMMENT ON TABLE public.project_pipeline_jobs IS
  'Mirror of the Job Numbers Google Sheet (project pipeline). Refreshed by /api/cron/sync-project-pipeline.';

CREATE TABLE IF NOT EXISTS public.project_pipeline_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  jobs_fetched INTEGER NOT NULL DEFAULT 0,
  jobs_upserted INTEGER NOT NULL DEFAULT 0,
  jobs_removed INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_sync_runs_completed_at
  ON public.project_pipeline_sync_runs (completed_at DESC NULLS LAST);

COMMENT ON TABLE public.project_pipeline_sync_runs IS
  'Run history for Job Numbers Google Sheet → Supabase cron sync.';

ALTER TABLE public.project_pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_pipeline_sync_runs ENABLE ROW LEVEL SECURITY;

-- No GRANT to anon/authenticated: only the service role (server secret key) bypasses RLS.
