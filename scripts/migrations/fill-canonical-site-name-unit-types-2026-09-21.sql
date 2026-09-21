-- Fill unit_type from a site_name that is already a canonical product label.
-- Review before apply. Does not write by itself.
-- Rows: 1

-- Lagom Retreat / Cabin
UPDATE public.all_sage_data SET
  unit_type = 'Cabin',
  date_updated = CURRENT_DATE,
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END
WHERE id = 10946
  AND (unit_type IS NULL OR btrim(unit_type) = '');
