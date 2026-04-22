-- ============================================================================
-- DEPRECATED: Sage AI Execute Read-Only SQL Function
--
-- This file previously defined `execute_readonly_sql(TEXT)` — a SECURITY
-- DEFINER plpgsql function that built dynamic SQL via string concatenation
-- with only a starts_with('select') + keyword regex guard. That guard is
-- bypassable (e.g. via UTF-8 tricks, comments, CTEs, set-returning subqueries
-- on RLS-protected tables) and would have read through RLS by virtue of the
-- definer privileges.
--
-- It is no longer called from TypeScript (the `execute_safe_sql` tool was
-- removed in PR #X — see __tests__/lib/sage-ai/tools.test.ts). To prevent
-- accidental reintroduction, the body has been replaced with an explicit drop
-- and the actual cleanup is handled in
-- `sage-ai-drop-execute-readonly-sql.sql`.
-- ============================================================================

REVOKE ALL ON FUNCTION public.execute_readonly_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_readonly_sql(TEXT) FROM authenticated;
DROP FUNCTION IF EXISTS public.execute_readonly_sql(TEXT);
