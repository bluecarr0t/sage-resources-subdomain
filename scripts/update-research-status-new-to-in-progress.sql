-- Move all 'new' research_status to 'in-progress' in all_glamping_properties
UPDATE public.all_glamping_properties
SET research_status = 'in_progress'
WHERE LOWER(TRIM(COALESCE(research_status, ''))) = 'new';
