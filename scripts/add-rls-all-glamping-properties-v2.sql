-- Row Level Security (RLS) for all_glamping_properties
-- Run this SQL in your Supabase SQL Editor
--
-- Architecture:
-- - Public API uses service role (bypasses RLS) and filters columns via lib/property-column-privacy.ts
-- - Admin UI uses client Supabase with managed user session (respects RLS)
-- - Upload scripts use service role (bypasses RLS)
-- - Anonymous users have NO direct table access; they get data only via API routes

-- Enable RLS
ALTER TABLE "all_glamping_properties" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for idempotent re-runs)
DROP POLICY IF EXISTS "Allow public read access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users full read access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow authenticated full access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow service role full access" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users select" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users insert" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users update" ON "all_glamping_properties";
DROP POLICY IF EXISTS "Allow managed users delete" ON "all_glamping_properties";

-- SELECT: Only active managed users (for Admin UI)
CREATE POLICY "Allow managed users select"
  ON "all_glamping_properties"
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT: Only active managed users (admin/editor adding new properties)
CREATE POLICY "Allow managed users insert"
  ON "all_glamping_properties"
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- UPDATE: Only active managed users (admin/editor editing properties)
CREATE POLICY "Allow managed users update"
  ON "all_glamping_properties"
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- DELETE: Only active managed users (admin/editor removing properties)
CREATE POLICY "Allow managed users delete"
  ON "all_glamping_properties"
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Note: Service role (SUPABASE_SECRET_KEY) bypasses RLS by default.
-- No policy needed for upload scripts or API routes that use the service role.
