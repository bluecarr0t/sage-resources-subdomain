-- Add first_name / last_name for newsletter CRM sync (Zapier → GoHighLevel).
-- `name` remains the combined full name for backward compatibility.

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;
