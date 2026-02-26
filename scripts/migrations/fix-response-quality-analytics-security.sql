-- Fix Security Advisor: response_quality_analytics view uses SECURITY DEFINER
-- Run in Supabase SQL Editor
--
-- SECURITY DEFINER runs the view with the owner's permissions, bypassing RLS.
-- SECURITY INVOKER (default) runs with the querying user's permissions.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

ALTER VIEW public.response_quality_analytics SET (security_invoker = on);
