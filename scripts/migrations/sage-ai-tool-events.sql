-- ============================================================================
-- Sage AI per-tool telemetry
--
-- One row per tool invocation with latency and error code. Feeds a future
-- cost/performance dashboard and lets us alert on broken tools without
-- scraping application logs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sage_ai_tool_events (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_name      TEXT NOT NULL,
  latency_ms     INTEGER,
  error_code     TEXT,
  correlation_id UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sage_ai_tool_events_created_at
  ON sage_ai_tool_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sage_ai_tool_events_tool_name
  ON sage_ai_tool_events(tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sage_ai_tool_events_user_id
  ON sage_ai_tool_events(user_id, created_at DESC);

ALTER TABLE sage_ai_tool_events ENABLE ROW LEVEL SECURITY;

-- Service-role writes only; no direct client access. Admins can read via
-- server-side queries using the service role key.
DROP POLICY IF EXISTS "tool events readable by owner" ON sage_ai_tool_events;
CREATE POLICY "tool events readable by owner"
  ON sage_ai_tool_events FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE sage_ai_tool_events IS 'One row per Sage AI tool invocation. Used for per-tool error rate and latency dashboards.';
COMMENT ON COLUMN sage_ai_tool_events.error_code IS 'NULL on success; short machine code like ''quota_exceeded'', ''api_error'', ''invalid_input''.';
