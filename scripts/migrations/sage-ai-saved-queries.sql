-- Sage AI Saved Queries
-- Stores frequently used queries for quick reuse

CREATE TABLE IF NOT EXISTS sage_ai_saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sage_ai_saved_queries_user_id ON sage_ai_saved_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_sage_ai_saved_queries_use_count ON sage_ai_saved_queries(use_count DESC);

ALTER TABLE sage_ai_saved_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved queries"
  ON sage_ai_saved_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved queries"
  ON sage_ai_saved_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved queries"
  ON sage_ai_saved_queries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved queries"
  ON sage_ai_saved_queries FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE sage_ai_saved_queries IS 'Stores saved queries for Sage AI quick reuse';
COMMENT ON COLUMN sage_ai_saved_queries.name IS 'User-provided name for the saved query';
COMMENT ON COLUMN sage_ai_saved_queries.query IS 'The actual query text';
COMMENT ON COLUMN sage_ai_saved_queries.use_count IS 'Number of times this query has been used';
