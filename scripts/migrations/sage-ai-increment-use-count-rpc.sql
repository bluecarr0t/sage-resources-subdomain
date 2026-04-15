-- Atomic increment for sage_ai_saved_queries.use_count
-- Avoids the read-then-update race condition
CREATE OR REPLACE FUNCTION increment_saved_query_use_count(
  query_id UUID,
  owner_id UUID
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE sage_ai_saved_queries
  SET use_count = use_count + 1,
      updated_at = now()
  WHERE id = query_id
    AND user_id = owner_id;
$$;
