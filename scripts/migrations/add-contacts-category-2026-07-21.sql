-- Add ICP category + web-research provenance columns to contacts.
-- Applied remotely via Supabase MCP apply_migration (add_contacts_category_columns).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS research_notes text;

DO $$ BEGIN
  ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_category_check CHECK (
      category IS NULL OR category IN (
        'glamping_property_owner',
        'outdoor_hospitality_investor',
        'outdoor_hospitality_developer',
        'unit_manufacturer',
        'outdoor_hospitality_lender'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_lower_uidx
  ON public.contacts (lower(email))
  WHERE email IS NOT NULL;

COMMENT ON COLUMN public.contacts.category IS
  'ICP category for web-researched contacts; NULL allowed for GHL imports.';
COMMENT ON COLUMN public.contacts.evidence_url IS
  'Page URL where the email was found during web research.';
COMMENT ON COLUMN public.contacts.research_notes IS
  'Short provenance for web research (query, role, confidence).';
