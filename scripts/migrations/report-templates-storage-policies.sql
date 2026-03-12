-- Storage RLS policies for report-templates bucket
-- Run in Supabase SQL Editor
--
-- Templates are shared (not per-user). Managed users can read all templates.
-- Insert/update/delete allowed for managed users (used by upload script and future admin UI).
-- API routes use service role (bypasses RLS).

DROP POLICY IF EXISTS "report-templates: managed users select" ON storage.objects;
DROP POLICY IF EXISTS "report-templates: managed users insert" ON storage.objects;
DROP POLICY IF EXISTS "report-templates: managed users update" ON storage.objects;
DROP POLICY IF EXISTS "report-templates: managed users delete" ON storage.objects;

CREATE POLICY "report-templates: managed users select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "report-templates: managed users insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "report-templates: managed users update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "report-templates: managed users delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-templates')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
