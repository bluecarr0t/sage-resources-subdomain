-- ============================================================================
-- Sage AI — Drop the legacy `execute_readonly_sql` RPC.
--
-- The previous implementation built dynamic SQL via string concatenation
-- (`EXECUTE 'SELECT ... (' || query_text || ') t'`) protected only by a
-- starts_with('select') + keyword regex check. This pattern is bypassable and
-- the function ran as `SECURITY DEFINER`, allowing any caller granted EXECUTE
-- to read past RLS on the underlying tables.
--
-- The application no longer references this RPC (tests assert the related
-- `execute_safe_sql` tool was removed); ad-hoc SQL has been replaced by
-- allowlisted RPCs (`aggregate_properties_v2`, `distinct_column_values`,
-- `properties_within_radius`, `nearest_attractions_v1`,
-- `semantic_search_properties_v1`).
--
-- This migration revokes execute privileges first (defensive in case callers
-- lag the deploy) and then drops the function entirely.
-- ============================================================================

REVOKE ALL ON FUNCTION public.execute_readonly_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_readonly_sql(TEXT) FROM authenticated;
DROP FUNCTION IF EXISTS public.execute_readonly_sql(TEXT);
