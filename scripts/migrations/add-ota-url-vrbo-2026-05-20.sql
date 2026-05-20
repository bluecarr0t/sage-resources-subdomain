-- Add Vrbo third-party listing URL column and backfill from legacy `url` when host is Vrbo/HomeAway.

BEGIN;

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS ota_url_vrbo text NULL;

COMMENT ON COLUMN public.all_glamping_properties.ota_url_vrbo IS
  'Vrbo (or legacy HomeAway) listing page URL; official operator site stays in `url`.';

UPDATE public.all_glamping_properties
SET
  ota_url_vrbo = trim(url),
  third_party_platforms = (
    SELECT array_agg(DISTINCT x ORDER BY x)
    FROM unnest(
      COALESCE(third_party_platforms, ARRAY[]::text[]) || ARRAY['vrbo']::text[]
    ) AS x
  ),
  url = NULL
WHERE url IS NOT NULL
  AND trim(url) <> ''
  AND (
    url ILIKE '%://%.vrbo.%'
    OR url ILIKE '%://vrbo.%'
    OR url ILIKE '%homeaway.%'
  )
  AND (ota_url_vrbo IS NULL OR trim(ota_url_vrbo) = '');

COMMIT;
