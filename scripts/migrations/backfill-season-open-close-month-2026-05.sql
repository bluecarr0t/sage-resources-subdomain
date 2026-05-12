-- ============================================================================
-- Backfill `season_open_month` / `season_close_month` for the 5 headline
-- glamping chains. Sources (retrieved 2026-05-06):
--   Under Canvas:    https://www.undercanvas.com/camps/   (per-camp dates)
--   AutoCamp:        https://autocamp.com/                (year-round brand)
--   Huttopia US:     https://americas.huttopia.com/en/    (per-site dates)
--   Wander Camp:     https://thewandercamp.com/, https://www.usparklodging.com/
--                    (Yellowstone mid-May–late Sep, Grand Canyon mid-Apr–late Oct,
--                     Bryce Canyon late Apr–late Oct; remote camps default to
--                     spring–fall window matched to park access)
--   Postcard Cabins: https://getaway.house/about         (year-round, AC + heat)
--
-- Convention:
--   open=1, close=12 → explicitly year-round (use this for AutoCamp / Postcard
--   Cabins so analytics can distinguish "year-round" from "unknown").
--   open=NULL, close=NULL → unknown (treat as year-round in queries).
--   open<close → contiguous calendar window in one year.
-- ============================================================================

BEGIN;

-- Under Canvas (verified per camp 2026 windows from undercanvas.com)
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name = 'Under Canvas Acadia';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 9
  WHERE property_name = 'Under Canvas Bryce Canyon';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 10
  WHERE property_name = 'Under Canvas Columbia River Gorge';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 9
  WHERE property_name = 'Under Canvas Glacier';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 10
  WHERE property_name = 'Under Canvas Grand Canyon';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 11
  WHERE property_name = 'Under Canvas Great Smoky Mountains';
UPDATE all_glamping_properties SET season_open_month = 3, season_close_month = 10
  WHERE property_name ILIKE 'Under Canvas Lake Powell%';
UPDATE all_glamping_properties SET season_open_month = 3, season_close_month = 11
  WHERE property_name = 'Under Canvas Moab';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 9
  WHERE property_name = 'Under Canvas Mount Rushmore';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name ILIKE 'Under Canvas North Yellowstone%';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 9
  WHERE property_name = 'Under Canvas West Yellowstone';
UPDATE all_glamping_properties SET season_open_month = 6, season_close_month = 10
  WHERE property_name = 'Under Canvas White Mountains';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 10
  WHERE property_name = 'Under Canvas Yosemite';
UPDATE all_glamping_properties SET season_open_month = 3, season_close_month = 11
  WHERE property_name = 'Under Canvas Zion';

-- AutoCamp: brand operates year-round across all locations (heat + AC, hotel
-- rate cards every month). Explicitly mark as year-round.
UPDATE all_glamping_properties SET season_open_month = 1, season_close_month = 12
  WHERE lower(public.sage_chain_label_from_property_name(property_name)) = 'autocamp';

-- Postcard Cabins: brand-marketed as year-round (heat + AC in cabins,
-- seasonal copy for fall/winter/spring/summer).
UPDATE all_glamping_properties SET season_open_month = 1, season_close_month = 12
  WHERE lower(public.sage_chain_label_from_property_name(property_name)) = 'postcard cabins';

-- Huttopia US (verified per-site from americas.huttopia.com)
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name = 'Huttopia Adirondacks';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name = 'Huttopia Berkshires';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name = 'Huttopia Southern Maine';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name = 'Huttopia White Mountains';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 11
  WHERE property_name = 'Huttopia Wine Country';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 11
  WHERE property_name = 'Huttopia Paradise Springs';
-- Quebec sites: brand norm is May–October.
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name = 'Huttopia Sutton';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 10
  WHERE property_name = 'Huttopia Les Deux Lacs – Laurentides';

-- Wander Camp (verified for Yellowstone, Grand Canyon, Bryce; conservative
-- defaults for the other off-grid camps based on park access months).
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 9
  WHERE property_name = 'Wander Camp Yellowstone';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 10
  WHERE property_name = 'Wander Camp Grand Canyon';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 10
  WHERE property_name = 'Wander Camp Bryce Canyon';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 9
  WHERE property_name = 'Wander Camp Bear Lake';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 9
  WHERE property_name = 'Wander Camp Glacier';
UPDATE all_glamping_properties SET season_open_month = 5, season_close_month = 9
  WHERE property_name = 'Wander Camp Olympic';
UPDATE all_glamping_properties SET season_open_month = 4, season_close_month = 10
  WHERE property_name = 'Wander Camp Smoky Mountains';
-- Wander Camp Canyonlands is marked closed — leave season columns NULL.

COMMIT;
