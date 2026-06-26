-- Slack profile email for Job Pipeline DMs (may differ from managed_users login email).

ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS slack_email TEXT;

COMMENT ON COLUMN public.managed_users.slack_email IS
  'Email on the user''s Slack profile for pipeline DM delivery. Verified via Slack users.lookupByEmail when saved.';
