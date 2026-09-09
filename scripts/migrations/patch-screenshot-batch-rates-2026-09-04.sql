-- Restore seasonal rate cells for confirmed from-rates.
-- Trigger sync_season_rates_from_latest_year nulls columns when jsonb has only a note.

BEGIN;

UPDATE public.all_sage_data
SET
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 160, 'weekend', 215),
      'spring', jsonb_build_object('weekday', 165, 'weekend', 260),
      'summer', jsonb_build_object('weekday', 180, 'weekend', 335),
      'fall', jsonb_build_object('weekday', 197, 'weekend', 325),
      'note', 'GBP room_only from harvestmoonholidays.com/prices-availability/. Stay packages converted to nightly (midweek/3n, weekend/2n).'
    )
  )
WHERE property_id = '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac';

UPDATE public.all_sage_data
SET
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 295, 'weekend', 325),
      'spring', jsonb_build_object('weekday', 295, 'weekend', 325),
      'summer', jsonb_build_object('weekday', 295, 'weekend', 325),
      'fall', jsonb_build_object('weekday', 295, 'weekend', 325),
      'note', 'CAD room_only. NovaScotia.com $295–$325/night.'
    )
  )
WHERE id = 13032 AND property_id = '11988caa-9154-47a0-9f6a-6f58d26eba57';

UPDATE public.all_sage_data
SET
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 24, 'weekend', 24),
      'spring', jsonb_build_object('weekday', 24, 'weekend', 24),
      'summer', jsonb_build_object('weekday', 24, 'weekend', 24),
      'fall', jsonb_build_object('weekday', 24, 'weekend', 24),
      'note', 'EUR room_only. Operator pitch from €24.'
    )
  )
WHERE id = 11197 AND property_id = '688c9e8b-8d90-4893-ab24-a1ec92048e94';

UPDATE public.all_sage_data
SET
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 270, 'weekend', 270),
      'spring', jsonb_build_object('weekday', 270, 'weekend', 270),
      'summer', jsonb_build_object('weekday', 270, 'weekend', 270),
      'fall', jsonb_build_object('weekday', 270, 'weekend', 270),
      'note', 'EUR breakfast. Operator double from €270 (entry treehouse).'
    )
  )
WHERE id = 11003 AND property_id = '40279bf4-a620-4ec1-acbb-a19b0aa05b67';

UPDATE public.all_sage_data
SET
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 245, 'weekend', 245),
      'spring', jsonb_build_object('weekday', 245, 'weekend', 245),
      'summer', jsonb_build_object('weekday', 245, 'weekend', 245),
      'fall', jsonb_build_object('weekday', 245, 'weekend', 245),
      'note', 'EUR breakfast. Operator See-Lodge double €245 / single €195.'
    )
  )
WHERE site_name = 'See-Lodge'
  AND property_id = '40279bf4-a620-4ec1-acbb-a19b0aa05b67';

UPDATE public.all_sage_data
SET
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 414, 'weekend', 414),
      'spring', jsonb_build_object('weekday', 414, 'weekend', 414),
      'summer', jsonb_build_object('weekday', 414, 'weekend', 414),
      'fall', jsonb_build_object('weekday', 414, 'weekend', 414),
      'note', 'USD all_inclusive. KAYAK avg ~$414 sample.'
    )
  )
WHERE id = 142 AND property_id = '3fd0c119-c0b4-4ed7-a956-8979a5b2b5da';

COMMIT;
