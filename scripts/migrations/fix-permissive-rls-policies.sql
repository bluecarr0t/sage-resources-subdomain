-- Fix Security Advisor: RLS Policy Always True (0024)
-- Run in Supabase SQL Editor
--
-- Policies with USING (true) / WITH CHECK (true) apply to all roles by default.
-- Restrict them to TO service_role so only server-side (service key) can use them.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy

-- amenity-analysis
DROP POLICY IF EXISTS "Allow all operations for service role" ON "amenity-analysis";
CREATE POLICY "Allow all operations for service role"
  ON "amenity-analysis"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- audit_logs
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- chat_history
DROP POLICY IF EXISTS "Allow all chat history access for development" ON chat_history;
CREATE POLICY "Allow all chat history access for development"
  ON chat_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- managed_users
DROP POLICY IF EXISTS "Service role can insert managed users" ON managed_users;
CREATE POLICY "Service role can insert managed users"
  ON managed_users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update managed users" ON managed_users;
CREATE POLICY "Service role can update managed users"
  ON managed_users
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete managed users" ON managed_users;
CREATE POLICY "Service role can delete managed users"
  ON managed_users
  FOR DELETE
  TO service_role
  USING (true);

-- reports (local development policy - restrict to service_role)
DROP POLICY IF EXISTS "Allow all for local development" ON reports;
CREATE POLICY "Allow all for local development"
  ON reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- admin_audit_log (INSERT was effectively public without TO service_role)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON admin_audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- glamping discovery: scope INSERT/UPDATE to active managed users (not all authenticated)
DROP POLICY IF EXISTS "Allow authenticated insert" ON glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow authenticated update" ON glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow managed users insert" ON glamping_discovery_candidates;
DROP POLICY IF EXISTS "Allow managed users update" ON glamping_discovery_candidates;
CREATE POLICY "Allow managed users insert" ON glamping_discovery_candidates
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Allow managed users update" ON glamping_discovery_candidates
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow authenticated insert" ON glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow authenticated update" ON glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow managed users insert" ON glamping_discovery_processed_urls;
DROP POLICY IF EXISTS "Allow managed users update" ON glamping_discovery_processed_urls;
CREATE POLICY "Allow managed users insert" ON glamping_discovery_processed_urls
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Allow managed users update" ON glamping_discovery_processed_urls
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Allow authenticated insert" ON glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow authenticated update" ON glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow managed users insert" ON glamping_discovery_runs;
DROP POLICY IF EXISTS "Allow managed users update" ON glamping_discovery_runs;
CREATE POLICY "Allow managed users insert" ON glamping_discovery_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Allow managed users update" ON glamping_discovery_runs
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
