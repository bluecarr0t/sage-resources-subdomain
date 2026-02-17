-- Set is_glamping_property = 'Yes' only when 50%+ of countable sites are glamping unit types
-- Glamping types: cabin, glamping, tiny_home, lodge, treehouse, safari tent (excludes rv_site, tent)
-- Countable = excludes rental, misc, pass, boat_slip, horse_stall, event, overnight_parking, group_shelter, meeting_room

WITH excluded_unit_types(ut) AS (
  VALUES ('rental'),('misc'),('pass'),('boat_slip'),('horse_stall'),('event'),('overnight_parking'),('group_shelter'),('meeting_room')
),
glamping_unit_types(ut) AS (
  VALUES ('cabin'),('glamping'),('tiny_home'),('lodge'),('treehouse'),('safari tent'),('safari'),('apartment')
),
site_classification AS (
  SELECT roverpass_campground_id,
    NOT EXISTS (
      SELECT 1 FROM unnest(string_to_array(COALESCE(unit_type, ''), ',')) AS t(part)
      WHERE trim(part) IN (SELECT ut FROM excluded_unit_types)
    ) AS is_countable,
    EXISTS (
      SELECT 1 FROM unnest(string_to_array(COALESCE(unit_type, ''), ',')) AS t(part)
      WHERE trim(part) IN (SELECT ut FROM glamping_unit_types)
    ) AS is_glamping_type
  FROM public.all_roverpass_data
  WHERE roverpass_campground_id IS NOT NULL
),
property_ratios AS (
  SELECT roverpass_campground_id,
    COUNT(*) FILTER (WHERE is_countable) AS total_countable,
    COUNT(*) FILTER (WHERE is_countable AND is_glamping_type) AS glamping_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE is_countable) > 0
      THEN COUNT(*) FILTER (WHERE is_countable AND is_glamping_type)::numeric / COUNT(*) FILTER (WHERE is_countable)::numeric
      ELSE 0
    END AS glamping_ratio
  FROM site_classification
  GROUP BY roverpass_campground_id
)
UPDATE public.all_roverpass_data r
SET is_glamping_property = CASE WHEN pr.glamping_ratio >= 0.5 THEN 'Yes' ELSE 'No' END
FROM property_ratios pr
WHERE r.roverpass_campground_id = pr.roverpass_campground_id;
