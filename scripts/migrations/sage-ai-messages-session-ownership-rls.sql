-- ============================================================================
-- Tighten sage_ai_messages RLS: session ownership on write
--
-- The original INSERT/UPDATE policies only checked `auth.uid() = user_id`, so a
-- direct PostgREST call could attach messages to ANOTHER user's session as long
-- as the row carried the caller's own user_id. Those rows would be invisible to
-- the victim's SELECT (also user_id-scoped) but still occupy (session_id,
-- ordinal) slots — corrupting the target thread's ordering / unique constraint
-- and letting one admin poison another admin's saved conversation.
--
-- This migration adds a WITH CHECK requiring the row's session_id to reference a
-- session the caller owns. The app's own writes already satisfy this (the
-- sessions route verifies ownership before syncing messages), so this is
-- additive defense-in-depth and does not change legitimate behavior.
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own messages" ON sage_ai_messages;
CREATE POLICY "Users can insert their own messages"
  ON sage_ai_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM sage_ai_sessions s
      WHERE s.id = sage_ai_messages.session_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON sage_ai_messages;
CREATE POLICY "Users can update their own messages"
  ON sage_ai_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM sage_ai_sessions s
      WHERE s.id = sage_ai_messages.session_id
        AND s.user_id = auth.uid()
    )
  );
