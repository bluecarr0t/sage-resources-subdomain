-- Move OTA listing URLs out of `url` (website) into ota_url_* columns; leave website blank.
-- Applies to Hipcamp, Airbnb, and Booking.com hosts only. Official operator sites stay in `url`.

BEGIN;

-- Ensure OTA columns exist (no-op if add-property-ota-listings already ran)
ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS property_ota_platforms text[] NULL,
  ADD COLUMN IF NOT EXISTS ota_url_hipcamp text NULL,
  ADD COLUMN IF NOT EXISTS ota_url_airbnb text NULL,
  ADD COLUMN IF NOT EXISTS ota_url_booking_com text NULL;

-- Hipcamp: copy website URL → ota_url_hipcamp, clear url
UPDATE public.all_glamping_properties
SET
  ota_url_hipcamp = trim(url),
  property_ota_platforms = (
    SELECT array_agg(DISTINCT x ORDER BY x)
    FROM unnest(
      COALESCE(property_ota_platforms, ARRAY[]::text[]) || ARRAY['hipcamp']::text[]
    ) AS x
  ),
  url = NULL
WHERE url IS NOT NULL
  AND trim(url) <> ''
  AND (
    url ILIKE '%://%.hipcamp.%'
    OR url ILIKE '%://hipcamp.%'
  );

-- Airbnb
UPDATE public.all_glamping_properties
SET
  ota_url_airbnb = trim(url),
  property_ota_platforms = (
    SELECT array_agg(DISTINCT x ORDER BY x)
    FROM unnest(
      COALESCE(property_ota_platforms, ARRAY[]::text[]) || ARRAY['airbnb']::text[]
    ) AS x
  ),
  url = NULL
WHERE url IS NOT NULL
  AND trim(url) <> ''
  AND (
    url ILIKE '%://%.airbnb.%'
    OR url ILIKE '%://airbnb.%'
  );

-- Booking.com
UPDATE public.all_glamping_properties
SET
  ota_url_booking_com = trim(url),
  property_ota_platforms = (
    SELECT array_agg(DISTINCT x ORDER BY x)
    FROM unnest(
      COALESCE(property_ota_platforms, ARRAY[]::text[]) || ARRAY['booking_com']::text[]
    ) AS x
  ),
  url = NULL
WHERE url IS NOT NULL
  AND trim(url) <> ''
  AND url ILIKE '%booking.com%';

COMMIT;
