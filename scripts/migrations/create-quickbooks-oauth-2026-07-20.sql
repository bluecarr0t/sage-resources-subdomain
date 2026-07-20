-- Singleton QuickBooks OAuth connection for Sage Outdoor Advisory admin tools.
-- Accessed only via the server service-role client (bypasses RLS).

CREATE TABLE IF NOT EXISTS public.quickbooks_oauth (
  id integer PRIMARY KEY CHECK (id = 1),
  realm_id text NOT NULL,
  refresh_token text NOT NULL,
  access_token text,
  access_token_expires_at timestamptz,
  connected_by_user_id uuid,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quickbooks_oauth ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.quickbooks_oauth IS
  'Singleton QBO OAuth tokens for admin invoice remapper. Service-role only.';
