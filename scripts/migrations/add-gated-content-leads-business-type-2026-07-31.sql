-- Add business_type for gated-content CRM sync (Zapier → GoHighLevel) and Slack triage.
-- Captured on first-time Market Overview lead form as “I am a…”.

ALTER TABLE public.gated_content_leads
  ADD COLUMN IF NOT EXISTS business_type text;

COMMENT ON COLUMN public.gated_content_leads.business_type IS
  'Lead self-reported role: investor | developer | operator | lender | consultant | media | other';

-- Recreate reporting view with business_type (DROP required to change column set).
DROP VIEW IF EXISTS public.gated_content_lead_activity_summary;

CREATE VIEW public.gated_content_lead_activity_summary AS
SELECT
  l.email,
  l.page_slug,
  l.name,
  l.first_name,
  l.last_name,
  l.business_type,
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
