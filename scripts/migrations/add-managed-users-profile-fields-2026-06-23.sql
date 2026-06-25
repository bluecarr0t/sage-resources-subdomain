-- Profile fields for managed_users (add-user modal).

ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS slack_username TEXT;

COMMENT ON COLUMN public.managed_users.first_name IS 'User first name (admin-managed profile).';
COMMENT ON COLUMN public.managed_users.last_name IS 'User last name (admin-managed profile).';
COMMENT ON COLUMN public.managed_users.slack_username IS 'Slack username for pipeline / notifications.';
