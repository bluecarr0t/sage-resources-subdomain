-- Merge Westgate River Ranch short-name row onto the main resort property_id group.
-- Row 12934 uses property_name "Westgate River Ranch" (distinct from sibling rows).

UPDATE public.all_sage_data
SET
  property_id = '015cbbf3-927b-4d98-b6bb-51b3e94f14bf',
  property_name = 'Westgate River Ranch Resort & Rodeo',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nMerge (2026-07-09): aligned property_id + property_name with Westgate River Ranch Resort & Rodeo anchor.'
WHERE id = 12934
  AND property_id IS DISTINCT FROM '015cbbf3-927b-4d98-b6bb-51b3e94f14bf'::uuid;
