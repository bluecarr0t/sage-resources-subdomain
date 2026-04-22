-- Fix 9 rows in all_glamping_properties whose lat/lon and/or state
-- did not match each other. Identified by:
--   scripts/audit-geo-sanity-glamping-properties.ts
--
-- Sources for new coordinates:
--   - Under Canvas White Mountains (Dalton, NH): Nominatim/OSM lookup of
--     Blakslee Road, Dalton, NH (osm relation way 18833860)
--   - AutoCamp Hill Country (Fredericksburg, TX): Google Maps location for
--     7041 N State Hwy 16, Fredericksburg, TX 78624 (teneohg.com listing)
--   - Deerpath Cabins (Ringtown, PA): Nominatim centroid for Ringtown
--     village (PA 17967); rural Farmers Rd not in OSM
--   - Moonlite Canopy: lat/lon already correct (Belmont, MB area). Phone
--     area code 204 + moonlitcanopy.com confirm Manitoba (not BC).
--   - Glamping Resorts - Castle Provincial Park: lat/lon already correct
--     (southern Alberta, Beaver Mines area). Park is in Alberta, not SK.
--
-- Run in the Supabase SQL editor or via the apply-script in
-- scripts/apply-fix-mistagged-geo-rows.ts.

BEGIN;

-- 1. Deerpath Cabins (3 rows) - lat/lon was set to eastern Tennessee
UPDATE public.all_glamping_properties
SET lat = 40.8587, lon = -76.2297
WHERE id IN (10519, 10520, 10521)
  AND property_name = 'Deerpath Cabins'
  AND state = 'PA';

-- 2. Under Canvas White Mountains (2 rows) - lat/lon was set to eastern Tennessee
UPDATE public.all_glamping_properties
SET lat = 44.3981, lon = -71.6622
WHERE id IN (9515, 9751)
  AND property_name = 'Under Canvas White Mountains'
  AND state = 'NH';

-- 3. AutoCamp Hill Country (1 row) - lat/lon was set to southern California
UPDATE public.all_glamping_properties
SET lat = 30.3791, lon = -98.7826
WHERE id = 9514
  AND property_name = 'AutoCamp Hill Country'
  AND state = 'TX';

-- 4. Moonlite Canopy (1 row) - lat/lon is correct, state was wrong (BC -> MB)
UPDATE public.all_glamping_properties
SET state = 'MB'
WHERE id = 10721
  AND property_name = 'Moonlite Canopy'
  AND state = 'BC';

-- 5. Glamping Resorts - Castle Provincial Park (2 rows) - lat/lon is correct,
--    state was wrong (SK -> AB), and city was wrong/non-specific
UPDATE public.all_glamping_properties
SET state = 'AB', city = 'Beaver Mines'
WHERE id IN (10779, 10781)
  AND property_name = 'Glamping Resorts - Castle Provincial Park'
  AND state = 'SK';

COMMIT;

-- Verification queries (run after the COMMIT):
-- SELECT id, property_name, city, state, country, lat, lon
-- FROM public.all_glamping_properties
-- WHERE id IN (9514, 9515, 9751, 10519, 10520, 10521, 10721, 10779, 10781)
-- ORDER BY id;
