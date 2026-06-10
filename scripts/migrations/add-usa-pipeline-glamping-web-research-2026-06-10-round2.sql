-- USA proposed / under-construction glamping resorts — round 2 (June 2026 web research).
-- discovery_source = web_research_2026_06_usa_pipeline_upcoming
-- research_status = in_progress; is_open = Proposed Development | Under Construction
-- Safe to re-run (slug-guarded INSERTs; targeted UPDATEs).

UPDATE public.all_glamping_properties
SET
  research_status = 'in_progress',
  date_updated = '2026-06-10'
WHERE slug IN (
  'clear-sky-acadia-lamoine-me',
  'yonder-twentynine-palms-ca',
  'eco-dome-landers-ca',
  'riverbend-glamping-getaway-gallatin-gateway-mt'
)
AND discovery_source = 'web_research_2026_06_usa_pipeline_upcoming';

INSERT INTO public.all_glamping_properties (
  research_status,
  is_glamping_property,
  is_open,
  property_name,
  site_name,
  slug,
  property_type,
  unit_type,
  source,
  discovery_source,
  country,
  state,
  city,
  address,
  lat,
  lon,
  url,
  description,
  notes,
  date_added,
  date_updated,
  land_operator_category,
  quantity_of_units
)
SELECT
  v.research_status,
  'Yes',
  v.is_open,
  v.property_name,
  NULL,
  v.slug,
  'Glamping Resort',
  v.unit_type,
  'Sage',
  'web_research_2026_06_usa_pipeline_upcoming',
  'United States',
  v.state,
  v.city,
  v.address,
  v.lat::numeric,
  v.lon::numeric,
  v.url,
  v.description,
  v.notes,
  '2026-06-10',
  '2026-06-10',
  'private_commercial',
  v.quantity_of_units::numeric
FROM (VALUES
  (
    'in_progress',
    'Proposed Development',
    'Clear Sky Acadia',
    'clear-sky-acadia-lamoine-me',
    'Geodesic Dome',
    'ME',
    'Lamoine',
    'Partridge Cove shoreline, Lamoine, ME (~230 acres)',
    44.477,
    -68.287,
    'https://www.lamoine-me.gov/clear-sky-acadia-dome-glampground-application',
    $$CPEX LLC proposes Clear Sky Acadia: 90 geodesic domed guest units (three sizes, from ~425 sq ft) on ~230 acres along Partridge Cove near Acadia National Park, plus domed restaurant/check-in, activity domes, spa, pool, wedding dome, laundry, and employee housing. Planning Board public hearings and site-plan review ongoing as of 2023–2025 press—proposed pipeline until operating permits and bookings are confirmed.$$,
    $$Sources: Modern Campground / Town of Lamoine planning application (June 2026 web research). Sister brand to Clear Sky Resorts Grand Canyon (AZ). Coordinates approximate (Partridge Cove, Lamoine).$$,
    '90'
  ),
  (
    'in_progress',
    'Proposed Development',
    'Yonder Twentynine Palms',
    'yonder-twentynine-palms-ca',
    'Cabin',
    'CA',
    'Twentynine Palms',
    'Indian Cove neighborhood, Twentynine Palms, CA (~152 acres near Joshua Tree NP)',
    34.128,
    -116.159,
    'https://www.saveourdeserts.org/yonder-29-palms',
    $$Yonder Development proposes a 152-acre Indian Cove resort with 130 solar-equipped ~320 sq ft cabins, main and secondary lodges, pools, food service, employee housing, stargazing area, and outdoor movie screen—marketed as low-impact glamping near Joshua Tree National Park. Local opposition and a 2025 lawsuit over CEQA/environmental review (Center for Biological Diversity et al. v. City of Twentynine Palms) remain active—proposed pipeline only.$$,
    $$Sources: Desert Trumpet / Save Our Deserts / LA Times (Aug 2025) (June 2026 web research). Distinct from open Yonder Escalante (UT). Coordinates approximate (Indian Cove).$$,
    '130'
  ),
  (
    'in_progress',
    'Proposed Development',
    'Eco Dome Landers',
    'eco-dome-landers-ca',
    'Geodesic Dome',
    'CA',
    'Landers',
    'Near Integratron, Landers, CA (~2.5 acres)',
    34.343,
    -116.403,
    'https://www.deserttrumpet.org/p/eco-dome-owner-presents-revised-project',
    $$Calvin and Adriana Clark propose an off-grid Eco Dome glamping campground on ~2.5 acres adjacent to the Integratron in Landers: six 24-ft geodesic domes (each with bath, deck, hot tub; up to six guests), a central communal dome, solar-canopy parking, pool, and dark-sky lighting. San Bernardino County review and neighbor opposition continued through 2024 revisions—proposed pipeline until final permits and opening are verified.$$,
    $$Sources: Desert Trumpet / Save Our Deserts (June 2026 web research). Distinct from unrelated “Eco Dome Experience” (Canary Islands) in Sage. Coordinates approximate (Integratron area).$$,
    '6'
  ),
  (
    'in_progress',
    'Under Construction',
    'Riverbend Glamping Getaway',
    'riverbend-glamping-getaway-gallatin-gateway-mt',
    'Safari Tent',
    'MT',
    'Gallatin Gateway',
    '475 Gateway South Road, Gallatin Gateway, MT (Gallatin River island site)',
    45.592,
    -111.197,
    'https://riverbendglamping.com/',
    $$Jeff and Jirina Pfeil’s Riverbend Glamping Getaway on a Gallatin River island west of Mill Street Bridge: ~58 glamping sites (tents, Conestoga wagons, and teepee-style units with private baths) plus eco-stewardship positioning. Gallatin County approved a floodplain permit (appeals denied April 2025) with seasonal removal conditions; operator site states “A work in progress”—treat as under construction until public bookings open.$$,
    $$Sources: Modern Campground / Bozeman Daily Chronicle / Explore Big Sky (June 2026 web research). Also referenced as River Bend Glamping. Coordinates approximate (475 Gateway South Rd).$$,
    '58'
  )
) AS v(
  research_status,
  is_open,
  property_name,
  slug,
  unit_type,
  state,
  city,
  address,
  lat,
  lon,
  url,
  description,
  notes,
  quantity_of_units
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug
);
