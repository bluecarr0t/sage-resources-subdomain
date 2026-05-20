-- Phase 1: OTA listing presence + per-platform URLs on all_glamping_properties.
-- `url` = operator / official site only; OTA columns = Hipcamp, Airbnb, Booking.com listing pages.
--
-- After this file, run (if not already applied):
--   npx tsx scripts/apply-move-website-urls-to-ota-migration.ts
--   npx tsx scripts/backfill-ota-from-url.ts

BEGIN;

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS property_ota_platforms text[] NULL,
  ADD COLUMN IF NOT EXISTS ota_url_hipcamp text NULL,
  ADD COLUMN IF NOT EXISTS ota_url_airbnb text NULL,
  ADD COLUMN IF NOT EXISTS ota_url_booking_com text NULL;

CREATE INDEX IF NOT EXISTS idx_agp_property_ota_platforms_gin
  ON public.all_glamping_properties USING GIN (property_ota_platforms);

COMMENT ON COLUMN public.all_glamping_properties.property_ota_platforms IS
  'Active OTA slugs: hipcamp, airbnb, booking_com. Prefer with matching ota_url_* column.';
COMMENT ON COLUMN public.all_glamping_properties.ota_url_hipcamp IS
  'Canonical Hipcamp listing URL for this property.';
COMMENT ON COLUMN public.all_glamping_properties.ota_url_airbnb IS
  'Canonical Airbnb listing URL for this property.';
COMMENT ON COLUMN public.all_glamping_properties.ota_url_booking_com IS
  'Canonical Booking.com listing URL for this property.';

-- Collinswood Retreat: Hipcamp-only (no Google Business match)
UPDATE public.all_glamping_properties
SET
  property_ota_platforms = ARRAY['hipcamp']::text[],
  ota_url_hipcamp = 'https://www.hipcamp.com/en-CA/land/alberta-collinswood-retreat-9mxhrpew'
WHERE property_name = 'Collinswood Retreat'
  AND (ota_url_hipcamp IS NULL OR trim(ota_url_hipcamp) = '');

COMMIT;

-- Full OTA move (url → ota_url_*, clear url): scripts/migrations/move-website-urls-to-ota-columns-2026-05-20.sql
