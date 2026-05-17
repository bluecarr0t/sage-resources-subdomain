-- Remove site/unit rows at Verde Ranch whose unit_type is wagon / covered wagon / Conestoga (primary label).
-- Property names must match exactly (trim). Run after Verde is classified as RV Resort if desired.
--
-- Matches:
--   - whole-string ILIKE patterns for wagon / covered wagon / conestoga wagon
--   - primary segment before comma/semicolon/slash/and starting with wagon family
--
-- Review in SQL editor before run:
-- SELECT id, property_name, site_name, unit_type, quantity_of_units
-- FROM public.all_glamping_properties
-- WHERE btrim(property_name) IN ('Verde Ranch Resort', 'Verde Ranch RV Resort')
--   AND unit_type IS NOT NULL
--   AND btrim(unit_type) <> '';

DELETE FROM public.all_glamping_properties
WHERE btrim(property_name) IN ('Verde Ranch Resort', 'Verde Ranch RV Resort')
  AND (
    lower(btrim(unit_type)) IN (
      'wagon',
      'wagons',
      'covered wagon',
      'covered wagons',
      'conestoga wagon',
      'conestoga wagons',
      'conestoga'
    )
    OR lower(btrim(unit_type)) LIKE 'wagon,%'
    OR lower(btrim(unit_type)) LIKE 'wagon;%'
    OR lower(btrim(unit_type)) LIKE 'wagon /%'
    OR lower(btrim(unit_type)) LIKE 'wagon and%'
    OR lower(btrim(unit_type)) LIKE 'covered wagon%'
    OR lower(btrim(unit_type)) LIKE '% covered wagon'
    OR lower(btrim(unit_type)) LIKE '%conestoga wagon%'
  );
