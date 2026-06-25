-- Supabase-only project status for active jobs (not synced from Google Sheets).
-- Safe to re-run.

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS project_status TEXT NOT NULL DEFAULT 'Not Started';

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_project_status
  ON public.project_pipeline_jobs (project_status);

COMMENT ON COLUMN public.project_pipeline_jobs.project_status IS
  'Admin-only workflow status (Not Started, In-Progress, Completed, Cancelled). Not mirrored from Google Sheets.';
