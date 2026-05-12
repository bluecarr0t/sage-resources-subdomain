-- ============================================================================
-- AutoCamp: refresh seasonal rate_* columns from public “starting at” anchors
-- (May 2026 web research). Fills all eight cells so eff_adr / chain rollups are
-- not skewed by sparse high-summer-only cells.
--
-- Sources (retrieved 2026-05-06):
--   - Joshua Tree: https://www.nationalparkreservations.com/lodge/autocamp-joshua-tree/rooms/
--   - Yosemite:    https://www.nationalparkreservations.com/lodge/autocamp-yosemite/rooms/
--   - Zion:        https://www.nationalparkreservations.com/lodge/autocamp-zion/rooms/
--   - Sequoia:     https://www.nationalparkreservations.com/lodge/autocamp-sequoia/rooms/
--   - Hill Country: https://autocamp.com/locations/hill-country/ (coming soon;
--     anchors aligned to brand “Stay Affordably” / peer-property entry Airstream
--     tiers — no published SKU table yet).
--   - Russian River / Cape Cod / Catskills / Asheville: third-party + AutoCamp
--     location pages where NPR did not list a room grid (404).
--
-- Per-row anchor `a` = published starting rate for that SKU tier (USD).
-- Season spread (same curve every row): winter lower → summer peak → fall shoulder
--   ww_wd round(a*0.88)  ww_we round(a*0.98)  swd round(a)  swe round(a*1.08)
--   su_wd round(a*1.12)  su_we round(a*1.24)  fa_wd round(a*1.04)  fa_we round(a*1.14)
--
-- `rate_avg_retail_daily_rate` is maintained by trigger `calc_avg_retail_daily_rate`.
-- ============================================================================

UPDATE all_glamping_properties SET
  rate_winter_weekday = 246, rate_winter_weekend = 273, rate_spring_weekday = 279, rate_spring_weekend = 301,
  rate_summer_weekday = 312, rate_summer_weekend = 346, rate_fall_weekday = 290, rate_fall_weekend = 318
WHERE id = 10636;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 378, rate_winter_weekend = 421, rate_spring_weekday = 429, rate_spring_weekend = 463,
  rate_summer_weekday = 480, rate_summer_weekend = 532, rate_fall_weekday = 446, rate_fall_weekend = 489
WHERE id = 9938;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 404, rate_winter_weekend = 450, rate_spring_weekday = 459, rate_spring_weekend = 496,
  rate_summer_weekday = 514, rate_summer_weekend = 569, rate_fall_weekday = 477, rate_fall_weekend = 523
WHERE id = 9937;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 378, rate_winter_weekend = 421, rate_spring_weekday = 429, rate_spring_weekend = 463,
  rate_summer_weekday = 480, rate_summer_weekend = 532, rate_fall_weekday = 446, rate_fall_weekend = 489
WHERE id = 9939;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 316, rate_winter_weekend = 352, rate_spring_weekday = 359, rate_spring_weekend = 388,
  rate_summer_weekday = 402, rate_summer_weekend = 445, rate_fall_weekday = 374, rate_fall_weekend = 409
WHERE id = 10640;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 369, rate_winter_weekend = 411, rate_spring_weekday = 419, rate_spring_weekend = 453,
  rate_summer_weekday = 469, rate_summer_weekend = 521, rate_fall_weekday = 436, rate_fall_weekend = 478
WHERE id = 10641;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 439, rate_winter_weekend = 489, rate_spring_weekday = 499, rate_spring_weekend = 539,
  rate_summer_weekday = 559, rate_summer_weekend = 619, rate_fall_weekday = 519, rate_fall_weekend = 569
WHERE id = 10639;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 325, rate_winter_weekend = 362, rate_spring_weekday = 369, rate_spring_weekend = 399,
  rate_summer_weekday = 413, rate_summer_weekend = 458, rate_fall_weekday = 384, rate_fall_weekend = 421
WHERE id = 10094;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 510, rate_winter_weekend = 567, rate_spring_weekday = 579, rate_spring_weekend = 625,
  rate_summer_weekday = 649, rate_summer_weekend = 718, rate_fall_weekday = 602, rate_fall_weekend = 660
WHERE id = 10417;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 180, rate_winter_weekend = 200, rate_spring_weekday = 204, rate_spring_weekend = 220,
  rate_summer_weekday = 228, rate_summer_weekend = 253, rate_fall_weekday = 212, rate_fall_weekend = 233
WHERE id = 10661;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 219, rate_winter_weekend = 244, rate_spring_weekday = 249, rate_spring_weekend = 269,
  rate_summer_weekday = 279, rate_summer_weekend = 309, rate_fall_weekday = 259, rate_fall_weekend = 284
WHERE id = 9514;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 271, rate_winter_weekend = 302, rate_spring_weekday = 308, rate_spring_weekend = 333,
  rate_summer_weekday = 345, rate_summer_weekend = 382, rate_fall_weekday = 320, rate_fall_weekend = 351
WHERE id = 10635;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 229, rate_winter_weekend = 255, rate_spring_weekday = 260, rate_spring_weekend = 281,
  rate_summer_weekday = 291, rate_summer_weekend = 322, rate_fall_weekday = 270, rate_fall_weekend = 296
WHERE id = 10915;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 334, rate_winter_weekend = 372, rate_spring_weekday = 380, rate_spring_weekend = 410,
  rate_summer_weekday = 426, rate_summer_weekend = 471, rate_fall_weekday = 395, rate_fall_weekend = 433
WHERE id = 10650;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 233, rate_winter_weekend = 260, rate_spring_weekday = 265, rate_spring_weekend = 286,
  rate_summer_weekday = 297, rate_summer_weekend = 329, rate_fall_weekday = 276, rate_fall_weekend = 302
WHERE id = 10647;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 202, rate_winter_weekend = 225, rate_spring_weekday = 229, rate_spring_weekend = 247,
  rate_summer_weekday = 256, rate_summer_weekend = 284, rate_fall_weekday = 238, rate_fall_weekend = 261
WHERE id = 10141;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 342, rate_winter_weekend = 381, rate_spring_weekday = 389, rate_spring_weekend = 420,
  rate_summer_weekday = 436, rate_summer_weekend = 482, rate_fall_weekday = 405, rate_fall_weekend = 443
WHERE id = 9966;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 272, rate_winter_weekend = 303, rate_spring_weekday = 309, rate_spring_weekend = 334,
  rate_summer_weekday = 346, rate_summer_weekend = 383, rate_fall_weekday = 321, rate_fall_weekend = 352
WHERE id = 10651;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 219, rate_winter_weekend = 244, rate_spring_weekday = 249, rate_spring_weekend = 269,
  rate_summer_weekday = 279, rate_summer_weekend = 309, rate_fall_weekday = 259, rate_fall_weekend = 284
WHERE id = 10198;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 409, rate_winter_weekend = 456, rate_spring_weekday = 465, rate_spring_weekend = 502,
  rate_summer_weekday = 521, rate_summer_weekend = 577, rate_fall_weekday = 484, rate_fall_weekend = 530
WHERE id = 10015;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 166, rate_winter_weekend = 185, rate_spring_weekday = 189, rate_spring_weekend = 204,
  rate_summer_weekday = 212, rate_summer_weekend = 234, rate_fall_weekday = 197, rate_fall_weekend = 216
WHERE id = 9845;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 281, rate_winter_weekend = 313, rate_spring_weekday = 319, rate_spring_weekend = 345,
  rate_summer_weekday = 357, rate_summer_weekend = 396, rate_fall_weekday = 332, rate_fall_weekend = 364
WHERE id = 10638;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 307, rate_winter_weekend = 342, rate_spring_weekday = 349, rate_spring_weekend = 377,
  rate_summer_weekday = 391, rate_summer_weekend = 433, rate_fall_weekday = 363, rate_fall_weekend = 398
WHERE id = 10637;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 228, rate_winter_weekend = 254, rate_spring_weekday = 259, rate_spring_weekend = 280,
  rate_summer_weekday = 290, rate_summer_weekend = 321, rate_fall_weekday = 269, rate_fall_weekend = 295
WHERE id = 10093;

UPDATE all_glamping_properties SET
  rate_winter_weekday = 307, rate_winter_weekend = 342, rate_spring_weekday = 349, rate_spring_weekend = 377,
  rate_summer_weekday = 391, rate_summer_weekend = 433, rate_fall_weekday = 363, rate_fall_weekend = 398
WHERE id = 9940;
