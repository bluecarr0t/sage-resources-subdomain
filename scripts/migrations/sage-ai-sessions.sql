-- Sage AI Chat Sessions
-- Stores chat history for users to resume conversations

CREATE TABLE IF NOT EXISTS sage_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sage_ai_sessions_user_id ON sage_ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sage_ai_sessions_updated_at ON sage_ai_sessions(updated_at DESC);

ALTER TABLE sage_ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON sage_ai_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON sage_ai_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sage_ai_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON sage_ai_sessions FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE sage_ai_sessions IS 'Stores Sage AI chat sessions for history/resume functionality';
COMMENT ON COLUMN sage_ai_sessions.title IS 'Auto-generated or user-provided title for the session';
COMMENT ON COLUMN sage_ai_sessions.messages IS 'Array of chat messages in AI SDK format';
