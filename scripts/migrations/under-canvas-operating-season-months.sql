-- ============================================================================
-- Sage data: align Under Canvas `operating_season_months` with the brand's
-- official 2026 operating windows from https://www.undercanvas.com/camps/
-- (verified 2026-05-06).
--
-- Why this migration exists
--   Under Canvas camps are SEASONAL. The brand publishes hard open/close dates
--   per camp; the rest of the calendar the camp is *closed*, not discounted.
--   We do NOT populate fake winter/fall rate cells for closed months, because
--   no public retail rate exists for a closed camp. Instead, we record the
--   verified count of operating months per camp in `operating_season_months`,
--   so that downstream analytics (chain ADR, calendar blends, etc.) can
--   reason about seasonality correctly.
--
-- Verified 2026 windows (from undercanvas.com/camps, 2026-05-06)
--   Camp                              Open–Close (2026)         ~Months
--   Acadia                            May 7  – Oct 22           6
--   Bryce Canyon                      May 7  – Sep 28           5
--   Columbia River Gorge              Apr 23 – Oct 26           6
--   Glacier                           May 29 – Sep 14           4
--   Grand Canyon                      Apr 15 – Oct 26           6
--   Great Smoky Mountains             Apr 2  – Nov 30           8
--   Lake Powell – Grand Staircase     Mar 12 – Oct 26           8
--   Moab                              Mar 5  – Nov 1            8
--   Mount Rushmore                    Apr 30 – Sep 28           5
--   North Yellowstone – Paradise Vly  May 7  – Oct 1            5
--   West Yellowstone                  May 20 – Sep 8            4
--   White Mountains                   Jun 4  – Oct 12           4
--   Yosemite                          Apr 16 – Oct 26           6
--   Zion                              Mar 12 – Nov 8            8
--
-- This script intentionally does NOT modify any rate_* columns. Closed-season
-- rate cells stay NULL on purpose — they reflect the absence of a published
-- retail rate, not missing research.
--
-- Apply via Supabase SQL editor or:
--   psql $DATABASE_URL -f scripts/migrations/under-canvas-operating-season-months.sql
-- ============================================================================

BEGIN;

UPDATE all_glamping_properties SET operating_season_months = '6'
  WHERE property_name = 'Under Canvas Acadia';

UPDATE all_glamping_properties SET operating_season_months = '5'
  WHERE property_name = 'Under Canvas Bryce Canyon';

UPDATE all_glamping_properties SET operating_season_months = '6'
  WHERE property_name = 'Under Canvas Columbia River Gorge';

UPDATE all_glamping_properties SET operating_season_months = '4'
  WHERE property_name = 'Under Canvas Glacier';

UPDATE all_glamping_properties SET operating_season_months = '6'
  WHERE property_name = 'Under Canvas Grand Canyon';

UPDATE all_glamping_properties SET operating_season_months = '8'
  WHERE property_name = 'Under Canvas Great Smoky Mountains';

UPDATE all_glamping_properties SET operating_season_months = '8'
  WHERE property_name ILIKE 'Under Canvas Lake Powell%';

UPDATE all_glamping_properties SET operating_season_months = '8'
  WHERE property_name = 'Under Canvas Moab';

UPDATE all_glamping_properties SET operating_season_months = '5'
  WHERE property_name = 'Under Canvas Mount Rushmore';

UPDATE all_glamping_properties SET operating_season_months = '5'
  WHERE property_name ILIKE 'Under Canvas North Yellowstone%';

UPDATE all_glamping_properties SET operating_season_months = '4'
  WHERE property_name = 'Under Canvas West Yellowstone';

UPDATE all_glamping_properties SET operating_season_months = '4'
  WHERE property_name = 'Under Canvas White Mountains';

UPDATE all_glamping_properties SET operating_season_months = '6'
  WHERE property_name = 'Under Canvas Yosemite';

UPDATE all_glamping_properties SET operating_season_months = '8'
  WHERE property_name = 'Under Canvas Zion';

COMMIT;

-- Verify
SELECT property_name,
       COUNT(*) AS rows,
       MIN(operating_season_months) AS months
FROM all_glamping_properties
WHERE lower(public.sage_chain_label_from_property_name(property_name)) = 'under canvas'
GROUP BY property_name
ORDER BY property_name;
