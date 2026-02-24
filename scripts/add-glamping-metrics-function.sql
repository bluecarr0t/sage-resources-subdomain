-- Function to get glamping data metrics for admin dashboard
-- Run in Supabase SQL Editor (or run via migration)
-- Requires caller to be authenticated and in managed_users (is_active=true)

CREATE OR REPLACE FUNCTION get_glamping_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
  usa_property_count BIGINT;
  usa_unit_count BIGINT;
  total_property_count BIGINT;
  total_unit_count BIGINT;
  status_new_count BIGINT;
  status_in_progress_count BIGINT;
  status_published_count BIGINT;
  caller_uid UUID;
BEGIN
  -- Verify caller is authenticated and is a managed user
  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM managed_users
    WHERE user_id = caller_uid AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(DISTINCT property_name) INTO usa_property_count
  FROM all_glamping_properties
  WHERE UPPER(TRIM(COALESCE(country, ''))) IN ('USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA');

  SELECT COALESCE(SUM(quantity_of_units::BIGINT), 0) INTO usa_unit_count
  FROM all_glamping_properties
  WHERE UPPER(TRIM(COALESCE(country, ''))) IN ('USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA');

  SELECT COUNT(DISTINCT property_name) INTO total_property_count
  FROM all_glamping_properties;

  SELECT COALESCE(SUM(quantity_of_units::BIGINT), 0) INTO total_unit_count
  FROM all_glamping_properties;

  SELECT COUNT(DISTINCT property_name) INTO status_new_count
  FROM all_glamping_properties
  WHERE LOWER(TRIM(COALESCE(research_status, ''))) = 'new';

  SELECT COUNT(DISTINCT property_name) INTO status_in_progress_count
  FROM all_glamping_properties
  WHERE LOWER(TRIM(COALESCE(research_status, ''))) = 'in_progress';

  SELECT COUNT(DISTINCT property_name) INTO status_published_count
  FROM all_glamping_properties
  WHERE LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  result := json_build_object(
    'usa_property_count', usa_property_count,
    'usa_unit_count', usa_unit_count,
    'total_property_count', total_property_count,
    'total_unit_count', total_unit_count,
    'research_status_new', status_new_count,
    'research_status_in_progress', status_in_progress_count,
    'research_status_published', status_published_count
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
