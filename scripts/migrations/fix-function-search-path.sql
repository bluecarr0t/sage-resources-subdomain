-- Fix Security Advisor: Function Search Path Mutable (0011)
-- Run in Supabase SQL Editor
--
-- Functions without explicit search_path can be vulnerable to search_path injection.
-- This sets search_path = public for all affected functions.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

DO $$
DECLARE
  r RECORD;
  func_names TEXT[] := ARRAY[
    'generate_slug_from_name', 'calculate_response_quality_score', 'update_processed_documents_updated_at',
    'update_report_kb_embeddings', 'search_reports', 'get_reports_by_stage', 'soft_delete_report',
    'search_knowledge_base_simple', 'search_processed_documents', 'update_clients_updated_at',
    'update_google_places_data_updated_at', 'sync_unit_rates_from_jsonb', 'latest_rate_year',
    'sync_season_rates_from_latest_year', 'calc_avg_retail_daily_rate', 'get_glamping_metrics',
    'analyze_temporal_trends', 'get_occupancy_trends', 'get_processing_queue', 'get_citations_from_document',
    'get_amenity_impact_simple', 'handle_new_user', 'handle_updated_at', 'log_changes',
    'get_report_with_sections', 'restore_report', 'get_market_dashboard', 'refresh_state_summaries',
    'get_comprehensive_market_data_simple', 'update_managed_users_updated_at', 'sync_managed_user_email',
    'update_updated_at_column', 'update_reports_search_vector', 'update_processing_timestamps',
    'update_uploaded_files_updated_at', 'get_missing_fields_breakdown', 'analyze_location_factors',
    'calculate_competitive_metrics', 'get_amenity_impact_analysis', 'generate_slug_from_property_name',
    'get_competitive_positioning', 'get_comprehensive_market_data', 'search_knowledge_base',
    'transliterate_to_ascii'
  ];
  func_name TEXT;
BEGIN
  FOREACH func_name IN ARRAY func_names
  LOOP
    FOR r IN
      SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = func_name
    LOOP
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public',
        r.proname, r.args
      );
      RAISE NOTICE 'Set search_path for public.%(%)', r.proname, r.args;
    END LOOP;
  END LOOP;
END $$;
