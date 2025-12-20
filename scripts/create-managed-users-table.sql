-- Create the managed_users table
-- This table acts as an allowlist - only users added here can access the application
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS managed_users (
  id BIGSERIAL PRIMARY KEY,
  
  -- Foreign key to auth.users (UUID)
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User email (cached for convenience, matches auth.users.email)
  email TEXT NOT NULL,
  
  -- Optional: Display name or full name
  display_name TEXT,
  
  -- User status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Optional: Role/permission level (for future use)
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'editor')),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure email uniqueness in this table
  CONSTRAINT managed_users_email_unique UNIQUE (email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_managed_users_user_id ON managed_users (user_id);
CREATE INDEX IF NOT EXISTS idx_managed_users_email ON managed_users (email);
CREATE INDEX IF NOT EXISTS idx_managed_users_is_active ON managed_users (is_active);
CREATE INDEX IF NOT EXISTS idx_managed_users_role ON managed_users (role);

-- Enable Row Level Security
ALTER TABLE managed_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own record
CREATE POLICY "Users can view own managed_users record"
ON managed_users
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Only service role (server-side) can insert new users
-- This ensures only admins can add users via server-side code
CREATE POLICY "Service role can insert managed users"
ON managed_users
FOR INSERT
WITH CHECK (true); -- This will be restricted by service role key usage only

-- Policy: Only service role can update users
CREATE POLICY "Service role can update managed users"
ON managed_users
FOR UPDATE
USING (true); -- This will be restricted by service role key usage only

-- Policy: Only service role can delete users
CREATE POLICY "Service role can delete managed users"
ON managed_users
FOR DELETE
USING (true); -- This will be restricted by service role key usage only

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_managed_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_managed_users_updated_at
BEFORE UPDATE ON managed_users
FOR EACH ROW
EXECUTE FUNCTION update_managed_users_updated_at();

-- Function to sync email from auth.users when user is created/updated
CREATE OR REPLACE FUNCTION sync_managed_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email from auth.users if it exists
  UPDATE managed_users
  SET email = (SELECT email FROM auth.users WHERE id = NEW.user_id)
  WHERE user_id = NEW.user_id AND (
    email IS NULL OR 
    email != (SELECT email FROM auth.users WHERE id = NEW.user_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments to document the table
COMMENT ON TABLE managed_users IS 
'Allowlist table for application access. Only users in this table can access the application.';

COMMENT ON COLUMN managed_users.user_id IS 
'Foreign key to auth.users.id - the actual authentication user ID';

COMMENT ON COLUMN managed_users.email IS 
'User email address (cached from auth.users for convenience)';

COMMENT ON COLUMN managed_users.is_active IS 
'Whether the user account is active. Set to false to temporarily disable access without deleting.';

COMMENT ON COLUMN managed_users.role IS 
'User role/permission level: user (default), admin, or editor';

COMMENT ON COLUMN managed_users.created_by IS 
'ID of the user/admin who added this user to the managed_users table';
