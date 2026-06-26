-- Glamping Loft Lake Geneva: property_total_sites was 1 (one bookable loft SKU) while
-- quantity_of_units is 12 (tent suites). Align property_total_sites with inventory count.
UPDATE public.all_glamping_properties
SET
  property_total_sites = 12,
  date_updated = '2026-06-23'
WHERE slug = 'glamping-loft-lake-geneva-wi'
  AND property_name = 'Glamping Loft Lake Geneva'
  AND COALESCE(property_total_sites, 0) = 1
  AND COALESCE(quantity_of_units, 0) = 12;
