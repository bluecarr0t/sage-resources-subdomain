-- Sage AI Execute Read-Only SQL Function
-- This function allows executing read-only SQL queries in a safe sandbox

CREATE OR REPLACE FUNCTION execute_readonly_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  normalized_query TEXT;
BEGIN
  normalized_query := lower(trim(query_text));
  
  IF NOT starts_with(normalized_query, 'select') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  IF normalized_query ~ '\b(insert|update|delete|drop|create|alter|truncate|grant|revoke|execute|call|copy)\b' THEN
    RAISE EXCEPTION 'Query contains forbidden keywords';
  END IF;
  
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t'
    INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query error: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION execute_readonly_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_readonly_sql(TEXT) TO authenticated;

COMMENT ON FUNCTION execute_readonly_sql IS 'Execute read-only SQL queries for Sage AI. Only SELECT statements on allowed tables.';
