-- Dedupe log for scheduled Sent to Client reminder emails / Slack DMs.

CREATE TABLE IF NOT EXISTS public.project_pipeline_sent_to_client_reminder_sent (
  sheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  job_number TEXT NOT NULL,
  reminder_day TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_pipeline_sent_to_client_reminder_sent_pkey
    PRIMARY KEY (sheet_id, sheet_name, job_number, reminder_day)
);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_sent_to_client_reminder_sent_sent_at
  ON public.project_pipeline_sent_to_client_reminder_sent (sent_at DESC);

COMMENT ON TABLE public.project_pipeline_sent_to_client_reminder_sent IS
  'Tracks scheduled Sent to Client reminder emails/Slack DMs per job and reminder day (ET).';

ALTER TABLE public.project_pipeline_sent_to_client_reminder_sent ENABLE ROW LEVEL SECURITY;
