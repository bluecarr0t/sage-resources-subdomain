-- Fix Security Advisor: Extension in Public (0014)
-- Run in Supabase SQL Editor
--
-- Extensions in public schema can conflict with user objects. Move to extensions schema.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

CREATE SCHEMA IF NOT EXISTS extensions;

-- Only move if pg_trgm is currently in public
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Ensure extensions schema is in search_path for new connections
-- (Supabase typically sets this; adjust database name if needed)
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET search_path = public, extensions', current_database());
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not set database search_path (may need superuser). Add extensions to search_path manually if pg_trgm functions are used.';
END $$;
