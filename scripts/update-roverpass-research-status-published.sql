-- Set research_status to 'published' for all rows in all_roverpass_data
UPDATE public.all_roverpass_data
SET research_status = 'published'
WHERE research_status IS DISTINCT FROM 'published';
