-- Gated content access events: form submits + successful magic-link re-auths.
-- Run in Supabase SQL Editor (or via apply-migration tooling).
--
-- Requires public.gated_content_leads (create-gated-content-leads-2026-06-02.sql).
--
-- Example queries:
--
-- Per-email usage on glamping market overview:
--   SELECT * FROM gated_content_lead_activity_summary
--   WHERE page_slug = 'glamping-market-overview'
--   ORDER BY last_auth_verified_at DESC NULLS LAST;
--
-- Full timeline for one address:
--   SELECT created_at, event_type, metadata
--   FROM gated_content_access_events
--   WHERE email = 'jane@company.com'
--     AND page_slug = 'glamping-market-overview'
--   ORDER BY created_at;

-- ---------------------------------------------------------------------------
-- 1) Append-only event log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gated_content_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN ('form_submit', 'auth_verified')),
  email text NOT NULL,
  page_slug text NOT NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_gated_content_access_events_email_page_created
  ON public.gated_content_access_events (email, page_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gated_content_access_events_page_type_created
  ON public.gated_content_access_events (page_slug, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gated_content_access_events_created_at
  ON public.gated_content_access_events (created_at DESC);

COMMENT ON TABLE public.gated_content_access_events IS
  'Gated page form submits and successful magic-link re-auths (append-only).';

-- ---------------------------------------------------------------------------
-- 2) Reporting view (per email + page_slug)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.gated_content_lead_activity_summary AS
SELECT
  l.email,
  l.page_slug,
  l.name,
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

-- ---------------------------------------------------------------------------
-- 3) RLS (managed users read; service role bypasses for inserts)
-- ---------------------------------------------------------------------------
ALTER TABLE public.gated_content_access_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gated_content_access_events_select_managed
  ON public.gated_content_access_events;
CREATE POLICY gated_content_access_events_select_managed
  ON public.gated_content_access_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
