-- Add first_name / last_name for gated-content CRM sync (Zapier → GoHighLevel).
-- `name` remains the combined full name for backward compatibility.

ALTER TABLE public.gated_content_leads
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill from existing combined `name` (first token → first_name, remainder → last_name).
UPDATE public.gated_content_leads
SET
  first_name = CASE
    WHEN name IS NULL OR btrim(name) = '' THEN NULL
    WHEN position(' ' IN btrim(name)) = 0 THEN btrim(name)
    ELSE split_part(btrim(name), ' ', 1)
  END,
  last_name = CASE
    WHEN name IS NULL OR btrim(name) = '' THEN NULL
    WHEN position(' ' IN btrim(name)) = 0 THEN NULL
    ELSE nullif(btrim(substr(btrim(name), position(' ' IN btrim(name)) + 1)), '')
  END
WHERE first_name IS NULL
  AND last_name IS NULL
  AND name IS NOT NULL
  AND btrim(name) <> '';

-- Recreate reporting view with first_name / last_name (DROP required to change column set).
DROP VIEW IF EXISTS public.gated_content_lead_activity_summary;

CREATE VIEW public.gated_content_lead_activity_summary AS
SELECT
  l.email,
  l.page_slug,
  l.name,
  l.first_name,
  l.last_name,
  l.created_at AS lead_created_at,
  l.verified_at AS lead_verified_at,
  COALESCE(fs.form_submit_count, 0)::bigint AS form_submit_count,
  COALESCE(av.auth_verified_count, 0)::bigint AS auth_verified_count,
  fs.first_form_submit_at,
  fs.last_form_submit_at,
  av.first_auth_verified_at,
  av.last_auth_verified_at
FROM public.gated_content_leads l
LEFT JOIN (
  SELECT
    email,
    page_slug,
    COUNT(*)::bigint AS form_submit_count,
    MIN(created_at) AS first_form_submit_at,
    MAX(created_at) AS last_form_submit_at
  FROM public.gated_content_access_events
  WHERE event_type = 'form_submit'
  GROUP BY email, page_slug
) fs ON fs.email = l.email AND fs.page_slug = l.page_slug
LEFT JOIN (
  SELECT
    email,
    page_slug,
    COUNT(*)::bigint AS auth_verified_count,
    MIN(created_at) AS first_auth_verified_at,
    MAX(created_at) AS last_auth_verified_at
  FROM public.gated_content_access_events
  WHERE event_type = 'auth_verified'
  GROUP BY email, page_slug
) av ON av.email = l.email AND av.page_slug = l.page_slug;

COMMENT ON VIEW public.gated_content_lead_activity_summary IS
  'Per-lead form submit and re-auth counts joined to gated_content_leads.';
