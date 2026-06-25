-- Rows edited in the Active Jobs UI are authoritative in Supabase (sheet cron sync must not overwrite).

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS ui_source_of_truth BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_ui_source_of_truth
  ON public.project_pipeline_jobs (sheet_id, sheet_name, ui_source_of_truth)
  WHERE ui_source_of_truth = TRUE;

COMMENT ON COLUMN public.project_pipeline_jobs.ui_source_of_truth IS
  'When true, this row was saved from the Active Jobs UI and Supabase values win over Google Sheets on read/sync.';
