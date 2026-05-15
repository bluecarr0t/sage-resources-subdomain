-- Glamping property images: metadata + Storage bucket/policies
-- Run in Supabase SQL Editor (or your migration runner).
--
-- Bucket: glamping-media (public reads via URL; writes restricted to managed users).
-- Table: glamping_property_images → FK all_glamping_properties(id) ON DELETE CASCADE.
-- Admin API uses SUPABASE_SECRET_KEY (service role, bypasses RLS); policies protect direct client access.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.glamping_property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id BIGINT NOT NULL REFERENCES public.all_glamping_properties (id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'glamping-media',
  storage_path TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('hero', 'gallery', 'map_thumb', 'evidence')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NULL,
  byte_size BIGINT NULL,
  width INTEGER NULL,
  height INTEGER NULL,
  source TEXT NULL,
  content_hash TEXT NULL,
  caption TEXT NULL,
  site_label TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS glamping_property_images_property_id_idx
  ON public.glamping_property_images (property_id);

CREATE INDEX IF NOT EXISTS glamping_property_images_property_sort_idx
  ON public.glamping_property_images (property_id, sort_order ASC, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS glamping_property_images_one_hero_per_property
  ON public.glamping_property_images (property_id)
  WHERE kind = 'hero';

COMMENT ON TABLE public.glamping_property_images IS
  'Image metadata for Sage glamping rows; files live in Storage (storage_bucket + storage_path).';

-- ---------------------------------------------------------------------------
-- RLS (managed users — same pattern as CCE catalog / all_roverpass_data_new)
-- ---------------------------------------------------------------------------
ALTER TABLE public.glamping_property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "glamping_property_images: managed users select" ON public.glamping_property_images;
DROP POLICY IF EXISTS "glamping_property_images: managed users insert" ON public.glamping_property_images;
DROP POLICY IF EXISTS "glamping_property_images: managed users update" ON public.glamping_property_images;
DROP POLICY IF EXISTS "glamping_property_images: managed users delete" ON public.glamping_property_images;

CREATE POLICY "glamping_property_images: managed users select"
  ON public.glamping_property_images
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "glamping_property_images: managed users insert"
  ON public.glamping_property_images
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "glamping_property_images: managed users update"
  ON public.glamping_property_images
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "glamping_property_images: managed users delete"
  ON public.glamping_property_images
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.glamping_property_images TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- Storage bucket (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'glamping-media',
  'glamping-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage object policies (defense in depth; service role bypasses)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "glamping-media: managed users select" ON storage.objects;
DROP POLICY IF EXISTS "glamping-media: managed users insert" ON storage.objects;
DROP POLICY IF EXISTS "glamping-media: managed users update" ON storage.objects;
DROP POLICY IF EXISTS "glamping-media: managed users delete" ON storage.objects;

CREATE POLICY "glamping-media: managed users select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'glamping-media')
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "glamping-media: managed users insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'glamping-media')
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "glamping-media: managed users update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'glamping-media')
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'glamping-media')
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "glamping-media: managed users delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = (SELECT id FROM storage.buckets WHERE name = 'glamping-media')
    AND EXISTS (
      SELECT 1 FROM public.managed_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
