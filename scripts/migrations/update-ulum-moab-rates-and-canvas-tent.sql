-- ============================================================================
-- Sage data: ULUM Moab — single inventory line aligned with public footprint
-- (~50 suite tents, La Sal UT) and web-published retail anchors.
--
-- - Consolidates duplicate rows (keeps id 10286, removes id 10615).
-- - unit_type -> Canvas Tent (per product request).
-- - All eight season rate columns set to 604 so Postgres trigger
--   calc_avg_retail_daily_rate() sets rate_avg_retail_daily_rate = 604
--   (matches NPR / lodge pages "starting at $604" for Suite Tent).
-- - Canonical address/city for the resort (La Sal, not duplicate Moab row).
--
-- Apply: psql $DATABASE_URL -f this file
-- ============================================================================

UPDATE all_glamping_properties
SET
  property_name     = 'ULUM Moab',
  site_name         = 'Suite Tent',
  slug              = 'ulum-moab',
  address           = '147 S Looking Glass Rd',
  city              = 'La Sal',
  state             = 'UT',
  country           = 'USA',
  unit_type         = 'Canvas Tent',
  quantity_of_units = '50',
  rate_avg_retail_daily_rate = '604',
  rate_spring_weekday         = '604',
  rate_spring_weekend         = '604',
  rate_summer_weekday         = '604',
  rate_summer_weekend         = '604',
  rate_fall_weekday           = '604',
  rate_fall_weekend           = '604',
  rate_winter_weekday        = '604',
  rate_winter_weekend        = '604',
  year_site_opened           = '2023',
  number_of_locations        = '1',
  date_updated               = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10286;

DELETE FROM all_glamping_properties WHERE id = 10615;
