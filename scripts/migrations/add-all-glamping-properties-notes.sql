-- Internal / admin free-text notes per property (Sage Data editor, not public copy).
-- Run against production/staging: psql, Supabase SQL editor, or your migration pipeline.

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;

COMMENT ON COLUMN public.all_glamping_properties.notes IS
  'Internal research or editorial notes. Distinct from description (public-facing copy).';
