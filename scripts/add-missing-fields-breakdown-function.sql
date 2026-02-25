-- Function to get counts of records missing key fields in all_glamping_properties
-- Run in Supabase SQL Editor
-- Requires caller to be authenticated and in managed_users (is_active=true)

CREATE OR REPLACE FUNCTION get_missing_fields_breakdown()
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_count BIGINT;
  missing_site_name BIGINT;
  missing_rate_avg_retail_daily_rate BIGINT;
  missing_unit_type BIGINT;
  missing_unit_private_bathroom BIGINT;
  missing_url BIGINT;
  missing_description BIGINT;
  caller_uid UUID;
BEGIN
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

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE site_name IS NULL OR TRIM(COALESCE(site_name, '')) = '') AS mn_site_name,
    COUNT(*) FILTER (WHERE rate_avg_retail_daily_rate IS NULL) AS mn_rate,
    COUNT(*) FILTER (WHERE unit_type IS NULL OR TRIM(COALESCE(unit_type, '')) = '') AS mn_unit_type,
    COUNT(*) FILTER (WHERE unit_private_bathroom IS NULL OR TRIM(COALESCE(unit_private_bathroom, '')) = '') AS mn_bathroom,
    COUNT(*) FILTER (WHERE url IS NULL OR TRIM(COALESCE(url, '')) = '') AS mn_url,
    COUNT(*) FILTER (WHERE description IS NULL OR TRIM(COALESCE(description, '')) = '') AS mn_desc
  INTO
    total_count,
    missing_site_name,
    missing_rate_avg_retail_daily_rate,
    missing_unit_type,
    missing_unit_private_bathroom,
    missing_url,
    missing_description
  FROM all_glamping_properties
  WHERE LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_closed, ''))) = 'no'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  result := json_build_object(
    'total_count', total_count,
    'missing_site_name', missing_site_name,
    'missing_rate_avg_retail_daily_rate', missing_rate_avg_retail_daily_rate,
    'missing_unit_type', missing_unit_type,
    'missing_unit_private_bathroom', missing_unit_private_bathroom,
    'missing_url', missing_url,
    'missing_description', missing_description
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
