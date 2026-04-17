-- ============================================================================
-- Sage AI messages child table
--
-- Splits message storage out of the `sage_ai_sessions.messages` JSONB column
-- into a normalized child table so we can diff-upsert on each turn instead
-- of rewriting the full conversation blob on every request.
--
-- The legacy column is kept for one release so reads can fall back; a
-- follow-up migration (sage-ai-drop-legacy-messages.sql) drops it.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sage_ai_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sage_ai_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordinal     INTEGER NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts       JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_sage_ai_messages_session_ordinal
  ON sage_ai_messages(session_id, ordinal);

CREATE INDEX IF NOT EXISTS idx_sage_ai_messages_user_id
  ON sage_ai_messages(user_id);

ALTER TABLE sage_ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON sage_ai_messages;
CREATE POLICY "Users can view their own messages"
  ON sage_ai_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON sage_ai_messages;
CREATE POLICY "Users can insert their own messages"
  ON sage_ai_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own messages" ON sage_ai_messages;
CREATE POLICY "Users can update their own messages"
  ON sage_ai_messages FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON sage_ai_messages;
CREATE POLICY "Users can delete their own messages"
  ON sage_ai_messages FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE sage_ai_messages IS 'Normalized chat-turn storage for Sage AI sessions. One row per message; ordered by (session_id, ordinal).';
COMMENT ON COLUMN sage_ai_messages.parts IS 'Array of parts in AI SDK UI message format (text, tool-*, etc).';
