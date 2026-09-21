-- Outdoor client portal (local MVP). Safe to re-run.
-- Service-role only: RLS on, no grants to anon/authenticated.

CREATE TABLE IF NOT EXISTS public.client_portal_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  invited_email TEXT NOT NULL DEFAULT '',
  invited_at TIMESTAMPTZ,
  welcome_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_engagements_invited_email
  ON public.client_portal_engagements (lower(invited_email));

CREATE INDEX IF NOT EXISTS idx_client_portal_engagements_enabled
  ON public.client_portal_engagements (enabled)
  WHERE enabled = TRUE;

CREATE TABLE IF NOT EXISTS public.client_portal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.client_portal_engagements (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by_email TEXT NOT NULL DEFAULT '',
  created_by_display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emailed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_portal_updates_engagement
  ON public.client_portal_updates (engagement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.client_portal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.client_portal_engagements (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'submitted', 'cleared')),
  created_by_email TEXT NOT NULL DEFAULT '',
  created_by_display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_response TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,
  cleared_by_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_portal_requests_engagement
  ON public.client_portal_requests (engagement_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.client_portal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.client_portal_engagements (id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.client_portal_requests (id) ON DELETE SET NULL,
  label TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  external_url TEXT,
  uploaded_by_role TEXT NOT NULL DEFAULT 'staff'
    CHECK (uploaded_by_role IN ('staff', 'client')),
  uploaded_by_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_portal_files_has_source CHECK (
    (storage_path IS NOT NULL AND btrim(storage_path) <> '')
    OR (external_url IS NOT NULL AND btrim(external_url) <> '')
  )
);

CREATE INDEX IF NOT EXISTS idx_client_portal_files_engagement
  ON public.client_portal_files (engagement_id, created_at DESC);

COMMENT ON TABLE public.client_portal_engagements IS
  'Client portal enablement per Job Pipeline job (Outdoor FS/Appraisal MVP).';

ALTER TABLE public.client_portal_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_files ENABLE ROW LEVEL SECURITY;
