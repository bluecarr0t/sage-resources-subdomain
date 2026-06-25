-- Add sheet_year for multi-tab Job Numbers history in project_pipeline_jobs.
-- Safe to re-run.

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS sheet_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_project_pipeline_jobs_sheet_year
  ON public.project_pipeline_jobs (sheet_year DESC NULLS LAST);

COMMENT ON COLUMN public.project_pipeline_jobs.sheet_year IS
  'Calendar year parsed from sheet_name (e.g. 2026 from "2026 Jobs").';

UPDATE public.project_pipeline_jobs
SET sheet_year = (
  CASE
    WHEN sheet_name ~ '^[0-9]{4}' THEN substring(sheet_name from '^([0-9]{4})')::INTEGER
    ELSE NULL
  END
)
WHERE sheet_year IS NULL;
