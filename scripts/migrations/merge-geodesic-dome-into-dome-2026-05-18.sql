-- Merge stored unit_type "Geodesic Dome" (and alias "Geodome") into "Dome" for metrics and filters.

UPDATE public.all_glamping_properties
SET
  unit_type = 'Dome',
  date_updated = COALESCE(date_updated, CURRENT_DATE::text)
WHERE unit_type IN ('Geodesic Dome', 'Geodome');
