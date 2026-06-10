-- Newsletter subscribers captured from public signup forms (e.g. site footer).
-- Run in Supabase SQL Editor (or via apply-migration tooling).
--
-- Rows are inserted server-side via POST /api/newsletter/subscribe (service role).
-- Sync to GoHighLevel with a Zapier/Make trigger on new rows in this table.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  source text NOT NULL DEFAULT 'footer',
  created_at timestamptz NOT NULL DEFAULT now(),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_source_idx
  ON public.newsletter_subscribers (source);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_subscribed_at_idx
  ON public.newsletter_subscribers (subscribed_at DESC);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Managed users (Sage admins) can read subscribers for follow-up.
DROP POLICY IF EXISTS newsletter_subscribers_select_managed ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_select_managed ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
