-- 1. Add 'do_not_include' to research_status allowed values (required before UPDATE)
ALTER TABLE public.all_roverpass_data
  DROP CONSTRAINT IF EXISTS all_roverpass_data_research_status_valid;

ALTER TABLE public.all_roverpass_data
  ADD CONSTRAINT all_roverpass_data_research_status_valid CHECK (
    (research_status IS NULL)
    OR (research_status = ANY (ARRAY['new'::text, 'in_progress'::text, 'needs_review'::text, 'published'::text, 'do_not_include'::text]))
  );

-- 2. Set research_status = 'do_not_include' for excluded unit types
WITH excluded_unit_types(ut) AS (
  VALUES ('rental'),('misc'),('pass'),('boat_slip'),('horse_stall'),('event'),('overnight_parking'),('group_shelter'),('meeting_room')
)
UPDATE public.all_roverpass_data r
SET research_status = 'do_not_include'
WHERE EXISTS (
  SELECT 1 FROM unnest(string_to_array(COALESCE(r.unit_type, ''), ',')) AS t(part)
  WHERE trim(part) IN (SELECT ut FROM excluded_unit_types)
);