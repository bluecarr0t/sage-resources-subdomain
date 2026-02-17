-- Populate property_total_sites by counting records per property (roverpass_campground_id)
-- EXCLUDING unit types: rental, misc, pass, boat_slip, horse_stall, event, overnight_parking, group_shelter, meeting_room

WITH excluded_unit_types(ut) AS (
  VALUES ('rental'),('misc'),('pass'),('boat_slip'),('horse_stall'),('event'),('overnight_parking'),('group_shelter'),('meeting_room')
),
countable_sites AS (
  SELECT roverpass_campground_id,
    NOT EXISTS (
      SELECT 1 FROM unnest(string_to_array(COALESCE(unit_type, ''), ',')) AS t(part)
      WHERE trim(part) IN (SELECT ut FROM excluded_unit_types)
    ) AS is_countable
  FROM public.all_roverpass_data
  WHERE roverpass_campground_id IS NOT NULL
),
property_counts AS (
  SELECT roverpass_campground_id, COUNT(*) FILTER (WHERE is_countable)::numeric AS site_count
  FROM countable_sites
  GROUP BY roverpass_campground_id
)
UPDATE public.all_roverpass_data r
SET property_total_sites = pc.site_count
FROM property_counts pc
WHERE r.roverpass_campground_id = pc.roverpass_campground_id;
