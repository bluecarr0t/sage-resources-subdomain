-- Snapshot of sheet-owned field values at the last successful sync (for last-edited-wins merge).

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS sheet_field_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_pipeline_jobs.sheet_field_snapshot IS
  'Last synced Google Sheets values for due_date, review_status, and sent_to_client.';

-- Seed snapshots from current mirrored columns for existing rows.
UPDATE public.project_pipeline_jobs
SET sheet_field_snapshot = jsonb_build_object(
  'dueDate', COALESCE(due_date, ''),
  'reviewStatus', COALESCE(review_status, ''),
  'sentToClient', COALESCE(sent_to_client, '')
)
WHERE sheet_field_snapshot = '{}'::jsonb;
