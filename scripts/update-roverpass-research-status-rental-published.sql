-- Set research_status = 'published' for all records where unit_type includes 'rental'
UPDATE public.all_roverpass_data
SET research_status = 'published'
WHERE EXISTS (
  SELECT 1 FROM unnest(string_to_array(COALESCE(unit_type, ''), ',')) AS t(part)
  WHERE trim(part) = 'rental'
);
