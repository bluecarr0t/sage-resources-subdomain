-- USA proposed / under-construction glamping resorts (June 2026 web research).
-- discovery_source = web_research_2026_06_usa_pipeline_upcoming
-- research_status = in_progress; is_open = Proposed Development | Under Construction
-- Safe to re-run (slug-guarded INSERTs; targeted UPDATEs).

UPDATE public.all_glamping_properties
SET
  research_status = 'in_progress',
  date_updated = '2026-06-10'
WHERE slug IN (
  'evergreen-resort-clam-lake-mi',
  'long-valley-junction-glamping-kane-ut',
  'hidden-harmony-poga-tn',
  'princeville-glamping-resort-hi',
  'terramor-outdoor-resort-wilmington-ny',
  'robott-flamingo-heights-glamping-ca'
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
    'Evergreen Resort',
    'evergreen-resort-clam-lake-mi',
    'Safari Tent',
    'MI',
    'Cadillac',
    '41 Road corridor, Clam Lake Township, Wexford County, MI (undeveloped parcel along Lake Cadillac)',
    44.251,
    -85.401,
    'https://moderncampground.com/usa/michigan/evergreen-resorts-10m-glamping-hotel-development-project-faces-opposition/',
    $$Karl Thomas’ Evergreen Resort proposes a phased $10M expansion on an undeveloped parcel along 41 Road in Clam Lake Township: Stage 1 is 32 luxury glamping sites with water, sewer, and electric; Stage 2 is a 4–5 story hotel (up to ~100 rooms) with rooftop restaurant overlooking Lake Cadillac. Clam Lake Township planning commission unanimously voted against the rezoning request as of press—treat as proposed pipeline until entitlements and construction are verified.$$,
    $$Sources: Modern Campground (June 2026 web research). Distinct from The Haven of Cadillac (separate Cadillac-area pipeline row). Coordinates approximate (Lake Cadillac / Clam Lake Township).$$,
    '32'
  ),
  (
    'in_progress',
    'Proposed Development',
    'Long Valley Junction Glamping Resort',
    'long-valley-junction-glamping-kane-ut',
    'Cabin',
    'UT',
    'Long Valley Junction',
    'Oak Ridge Estates parcels 258-4/258-5/258-7, Kane County, UT (~30 acres near Long Valley Junction)',
    37.447,
    -112.604,
    'https://citizenportal.ai/articles/7562066/utah/kane-county/kane-county-boards-and-commissions/kane-county-commission/commission-adopts-rezoning-for-long-valley-junction-glamping-and-cabin-project',
    $$Jeremy Hartman and partner families won Kane County Commission approval (Ordinance 02026-02, Feb 24, 2026) to rezone ~30 acres in Oak Ridge Estates from agricultural to RU-10 for a low-density year-round cabin and glamping resort. Site already has four cabins plus municipal water, power, and fire hydrants; commissioners discussed fire protection and road access—proposed pipeline until site plan and guest bookings are confirmed.$$,
    $$Sources: Citizen Portal / Kane County Commission hearing (Feb 2026) (June 2026 web research). Coordinates approximate (Long Valley Junction, Hwy 89 corridor).$$,
  NULL
  ),
  (
    'in_progress',
    'Proposed Development',
    'Hidden Harmony',
    'hidden-harmony-poga-tn',
    'Dome',
    'TN',
    'Poga',
    'Poga community, Carter County, TN (rural retreat site)',
    36.167,
    -82.300,
    'https://moderncampground.com/usa/tennessee/tennessee-glamping-retreat-proposal-faces-local-pushback/',
    $$Bastian and Marisol Yotta propose Hidden Harmony, a spirituality-focused couples retreat with 10 geodesic domes on their Carter County property near Poga. Developers say county paperwork is filed; local residents and officials have raised traffic, road suitability, and reputational concerns amid social-media rumors—proposed pipeline only until formal approvals and construction are verified.$$,
    $$Sources: Modern Campground / WCYB (June 2026 web research). Coordinates approximate (Poga, Carter County).$$,
    '10'
  ),
  (
    'in_progress',
    'Proposed Development',
    'Princeville Glamping Resort',
    'princeville-glamping-resort-hi',
    'Safari Tent',
    'HI',
    'Princeville',
    'Former Princeville resort / Makai Golf Club Woods Course parcel, Princeville, Kauai, HI (~50 acres)',
    22.217,
    -159.478,
    'https://www.residekauai.com/blog/proposed-glamping-resort-in-princeville/',
    $$Starwood Capital Group’s redevelopment of the former Princeville resort proposes a 50-unit luxury glamping complex (avg. ~460 sq ft tents, $500+ nightly positioning) with restaurant, spa, and event tent on three holes of the Makai Golf Club Woods Course. A 1972 open-space dedication on the golf land expires February 2026—proposed pipeline; verify current entitlement status and opening timeline before publishing rates.$$,
    $$Sources: Reside Kauai / local press (June 2026 web research). Coordinates approximate (Princeville / Makai Golf Club).$$,
    '50'
  ),
  (
    'in_progress',
    'Proposed Development',
    'Terramor Outdoor Resort - Wilmington',
    'terramor-outdoor-resort-wilmington-ny',
    'Safari Tent',
    'NY',
    'Wilmington',
    'Former KOA site, Fox Farm Road, Wilmington, Essex County, NY (~65 acres near Whiteface Mountain)',
    44.389,
    -73.815,
    'https://moderncampground.com/usa/new-york/terramor-outdoor-resort-seeks-to-transform-old-campground-into-year-round-luxury-glamping-experience/',
    $$KOA / Terramor Outdoor Resort proposes a $28.5M year-round glamping destination on the former Wilmington KOA parcel: ~80 hard-sided luxury tents, lodge, pool, event pavilion, wellness tent, and employee housing less than two miles from Whiteface Mountain. Awaiting Adirondack Park Agency, DEC wastewater, and NY Department of Health approvals after demolition of legacy buildings—proposed pipeline distinct from open Terramor Bar Harbor (ME).$$,
    $$Sources: Modern Campground / Adirondack press (June 2026 web research). Coordinates approximate (Fox Farm Road, Wilmington).$$,
    '80'
  ),
  (
    'in_progress',
    'Proposed Development',
    'RoBott Flamingo Heights Glamping Resort',
    'robott-flamingo-heights-glamping-ca',
    'Yurt',
    'CA',
    'Flamingo Heights',
    'Flamingo Heights area, San Bernardino County, CA (rural living zone site off Hwy 247)',
    34.234,
    -115.731,
    'https://moderncampground.com/usa/california/san-bernardino-county-planning-commission-denies-proposed-75-site-glamping-project/',
    $$RoBott Land Company sought a 75-site luxury glamping resort in Flamingo Heights with yurts, teepee-style tents, 10,000 sq ft restaurant, art barn, bar, pool, and yoga deck on a western Joshua Tree–rich wildlife corridor site. San Bernardino County Planning Commission denied the application without prejudice; developers may resubmit or appeal—treat as proposed / pre-construction pipeline only.$$,
    $$Sources: Modern Campground / High Desert press (June 2026 web research). Coordinates approximate (Flamingo Heights, San Bernardino County).$$,
    '75'
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
