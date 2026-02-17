-- Add new columns for lifestyle, amenity, and activity mappings
ALTER TABLE public.all_roverpass_data
  ADD COLUMN IF NOT EXISTS extended_stay text NULL,
  ADD COLUMN IF NOT EXISTS family_friendly text NULL,
  ADD COLUMN IF NOT EXISTS remote_work_friendly text NULL,
  ADD COLUMN IF NOT EXISTS fitness_room text NULL,
  ADD COLUMN IF NOT EXISTS propane_refilling_station text NULL,
  ADD COLUMN IF NOT EXISTS hunting text NULL,
  ADD COLUMN IF NOT EXISTS golf text NULL,
  ADD COLUMN IF NOT EXISTS backpacking text NULL,
  ADD COLUMN IF NOT EXISTS historic_sightseeing text NULL,
  ADD COLUMN IF NOT EXISTS scenic_drives text NULL,
  ADD COLUMN IF NOT EXISTS stargazing text NULL;
