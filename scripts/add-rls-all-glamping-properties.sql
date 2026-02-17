-- Enable Row Level Security and add policies for all_glamping_properties
-- Run this SQL in your Supabase SQL Editor
--
-- Column privacy: Private columns are stripped in the API layer (see lib/property-column-privacy.ts).
-- RLS controls who can access the table directly. The public API uses the service role (bypasses RLS)
-- and filters columns before returning. Admin uses client supabase with managed user session.

-- Enable RLS
ALTER TABLE "all_glamping_properties" ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if upgrading from public read
DROP POLICY IF EXISTS "Allow public read access" ON "all_glamping_properties";

-- Allow authenticated managed users full read access (for AdminColumnsView)
-- Anonymous users get data only via the API route, which filters private columns
CREATE POLICY "Allow managed users full read access" ON "all_glamping_properties"
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
