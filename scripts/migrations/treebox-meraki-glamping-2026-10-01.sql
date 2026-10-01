-- Treebox Meraki House is a published Treebox stay in Dover.
-- It was typed Vacation Rental, so the brand page counted it and the
-- brands ranking (property_type = Glamping only) did not.
-- Operator site lists nine unique stays and no duplicate inventory:
-- Winesburg 5, Walnut Creek 3, Dover 1.

UPDATE public.all_sage_data
SET
  property_type = 'Glamping',
  date_updated = '2026-10-01',
  notes = CASE
    WHEN COALESCE(notes, '') ILIKE '%treebox_meraki_glamping_2026_10_01%' THEN notes
    ELSE trim(both E'\n' FROM COALESCE(notes, '') || E'\n\ntreebox_meraki_glamping_2026_10_01: Meraki House is one Treebox stay in Dover (treeboxstays.com). Counted as Glamping so the brand page and the brands ranking use the same three locations. Operator inventory is nine unique stays, one each.')
  END
WHERE property_name = 'Treebox'
  AND site_name = 'Meraki House'
  AND property_type = 'Vacation Rental';
