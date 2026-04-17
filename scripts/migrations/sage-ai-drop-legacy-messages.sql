-- ============================================================================
-- Drop the legacy `sage_ai_sessions.messages` JSONB column.
--
-- Run AFTER:
--   1. `sage-ai-messages-table.sql` has created the normalized child table.
--   2. `scripts/migrate-sage-ai-sessions-to-messages.ts` has backfilled every
--      row into `sage_ai_messages`.
--   3. Application has been deployed with the code that reads/writes to the
--      child table exclusively (no legacy fallbacks).
--
-- This migration is irreversible; confirm `sage_ai_messages` has the expected
-- row counts before running in production.
-- ============================================================================

ALTER TABLE sage_ai_sessions
  DROP COLUMN IF EXISTS messages;

COMMENT ON TABLE sage_ai_sessions IS
  'Chat session metadata. Turns live in sage_ai_messages (one row per turn).';
