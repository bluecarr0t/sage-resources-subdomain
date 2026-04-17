-- Admin Audit Log
-- Run in Supabase SQL Editor
-- Tracks uploads, edits, deletes, and downloads for compliance and security

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Who performed the action (null for internal/bulk operations)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,

  -- What was done
  action TEXT NOT NULL CHECK (action IN ('upload', 'edit', 'delete', 'download', 're_extract')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('report', 'study')),
  resource_id TEXT NOT NULL,
  study_id TEXT,

  -- Optional context (file count, field names, etc.)
  details JSONB DEFAULT '{}',

  -- Request context
  ip_address TEXT,
  user_agent TEXT,
  source TEXT CHECK (source IN ('session', 'internal_api'))
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON admin_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON admin_audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_study_id ON admin_audit_log (study_id);

-- RLS: Only service role can insert; managed users can read via API
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit logs"
ON admin_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can select audit logs"
ON admin_audit_log
FOR SELECT
USING (true);

COMMENT ON TABLE admin_audit_log IS 'Audit trail for admin actions: uploads, edits, deletes, downloads';
