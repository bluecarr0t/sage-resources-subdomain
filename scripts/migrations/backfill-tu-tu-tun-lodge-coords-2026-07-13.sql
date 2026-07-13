-- Backfill missing coordinates for Tu Tu' Tun Lodge (Gold Beach, OR).
-- Source: Google Maps place pin for "Tu Tu' Tun Lodge"
--   https://www.google.com/maps/place/Tu+Tu'+Tun+Lodge/@42.4748862,-124.3367657,17z
-- Address on row: 96550 North Bank Rogue River Road, Gold Beach, OR

UPDATE public.all_sage_data
SET
  lat = 42.4748862,
  lon = -124.3367657,
  date_updated = '2026-07-13'
WHERE id = 13095
  AND property_name = 'Tu Tu'' Tun Lodge'
  AND lat IS NULL
  AND lon IS NULL;
