-- Clear leftover invented Treetop rates. Official cabin is CAD 245.
-- TreePOD statics unpublished. Never write rate_avg_retail_daily_rate.

BEGIN;

UPDATE public.all_sage_data
SET
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Cleared leftover invented stub seasonal rates. Inventory/rates live on siblings.'
WHERE id = 18 AND property_id = '9fb020a7-8dfa-4208-b8fa-26180e44c114';

UPDATE public.all_sage_data
SET
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  glamping_service_tier = 'upscale',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Cleared unpublished TreePOD seasonal rates. Official statics not posted.'
WHERE id IN (10739, 10740)
  AND property_id = '9fb020a7-8dfa-4208-b8fa-26180e44c114';

UPDATE public.all_sage_data
SET
  rate_summer_weekday = '245', rate_summer_weekend = '245',
  rate_winter_weekday = '245', rate_winter_weekend = '245',
  rate_spring_weekday = '245', rate_spring_weekend = '245',
  rate_fall_weekday = '245', rate_fall_weekend = '245',
  rate_basis = 'room_only',
  glamping_service_tier = 'upscale',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Cozy Cabins official CAD 245 + tax, 2-night minimum.'
WHERE id = 10775 AND property_id = '9fb020a7-8dfa-4208-b8fa-26180e44c114';

COMMIT;
