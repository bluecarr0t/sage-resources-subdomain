-- Persist official Bliesgau from-rate in the seasonal JSON the sync trigger reads.
-- Never write rate_avg_retail_daily_rate.

BEGIN;

UPDATE public.all_sage_data
SET
  rate_summer_weekday = '109', rate_summer_weekend = '109',
  rate_winter_weekday = '109', rate_winter_weekend = '109',
  rate_spring_weekday = '109', rate_spring_weekend = '109',
  rate_fall_weekday = '109', rate_fall_weekend = '109',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 109, 'weekend', 109),
      'spring', jsonb_build_object('weekday', 109, 'weekend', 109),
      'summer', jsonb_build_object('weekday', 109, 'weekend', 109),
      'fall', jsonb_build_object('weekday', 109, 'weekend', 109),
      'note', 'EUR room_only. Official from €109 / day / 2 people. Do not store Sage 150.'
    )
  ),
  date_updated = '2026-09-04'
WHERE id = 10999
  AND property_id = 'fd632374-df49-4287-b81c-33f07d9ac478';

COMMIT;
