-- Fix Security Advisor: Function Search Path Mutable (0011)
-- Run in Supabase SQL Editor after fix-extension-in-public.sql (extensions schema + moved extensions).
--
-- Sets an explicit search_path on every public function and procedure that does not
-- already have one, so the role cannot inject a malicious search_path.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      p.proname,
      p.prokind,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
  LOOP
    IF EXISTS (
      SELECT 1
      FROM unnest(COALESCE(r.proconfig, ARRAY[]::text[])) AS c
      WHERE c LIKE 'search_path=%'
    ) THEN
      CONTINUE;
    END IF;

    IF r.prokind = 'p' THEN
      EXECUTE format(
        'ALTER PROCEDURE public.%I(%s) SET search_path TO public, extensions',
        r.proname,
        r.args
      );
    ELSE
      -- functions, aggregates, window functions
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path TO public, extensions',
        r.proname,
        r.args
      );
    END IF;

    RAISE NOTICE '%', format('Set search_path for public.%I(%s)', r.proname, r.args);
  END LOOP;
END $$;
