-- CRM contacts imported from exports (GoHighLevel and future sources).
-- Applied remotely via Supabase MCP apply_migration (create_contacts_table_ghl_export).

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  first_name text,
  last_name text,
  phone text,
  email text,
  business_name text,
  external_created_at timestamptz,
  last_activity text,
  tags text,
  source text NOT NULL DEFAULT 'GoHighLevel',
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

COMMENT ON TABLE public.contacts IS 'CRM contacts imported from exports (GoHighLevel and future sources).';
COMMENT ON COLUMN public.contacts.external_id IS 'Source-system contact id (e.g. GoHighLevel Contact Id).';
COMMENT ON COLUMN public.contacts.source IS 'Origin of the contact row, e.g. GoHighLevel.';

CREATE INDEX IF NOT EXISTS contacts_source_idx ON public.contacts (source);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON public.contacts (email);
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON public.contacts (phone);
CREATE INDEX IF NOT EXISTS contacts_external_created_at_idx ON public.contacts (external_created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_imported_at_idx ON public.contacts (imported_at DESC);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select_managed ON public.contacts;
CREATE POLICY contacts_select_managed ON public.contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS contacts_insert_managed ON public.contacts;
CREATE POLICY contacts_insert_managed ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS contacts_update_managed ON public.contacts;
CREATE POLICY contacts_update_managed ON public.contacts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
