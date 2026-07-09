-- Sage AI thread summarization columns on sessions.
-- Stores a rolling Haiku-generated summary of older turns so long threads
-- retain context without shipping full tool JSON in every chat request.

ALTER TABLE sage_ai_sessions
  ADD COLUMN IF NOT EXISTS thread_summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_through_message_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN sage_ai_sessions.thread_summary IS 'Rolling summary of older chat turns (messages before the recent window)';
COMMENT ON COLUMN sage_ai_sessions.summary_through_message_count IS 'Number of leading messages folded into thread_summary';
