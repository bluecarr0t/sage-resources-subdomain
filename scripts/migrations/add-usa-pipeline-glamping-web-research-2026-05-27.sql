-- USA proposed / under-construction glamping resorts (May 2026 web research).
-- discovery_source = web_research_2026_05_usa_pipeline_upcoming
-- research_status = in_progress; is_open = Proposed Development | Under Construction
-- Safe to re-run (slug-guarded INSERTs; targeted UPDATEs).

-- Align existing Atascadero pipeline row (was published/Closed).
UPDATE public.all_glamping_properties
SET
  research_status = 'in_progress',
  is_open = 'Under Construction',
  is_glamping_property = 'Yes',
  discovery_source = 'web_research_2026_05_usa_pipeline_upcoming',
  property_type = 'Glamping Resort',
  description = $$Cal Coast Communities’ Del Rio Ranch: 26-acre tourism resort at Del Rio Road & El Camino Real (Atascadero) with 70 glamping units (cabanas, cabins, Airstream trailers), 98 RV sites, 18 hotel rooms, recreation center, pool/clubhouse/spa, and commercial plaza. City Council unanimously approved design plans Jan 2025 after a decade-long entitlement process; construction timeline not publicly fixed—treat as under construction until bookings open.$$,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Reclassified to in_progress pipeline from Modern Campground / council coverage (web_research_2026_05_usa_pipeline_upcoming).',
  date_updated = '2026-05-27'
WHERE slug = 'del-rio-ranch'
  AND city ILIKE 'Atascadero%'
  AND state = 'CA';

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
  land_operator_category
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
  'web_research_2026_05_usa_pipeline_upcoming',
  'United States',
  v.state,
  v.city,
  v.address,
  v.lat::numeric,
  v.lon::numeric,
  v.url,
  v.description,
  v.notes,
  '2026-05-27',
  '2026-05-27',
  'private_commercial'
FROM (VALUES
  (
    'in_progress',
    'Proposed Development',
    'Hinata Mountainside Resort',
    'hinata-mountainside-resort-charlemont-ma',
    'Cabin',
    'MA',
    'Charlemont',
    'Warfield House Inn parcel, Charlemont, MA (473-acre site; ~31 developable acres)',
    42.627,
    -72.870,
    'https://moderncampground.com/usa/massachusetts/charlemont-planning-board-reviews-proposed-glamping-resort/',
    $$Jeffrey and Jennifer Neilsen propose transforming the Warfield House Inn into Hinata Mountainside Resort: 32 deluxe ~500 sq ft glamping cabins with decks and optional hot tubs, restaurant improvements, and 127 parking spaces on a 473-acre hillside property. Charlemont Planning Board reviewed traffic, light, noise, and sewer integration concerns; targeted May 2025 opening cited in 2024 press—verify permits and construction before publishing rates.$$,
    $$Sources: Modern Campground / Greenfield Recorder / Charlemont planning application (May 2026 web research). Coordinates approximate (Warfield House area).$$
  ),
  (
    'in_progress',
    'Proposed Development',
    'Timberland LLC Glamping (La Push)',
    'timberland-llc-glamping-la-push-wa',
    'Glamping Tent',
    'WA',
    'La Push',
    'La Push Road corridor, West End, Clallam County, WA (11-site phased plan)',
    47.910,
    -124.636,
    'https://moderncampground.com/usa/washington/timberland-llc-to-present-revised-glamping-proposal-to-clallam-county/',
    $$Timberland LLC (Jianli Zhang & Sean Wood) revised an 11-site phased glamping plan along La Push Road after an initial denial: Phase 1 primitive tent sites (fire pits, picnic tables, porta-potties); Phase 2 water/septic/drainage and ~500 sq ft studio cabins; Phase 3 conversion of tent sites to cabins over 2–6 years. 200 ft Sol Duc River setback and neighbor buffers cited—proposed until county re-approval and Phase 1 opening are verified.$$,
    $$Sources: Modern Campground / Forks Forum (Sep 2024) (May 2026 web research). Distinct from Timberline or other “Timberland” brands. Coordinates approximate (La Push Road).$$
  ),
  (
    'in_progress',
    'Under Construction',
    'Livesay Waldport Bayfront Glamping',
    'livesay-waldport-bayfront-glamping-or',
    'Geodesic Dome',
    'OR',
    'Waldport',
    'Former Waldport Middle School site, NW John Way / Alsea Bay waterfront, Waldport, OR (~3 acres)',
    44.425,
    -124.069,
    'https://moderncampground.com/usa/oregon/waldport-council-greenlights-proposed-campground-with-geodesic-domes/',
    $$Livesay Development Group (Amy Jamros) is developing an 11-geodesic-dome bayfront glamping campground on the vacant former Waldport Middle School downtown parcel: elevated boardwalks, communal bathhouse, camp store, pavilions, playground, food-truck pad, and 18-hole “Bonsai” mini-golf. Council vacated a street segment Nov 2024; 2025–2026 local press describes domes rapidly taking shape—treat as under construction until public bookings and operating permits are confirmed.$$,
    $$Sources: Modern Campground / Yachats News (Nov 2024–2026) (May 2026 web research). Coordinates approximate (NW John Way / middle school site).$$
  ),
  (
    'in_progress',
    'Proposed Development',
    'Silver Lake Glamping Campground',
    'silver-lake-glamping-campground-dunmore-pa',
    'Cabin',
    'PA',
    'Dunmore',
    'Silver Lake, Drinker Turnpike, Dunmore, PA (between I-84/380 and Route 435)',
    41.420,
    -75.628,
    'https://moderncampground.com/usa/pennsylvania/dunmore-approves-five-cabin-campground-near-i-84-380-interchange/',
    $$S. Walsh Properties LLC (Scranton) won Dunmore ZBA approval (Apr 2025) for a five-cabin glamping-style campground on a conservation-zoned Silver Lake parcel near the I-84/380 Twin Bridges—not an RV park per borough staff. Project advances to Planning Commission; construction expected months out as of press—proposed/ pre-construction until site work is verified.$$,
    $$Sources: Modern Campground / Scranton Times-Tribune (Apr 2025) (May 2026 web research). Distinct from Silver Lake State Park, MI. Coordinates approximate (Silver Lake Dunmore).$$
  ),
  (
    'in_progress',
    'Under Construction',
    'Contentment on Beaver Lake',
    'contentment-on-beaver-lake-rogers-ar',
    'Safari Tent',
    'AR',
    'Rogers',
    'Shockley Place Road, Beaver Lake area, Benton County, AR (~200 acres)',
    36.331,
    -94.119,
    'https://moderncampground.com/usa/arkansas/proposed-glamping-site-on-beaver-lake-approved-in-benton-county/',
    $$Benton County planning approval for “Contentment on Beaver Lake”: ~200-acre lakefront glamping resort with 40 upscale tents, 12 covered wagons, pool, spa, pickleball, and pavilion amenities on Shockley Place Road. Approval followed a prior 2022 denial and remains subject to fire-marshal sign-off; local litigation and neighbor opposition reported in 2024–2025—verify construction progress and opening before publishing rates.$$,
    $$Sources: Modern Campground / 4029 News / Benton County site plan (Mar 2024) (May 2026 web research). Marketing site beaverlakeglamping.com exists; treat as pipeline until operating. Coordinates approximate (Shockley Place Rd).$$
  ),
  (
    'in_progress',
    'Under Construction',
    'Talaz',
    'talaz-lake-tahoe-nv',
    'Glamping Tent',
    'NV',
    'Stateline',
    'Highway 50 corridor, Douglas County, NV (9-acre site near Lake Tahoe shoreline)',
    38.960,
    -119.939,
    'https://nevadacurrent.com/2025/10/09/tahoe-agency-okays-removal-of-hundreds-of-trees-to-make-room-for-glamping/',
    $$Talaz (developer Rachel Bowers): 53-unit year-round luxury glamping resort off Highway 50 near Lake Tahoe with climate-controlled tents, running water, A/C, and EV charging. TRPA approved substantial tree removal (Sep 2025) amid environmental opposition; project requires forest access easements—under construction / pre-opening until TRPA conditions and guest bookings are verified.$$,
    $$Sources: Nevada Current (Oct 2025); Talaz marketing site (May 2026 web research). Coordinates approximate (Stateline / Hwy 50).$$
  ),
  (
    'in_progress',
    'Proposed Development',
    'My Rock Grama Glamping Resort',
    'my-rock-grama-glamping-resort-garfield-ut',
    'Safari Tent',
    'UT',
    'Panguitch',
    'Lot 8, My Rock Grama subdivision, Garfield County, UT (~50 acres)',
    37.822,
    -112.431,
    'https://citizenportal.ai/articles/7360638/planning-commission-approves-zone-change-to-allow-50-acre-glamping-resort-final-decision-goes-to-county-commission',
    $$Mark 3 Investments LLC seeks a Garfield County zone change (agricultural to commercial) for ~50 acres at Lot 8, My Rock Grama subdivision, to develop a luxury glamping resort with tents and campsites. Planning Commission approved the zone change Apr 2025; final decision rests with the County Commission—proposed pipeline only until final entitlement and construction are confirmed.$$,
    $$Sources: Citizen Portal / Garfield County Planning Commission hearing (Apr 2025) (May 2026 web research). Coordinates approximate (Garfield County / Panguitch area).$$
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
  notes
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug
);
