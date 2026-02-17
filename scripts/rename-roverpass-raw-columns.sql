-- Rename roverpass_*_raw columns to amenities_raw, activities_raw, lifestyle_raw
ALTER TABLE public.all_roverpass_data RENAME COLUMN roverpass_amenities_raw TO amenities_raw;
ALTER TABLE public.all_roverpass_data RENAME COLUMN roverpass_activities_raw TO activities_raw;
ALTER TABLE public.all_roverpass_data RENAME COLUMN roverpass_lifestyle_raw TO lifestyle_raw;
