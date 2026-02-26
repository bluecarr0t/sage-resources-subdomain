-- Storage RLS policies for report-uploads bucket
-- Run in Supabase SQL Editor
--
-- Restricts access to authenticated managed users only.
-- Path structure: {reportId}/workbooks/{file} or {reportId}/narrative.docx etc.
-- Users can only access files in report folders they own (reports.user_id = auth.uid()).
--
-- Note: API routes use service role (bypasses RLS). These policies protect
-- direct client access and provide defense-in-depth.

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "report-uploads: managed users select" ON storage.objects;
DROP POLICY IF EXISTS "report-uploads: managed users insert" ON storage.objects;
DROP POLICY IF EXISTS "report-uploads: managed users update" ON storage.objects;
DROP POLICY IF EXISTS "report-uploads: managed users delete" ON storage.objects;

-- SELECT: Managed users can download files only for reports they own
CREATE POLICY "report-uploads: managed users select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-uploads')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM reports
      WHERE id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()::text
    )
  );

-- INSERT: Managed users can upload (API creates report before/after upload; path enforced by API)
CREATE POLICY "report-uploads: managed users insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-uploads')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- UPDATE: Managed users can overwrite (upsert) only in report folders they own
CREATE POLICY "report-uploads: managed users update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-uploads')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM reports
      WHERE id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-uploads')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM reports
      WHERE id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()::text
    )
  );

-- DELETE: Managed users can delete only in report folders they own
CREATE POLICY "report-uploads: managed users delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'report-uploads')
    AND EXISTS (
      SELECT 1 FROM managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM reports
      WHERE id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()::text
    )
  );
