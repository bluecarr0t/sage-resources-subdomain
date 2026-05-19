-- ============================================================================
-- Under Canvas: reclassify mislabeled Bell Tent → Safari Tent
--
-- Web research (May 2026):
--   • Under Canvas markets upscale safari-style canvas tents at national-park
--     gateway camps (undercanvas.com camp pages; brand “hotel amenities” copy).
--   • Published room inventory uses Deluxe Tent, Stargazer Tent, Suite Tent, and
--     a lead-in Safari Tent tier — not bell tents (NPR “Room Rates & Details”
--     per camp, e.g. Grand Canyon / Moab / West Yellowstone; see also
--     scripts/migrations/under-canvas-rates-from-web-research-2026-05.sql).
--   • AFAR / press describe “upscale safari-style tents” (temp/afar-full-article.txt).
--
-- Sage DB had 18 open published rows at three camps still stored as unit_type
-- 'Bell Tent' (Columbia River Gorge, North Yellowstone, Yosemite SKU breakdown).
-- This pass sets them to Safari Tent so market-overview Bell Tent averages are
-- not skewed by luxury safari inventory. (Other Under Canvas rows already use
-- Safari Tent or named Deluxe/Stargazer/Suite SKUs.)
--
-- Scope: property_name ILIKE 'Under Canvas%' only (excludes ULUM Moab).
-- ============================================================================

BEGIN;

UPDATE public.all_glamping_properties
SET
  unit_type = 'Safari Tent',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nUnit type (May 2026 web research): Under Canvas sells safari-style canvas tents (Deluxe / Stargazer / Suite / Safari per undercanvas.com & NPR room pages), not bell tents. Reclassified Bell Tent → Safari Tent.'
WHERE property_name ILIKE 'Under Canvas%'
  AND (
    trim(unit_type) = 'Bell Tent'
    OR unit_type ILIKE 'Bell Tent,%'
    OR unit_type ILIKE '%, Bell Tent'
    OR unit_type ILIKE '%, Bell Tent,%'
  );

-- Verification (expect 0 Bell Tent rows for Under Canvas)
-- SELECT property_name, unit_type, count(*)
-- FROM all_glamping_properties
-- WHERE property_name ILIKE 'Under Canvas%'
-- GROUP BY 1, 2 ORDER BY 1, 2;

COMMIT;
