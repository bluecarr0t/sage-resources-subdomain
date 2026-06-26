-- Remove legacy slack_username from managed_users (replaced by slack_email on /admin/account).

ALTER TABLE public.managed_users
  DROP COLUMN IF EXISTS slack_username;
