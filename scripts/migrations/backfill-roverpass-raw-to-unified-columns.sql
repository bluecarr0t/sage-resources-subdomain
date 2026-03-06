-- Backfill property_*, activities_*, setting_*, rv_*, unit_* columns in all_roverpass_data_new
-- by parsing amenities_raw, activities_raw, and lifestyle_raw.
-- No new columns. Run after create-all-roverpass-data-new-unified-schema.sql

BEGIN;

-- rv_parking: Back-in RV Sites, Pull-Thru RV Sites, RV Hookup
UPDATE public.all_roverpass_data_new r
SET rv_parking = sub.parking
FROM (
  SELECT id,
    TRIM(
      CONCAT_WS(', ',
        CASE WHEN amenities_raw LIKE '%Back-in RV Sites%' THEN 'Back-in' END,
        CASE WHEN amenities_raw LIKE '%Pull-Thru RV Sites%' THEN 'Pull-Thru' END,
        CASE WHEN amenities_raw LIKE '%RV Hookup%' THEN 'RV Hookup' END
      )
    ) AS parking
  FROM public.all_roverpass_data_new
  WHERE amenities_raw IS NOT NULL AND amenities_raw != ''
) sub
WHERE r.id = sub.id AND sub.parking != '' AND sub.parking IS NOT NULL;

-- rv_vehicle_length: Big Rig Friendly
UPDATE public.all_roverpass_data_new
SET rv_vehicle_length = 'Yes'
WHERE amenities_raw LIKE '%Big Rig Friendly%';

-- rv_accommodates_slideout: Slide Outs
UPDATE public.all_roverpass_data_new
SET rv_accommodates_slideout = 'Yes'
WHERE amenities_raw LIKE '%Slide Outs%';

-- rv_surface_type: Gravel Roads, Paved Roads, Dirt Roads
UPDATE public.all_roverpass_data_new r
SET rv_surface_type = sub.surface
FROM (
  SELECT id,
    TRIM(
      CONCAT_WS(', ',
        CASE WHEN amenities_raw LIKE '%Gravel Roads%' THEN 'Gravel' END,
        CASE WHEN amenities_raw LIKE '%Paved Roads%' THEN 'Paved' END,
        CASE WHEN amenities_raw LIKE '%Dirt Roads%' THEN 'Dirt' END
      )
    ) AS surface
  FROM public.all_roverpass_data_new
  WHERE amenities_raw IS NOT NULL AND amenities_raw != ''
) sub
WHERE r.id = sub.id AND sub.surface != '' AND sub.surface IS NOT NULL;

-- unit_ada_accessibility: ADA Accessible
UPDATE public.all_roverpass_data_new
SET unit_ada_accessibility = 'Yes'
WHERE amenities_raw LIKE '%ADA Accessible%';

-- activities_surfing
UPDATE public.all_roverpass_data_new
SET activities_surfing = 'Yes'
WHERE activities_raw LIKE '%Surfing%';

-- activities_climbing: Rock Climbing, Bouldering
UPDATE public.all_roverpass_data_new
SET activities_climbing = 'Yes'
WHERE activities_raw LIKE '%Rock Climbing%' OR activities_raw LIKE '%Bouldering%';

-- activities_snow_sports
UPDATE public.all_roverpass_data_new
SET activities_snow_sports = 'Yes'
WHERE activities_raw LIKE '%Snow Sports%';

-- activities_paddling: Stand-Up Paddleboards
UPDATE public.all_roverpass_data_new
SET activities_paddling = 'Yes'
WHERE activities_raw LIKE '%Stand-Up Paddleboards%';

-- activities_whitewater_paddling: White-Water Rafting, Whitewater Rafting & Kayaking
UPDATE public.all_roverpass_data_new
SET activities_whitewater_paddling = 'Yes'
WHERE activities_raw LIKE '%White-Water Rafting%' OR activities_raw LIKE '%Whitewater Rafting & Kayaking%';

-- activities_swimming: Swimming Indoors
UPDATE public.all_roverpass_data_new
SET activities_swimming = 'Yes'
WHERE activities_raw LIKE '%Swimming Indoors%';

-- activities_wind_sports: Kite-Boarding
UPDATE public.all_roverpass_data_new
SET activities_wind_sports = 'Yes'
WHERE activities_raw LIKE '%Kite-Boarding%';

-- property_alcohol_available: Beer/Wine Tasting (from activities)
UPDATE public.all_roverpass_data_new
SET property_alcohol_available = 'Yes'
WHERE activities_raw LIKE '%Beer/Wine Tasting%';

-- setting_cave: Caving/Spelunking
UPDATE public.all_roverpass_data_new
SET setting_cave = 'Yes'
WHERE activities_raw LIKE '%Caving/Spelunking%';

-- property_extended_stay, property_family_friendly, property_remote_work_friendly (from lifestyle)
UPDATE public.all_roverpass_data_new
SET property_extended_stay = 'Yes'
WHERE lifestyle_raw LIKE '%Extended Stay%';

UPDATE public.all_roverpass_data_new
SET property_family_friendly = 'Yes'
WHERE lifestyle_raw LIKE '%Family Friendly%';

UPDATE public.all_roverpass_data_new
SET property_remote_work_friendly = 'Yes'
WHERE lifestyle_raw LIKE '%Remote Work Friendly%';

COMMIT;
