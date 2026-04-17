-- ============================================================================
-- Sage AI per-message feedback
--
-- Captures thumbs up/down votes on individual assistant messages so we can
-- compute a response-quality signal and surface repeat offenders without
-- combing through chat history by hand.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sage_ai_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sage_ai_sessions(id) ON DELETE CASCADE,
  message_id  TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment     TEXT,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sage_ai_feedback_session
  ON sage_ai_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_sage_ai_feedback_user
  ON sage_ai_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sage_ai_feedback_rating
  ON sage_ai_feedback(rating, created_at DESC);

CREATE OR REPLACE FUNCTION sage_ai_feedback_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sage_ai_feedback_updated_at ON sage_ai_feedback;
CREATE TRIGGER trg_sage_ai_feedback_updated_at
  BEFORE UPDATE ON sage_ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION sage_ai_feedback_touch_updated_at();

ALTER TABLE sage_ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback readable by owner" ON sage_ai_feedback;
CREATE POLICY "feedback readable by owner"
  ON sage_ai_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback writable by owner" ON sage_ai_feedback;
CREATE POLICY "feedback writable by owner"
  ON sage_ai_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback updatable by owner" ON sage_ai_feedback;
CREATE POLICY "feedback updatable by owner"
  ON sage_ai_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback deletable by owner" ON sage_ai_feedback;
CREATE POLICY "feedback deletable by owner"
  ON sage_ai_feedback FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE sage_ai_feedback IS 'Thumbs up/down votes on individual Sage AI assistant messages.';
COMMENT ON COLUMN sage_ai_feedback.rating IS '+1 for thumbs up, -1 for thumbs down.';
