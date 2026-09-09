-- ============================================================================
-- RV Resort and RV Park are never glamping properties.
-- Set is_glamping_property = No on every matching row (including rejected).
-- Mixed inventory (tents/cabins at an RV resort) stays on those site rows;
-- the property-level glamping flag follows property_type.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  is_glamping_property = 'No',
  date_updated = '2026-09-04'
WHERE property_type IN ('RV Resort', 'RV Park')
  AND COALESCE(is_glamping_property, '') IS DISTINCT FROM 'No';

ALTER TABLE public.all_sage_data
  DROP CONSTRAINT IF EXISTS all_sage_data_rv_types_not_glamping;

ALTER TABLE public.all_sage_data
  ADD CONSTRAINT all_sage_data_rv_types_not_glamping
  CHECK (
    property_type IS NULL
    OR property_type NOT IN ('RV Resort', 'RV Park')
    OR is_glamping_property = 'No'
  );

COMMIT;
