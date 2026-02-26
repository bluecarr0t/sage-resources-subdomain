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
