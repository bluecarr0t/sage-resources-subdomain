-- Harden sensitive RLS + revoke dangerous anon/authenticated RPC EXECUTE grants.
-- Safe for localhost: Next.js admin APIs / scripts use SUPABASE_SERVICE_ROLE_KEY
-- (or SUPABASE_SECRET_KEY), which bypasses RLS. Browser clients only need
-- managed_users SELECT-own for AdminAuthGuard / LoginForm.
--
-- Apply via Supabase MCP apply_migration or SQL editor.

-- ---------------------------------------------------------------------------
-- Helper: active managed user (SECURITY DEFINER so policy checks are not
-- blocked by managed_users RLS when evaluating other tables).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_managed_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.managed_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_managed_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_managed_user() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- reports: drop open "local development" policy (service_role bypasses RLS)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for local development" ON public.reports;

-- ---------------------------------------------------------------------------
-- managed_users: mis-scoped "service role" policies were TO public
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert managed users" ON public.managed_users;
CREATE POLICY "Service role can insert managed users"
  ON public.managed_users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update managed users" ON public.managed_users;
CREATE POLICY "Service role can update managed users"
  ON public.managed_users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete managed users" ON public.managed_users;
CREATE POLICY "Service role can delete managed users"
  ON public.managed_users
  FOR DELETE
  TO service_role
  USING (true);

-- Keep SELECT-own for browser auth guards (anon key + session → authenticated)
DROP POLICY IF EXISTS "Users can view own managed_users record" ON public.managed_users;
CREATE POLICY "Users can view own managed_users record"
  ON public.managed_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- admin_audit_log: service_role only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON public.admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can select audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can select audit logs"
  ON public.admin_audit_log
  FOR SELECT
  TO service_role
  USING (true);

-- ---------------------------------------------------------------------------
-- chat_history: drop development open-all; keep own-row policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all chat history access for development" ON public.chat_history;

-- ---------------------------------------------------------------------------
-- amenity-analysis: service_role writes; managed users read
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all operations for service role" ON public."amenity-analysis";
CREATE POLICY "Allow all operations for service role"
  ON public."amenity-analysis"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public."amenity-analysis";
CREATE POLICY "Allow managed users read amenity-analysis"
  ON public."amenity-analysis"
  FOR SELECT
  TO authenticated
  USING (public.is_active_managed_user());

-- ---------------------------------------------------------------------------
-- report_embeddings / processed_documents: managed users only (not all auth)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.report_embeddings;
CREATE POLICY "Allow managed users read report_embeddings"
  ON public.report_embeddings
  FOR SELECT
  TO authenticated
  USING (public.is_active_managed_user());

DROP POLICY IF EXISTS "Authenticated users can access processed documents" ON public.processed_documents;
CREATE POLICY "Allow managed users access processed_documents"
  ON public.processed_documents
  FOR ALL
  TO authenticated
  USING (public.is_active_managed_user())
  WITH CHECK (public.is_active_managed_user());

-- ---------------------------------------------------------------------------
-- audit_logs: service_role insert only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- glamping discovery: replace open authenticated policies with managed-user
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read" ON public.glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow managed users read" ON public.glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow managed users insert" ON public.glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow managed users update" ON public.glamping_discovery_candidates;
CREATE POLICY "Allow managed users read" ON public.glamping_discovery_candidates
  FOR SELECT TO authenticated USING (public.is_active_managed_user());
CREATE POLICY "Allow managed users insert" ON public.glamping_discovery_candidates
  FOR INSERT TO authenticated WITH CHECK (public.is_active_managed_user());
CREATE POLICY "Allow managed users update" ON public.glamping_discovery_candidates
  FOR UPDATE TO authenticated
  USING (public.is_active_managed_user())
  WITH CHECK (public.is_active_managed_user());

DROP POLICY IF EXISTS "Allow authenticated read" ON public.glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow managed users read" ON public.glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow managed users insert" ON public.glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow managed users update" ON public.glamping_discovery_processed_urls;
CREATE POLICY "Allow managed users read" ON public.glamping_discovery_processed_urls
  FOR SELECT TO authenticated USING (public.is_active_managed_user());
CREATE POLICY "Allow managed users insert" ON public.glamping_discovery_processed_urls
  FOR INSERT TO authenticated WITH CHECK (public.is_active_managed_user());
CREATE POLICY "Allow managed users update" ON public.glamping_discovery_processed_urls
  FOR UPDATE TO authenticated
  USING (public.is_active_managed_user())
  WITH CHECK (public.is_active_managed_user());

DROP POLICY IF EXISTS "Allow authenticated read" ON public.glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow managed users read" ON public.glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow managed users insert" ON public.glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow managed users update" ON public.glamping_discovery_runs;
CREATE POLICY "Allow managed users read" ON public.glamping_discovery_runs
  FOR SELECT TO authenticated USING (public.is_active_managed_user());
CREATE POLICY "Allow managed users insert" ON public.glamping_discovery_runs
  FOR INSERT TO authenticated WITH CHECK (public.is_active_managed_user());
CREATE POLICY "Allow managed users update" ON public.glamping_discovery_runs
  FOR UPDATE TO authenticated
  USING (public.is_active_managed_user())
  WITH CHECK (public.is_active_managed_user());

-- ---------------------------------------------------------------------------
-- downstream_refresh_runs: enable RLS (no anon/authenticated policies)
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.downstream_refresh_runs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Revoke table privileges from anon on sensitive tables (RLS alone is not enough
-- when combined with overly broad policies; defense in depth).
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.reports FROM anon;
REVOKE ALL ON TABLE public.managed_users FROM anon;
REVOKE ALL ON TABLE public.admin_audit_log FROM anon, authenticated;
REVOKE ALL ON TABLE public.chat_history FROM anon;
REVOKE ALL ON TABLE public.report_embeddings FROM anon;
REVOKE ALL ON TABLE public.processed_documents FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;

GRANT SELECT ON TABLE public.managed_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reports TO authenticated;
GRANT SELECT, INSERT ON TABLE public.chat_history TO authenticated;
GRANT SELECT ON TABLE public.report_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.processed_documents TO authenticated;
GRANT ALL ON TABLE public.reports TO service_role;
GRANT ALL ON TABLE public.managed_users TO service_role;
GRANT ALL ON TABLE public.admin_audit_log TO service_role;
GRANT ALL ON TABLE public.chat_history TO service_role;
GRANT ALL ON TABLE public.report_embeddings TO service_role;
GRANT ALL ON TABLE public.processed_documents TO service_role;
GRANT ALL ON TABLE public.audit_logs TO service_role;

-- ---------------------------------------------------------------------------
-- RPC EXECUTE: revoke from PUBLIC/anon/authenticated; keep service_role
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'search_reports',
        'get_report_with_sections',
        'get_reports_by_stage',
        'soft_delete_report',
        'restore_report',
        'match_report_embeddings',
        'get_processing_queue',
        'search_knowledge_base',
        'search_knowledge_base_simple',
        'search_processed_documents',
        'get_citations_from_document',
        'refresh_unified_comps',
        'refresh_unified_comps_concurrently',
        'search_comparables_fuzzy',
        'search_unified_comps_fuzzy',
        'unified_comps_aggregate_counts',
        'unified_comps_facets',
        'unified_comps_geo_marker_counts',
        'unified_comps_list_properties',
        'get_glamping_metrics',
        'get_missing_fields_breakdown',
        'count_verified_gated_leads',
        'rank_verified_gated_lead'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Trigger helpers: never expose via PostgREST to anon/authenticated
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('handle_new_user', 'log_changes')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;

-- NOTE (follow-up migration applied 2026-08-10):
-- get_glamping_metrics / get_missing_fields_breakdown were updated to allow
-- auth.role() = 'service_role' in addition to managed-user JWTs, so admin API
-- routes using createServerClient() continue to work.
