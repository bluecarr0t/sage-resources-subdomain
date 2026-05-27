-- Timberline Glamping Co.: tag state-park concession sites so they are excluded from
-- public /brands map and private-commercial comps (land_operator_category = state_park).
--
-- Researched May 2026 from *.tlglamping.com and timberlineglamping.com:
--   Birmingham → Oak Mountain State Park
--   Jupiter → Jonathan Dickinson State Park
--   Lake Lanier (Cumming) → Don Carter State Park (Shady Grove)
--
-- Left unchanged (private or non-state public land):
--   Pine Acres, Lake Lanier (Gainesville geodesic), Kingston Downs, Lula,
--   Clarks Hill (Wildwood Park), River Forks (Hall County), Williamsburg (James City County).

UPDATE public.all_glamping_properties p
SET
  land_operator_category = 'state_park',
  date_updated = '2026-05-26',
  updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id = b.id
  AND b.slug = 'timberline-glamping-co'
  AND p.property_name IN (
    'Timberline Glamping at Amelia Island',
    'Timberline Glamping at Amicalola Falls',
    'Timberline Glamping at Auburn',
    'Timberline Glamping at Birmingham',
    'Timberline Glamping at Cheaha',
    'Timberline Glamping at Codorus',
    'Timberline Glamping at Collier-Seminole State Park',
    'Timberline Glamping at Fort Myers',
    'Timberline Glamping at French Creek',
    'Timberline Glamping at Hickory Run',
    'Timberline Glamping at Hills Creek',
    'Timberline Glamping at Huntsville',
    'Timberline Glamping at Jupiter',
    'Timberline Glamping at Kissimmee Prairie Preserve',
    'Timberline Glamping at Lake Blackshear',
    'Timberline Glamping at Lake Guntersville',
    'Timberline Glamping at Lake Manatee',
    'Timberline Glamping at Lake Martin',
    'Timberline Glamping at Laurel Hill',
    'Timberline Glamping at Orange Beach',
    'Timberline Glamping at Promised Land',
    'Timberline Glamping at Pymatuning',
    'Timberline Glamping at Sarasota',
    'Timberline Glamping at Sebastian Inlet',
    'Timberline Glamping at Tuscaloosa',
    'Timberline Glamping at Unicoi State Park',
    'Timberline Glamping Co. Hillsborough River',
    'Timberline Glamping Co. Lake Lanier'
  );
