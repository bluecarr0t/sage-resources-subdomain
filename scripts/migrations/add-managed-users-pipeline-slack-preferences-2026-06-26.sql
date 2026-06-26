-- Per-user Job Pipeline Slack DM notification toggles (self-service on /admin/account).

ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS pipeline_slack_preferences JSONB NOT NULL
  DEFAULT '{"submitForReview":true,"resubmitForReview":true,"reviewStatusChange":true,"dueDateChange":true,"projectStatusChange":true}'::jsonb;

COMMENT ON COLUMN public.managed_users.pipeline_slack_preferences IS
  'Per-user Job Pipeline Slack DM notification toggles (mirrors pipeline_email_preferences keys).';
