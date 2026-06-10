-- ============================================================================
-- Reclassify Bungalow → Cabin in all_glamping_properties
--
-- Cuyuna Cove: site_name "Bungalow" was stored as Safari Tent; set to Cabin.
-- Global: any remaining unit_type 'Bungalow' → 'Cabin' (canonical picker term).
--
-- Affected rows (pre-migration):
--   10167  Cuyuna Cove              Bungalow / Safari Tent → Cabin
--   10554  Zion Wildflower Resort   Bungalows / Bungalow → Cabin
--   11168  Ohai Nazaré Outdoor Resort  null / Bungalow → Cabin
--   12285  Bukubaki Eco Surf Resort Bungalow / Bungalow → Cabin
-- ============================================================================

BEGIN;

UPDATE public.all_glamping_properties
SET
  unit_type = 'Cabin',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nUnit type (Jun 2026): Reclassified to Cabin (was '
    || COALESCE(NULLIF(trim(unit_type), ''), 'unset') || ').'
WHERE id = 10167
  AND property_name = 'Cuyuna Cove'
  AND site_name = 'Bungalow';

UPDATE public.all_glamping_properties
SET
  unit_type = 'Cabin',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nUnit type (Jun 2026): Bungalow → Cabin (canonical unit type).'
WHERE trim(unit_type) = 'Bungalow';

-- Verification (expect 0 Bungalow unit_type rows)
-- SELECT id, property_name, site_name, unit_type FROM all_glamping_properties
-- WHERE unit_type ILIKE '%bungalow%' OR (property_name = 'Cuyuna Cove' AND site_name = 'Bungalow');

COMMIT;
