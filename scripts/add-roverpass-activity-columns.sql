-- Add activity columns only (hunting, golf, backpacking, historic_sightseeing, scenic_drives, stargazing)
ALTER TABLE public.all_roverpass_data
  ADD COLUMN IF NOT EXISTS hunting text NULL,
  ADD COLUMN IF NOT EXISTS golf text NULL,
  ADD COLUMN IF NOT EXISTS backpacking text NULL,
  ADD COLUMN IF NOT EXISTS historic_sightseeing text NULL,
  ADD COLUMN IF NOT EXISTS scenic_drives text NULL,
  ADD COLUMN IF NOT EXISTS stargazing text NULL;
