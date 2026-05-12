-- ============================================================================
-- Sage data: unify ULUM brand casing on all_glamping_properties.property_name
-- (e.g. "Ulum Moab" -> "ULUM Moab").
--
-- Apply: psql $DATABASE_URL -f this file
-- ============================================================================

UPDATE all_glamping_properties
SET property_name = 'ULUM Moab',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10286
  AND property_name = 'Ulum Moab';
