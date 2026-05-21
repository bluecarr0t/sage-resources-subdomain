-- Backfill Bukubaki Eco Surf Resort: EUR nightly rates → USD (×1.10, fx_reference_date 2026-05-21).
-- Full JSON metadata update is applied by scripts/backfill-glamping-rates-usd.ts.

UPDATE public.all_glamping_properties SET
  rate_avg_retail_daily_rate = CASE WHEN rate_avg_retail_daily_rate IS NOT NULL THEN ROUND((rate_avg_retail_daily_rate * 1.10)::numeric, 2) ELSE NULL END,
  rate_summer_weekday = CASE WHEN rate_summer_weekday IS NOT NULL THEN ROUND((rate_summer_weekday * 1.10)::numeric, 2) ELSE NULL END,
  rate_summer_weekend = CASE WHEN rate_summer_weekend IS NOT NULL THEN ROUND((rate_summer_weekend * 1.10)::numeric, 2) ELSE NULL END,
  date_updated = '2026-05-21'
WHERE property_id = '04267af0-1eb0-4fae-be23-506051ffb2ff'::uuid
  AND rate_avg_retail_daily_rate IS NOT NULL
  AND rate_avg_retail_daily_rate < 300;
