-- Gated content leads for Supabase magic-link access (e.g. /glamping-market-overview)
-- Run in Supabase SQL Editor (or via apply-migration tooling).
--
-- A row is upserted in app/auth/callback after a successful magic-link sign-in.
-- One row per (email, page_slug) so re-visits update verified_at instead of duplicating.

CREATE TABLE IF NOT EXISTS public.gated_content_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  page_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  UNIQUE (email, page_slug)
);

CREATE INDEX IF NOT EXISTS gated_content_leads_page_slug_idx
  ON public.gated_content_leads (page_slug);

CREATE INDEX IF NOT EXISTS gated_content_leads_user_id_idx
  ON public.gated_content_leads (user_id);

ALTER TABLE public.gated_content_leads ENABLE ROW LEVEL SECURITY;

-- An authenticated user (post magic-link) can insert their own lead row.
DROP POLICY IF EXISTS gated_leads_insert_own ON public.gated_content_leads;
CREATE POLICY gated_leads_insert_own ON public.gated_content_leads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ...and update their own lead row (e.g. refreshing verified_at on re-visit).
DROP POLICY IF EXISTS gated_leads_update_own ON public.gated_content_leads;
CREATE POLICY gated_leads_update_own ON public.gated_content_leads
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Managed users (Sage admins) can read all leads for follow-up.
DROP POLICY IF EXISTS gated_leads_select_managed ON public.gated_content_leads;
CREATE POLICY gated_leads_select_managed ON public.gated_content_leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
