-- Supabase-only admin flag for active jobs (not synced from Google Sheets).

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS flag TEXT NOT NULL DEFAULT 'None';

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_flag
  ON public.project_pipeline_jobs (flag)
  WHERE flag <> 'None';

COMMENT ON COLUMN public.project_pipeline_jobs.flag IS
  'Admin-only project flag (None, Attention, Escalation, etc.). Not mirrored from Google Sheets.';
