-- Nevada glamping web research (May 2026): add operators not already in Sage; reopen rejected NV rows.
-- discovery_source = web_research_2026_05_nv. research_status = in_progress.
-- Skips names already present for NV (published or in_progress).

-- Re-open prior NV glamping research rows for continued enrichment.
UPDATE public.all_glamping_properties
SET
  research_status = 'in_progress',
  is_glamping_property = 'Yes',
  property_type = COALESCE(NULLIF(trim(property_type), ''), 'Glamping Resort'),
  discovery_source = 'web_research_2026_05_nv',
  date_updated = '2026-05-18',
  notes = COALESCE(notes, '') || E'\n\nReopened for NV glamping web research pass (May 2026).'
WHERE UPPER(TRIM(state)) IN ('NV', 'NEVADA')
  AND property_name IN ('Schellraiser', 'The Retreat on Charleston Peak')
  AND research_status = 'rejected';

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
  v.is_glamping_property,
  v.is_open,
  v.property_name,
  v.site_name,
  v.slug,
  v.property_type,
  v.unit_type,
  v.source,
  v.discovery_source,
  v.country,
  v.state,
  v.city,
  v.address,
  v.lat,
  v.lon,
  v.url,
  v.description,
  v.notes,
  v.date_added,
  v.date_updated,
  v.land_operator_category
FROM (
  VALUES
  (
    'in_progress', 'Yes', 'Yes',
    'Tarantula Ranch',
    'Vintage Camper',
    'tarantula-ranch-amargosa-valley-nv',
    'Glamping Resort',
    'Vintage Trailer',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Amargosa Valley',
    '5065 Cook Road, Amargosa Valley, NV 89020',
    36.4361::numeric, -116.8702::numeric,
    'https://www.deathvalley.camp/',
    $$Tarantula Ranch — camping and glamping on a vineyard ranch ~20 minutes from Death Valley National Park (east entrance). Offers vintage Burro fiberglass campers, teardrop trailers, tent sites, outdoor kitchen, showers, Wi‑Fi, and night-sky viewing; pet-friendly per operator. Book direct at deathvalley.camp.$$,
    $$Sources: deathvalley.camp, glamping hub listings, Travel Nevada area guides (May 2026). Phone 775-295-9463.$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'The Eagle''s Nest',
    'Cabin',
    'the-eagles-nest-jarbidge-nv',
    'Glamping Resort',
    'Cabin',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Jarbidge',
    'Jarbidge Canyon (remote; use host directions), Jarbidge, NV',
    41.8706::numeric, -115.3891::numeric,
    'https://www.glamping.com/destination/north-america/nevada/jarbidge/the-eagles-nest/',
    $$The Eagle''s Nest — hut/cabin glamping at Jarbidge Canyon Retreat Center in remote northeastern Nevada (Jarbidge Canyon). Wood stove, kitchen, refrigerator; wellness/retreat programming; hiking, fishing, stargazing, wildlife. Listed on Glamping.com from ~$89/night; verify jarbidgecanyonretreatcenter.com for current booking.$$,
    $$Sources: Glamping.com, Jarbidge Canyon Retreat Center listings (May 2026). Not the same as unrelated "Eagle''s Nest" properties in other states.$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Glamping Adventures LV',
    'Safari Tent',
    'glamping-adventures-lv-nv',
    'Glamping Resort',
    'Safari Tent',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Las Vegas',
    '9580 West Reno Avenue, Las Vegas, NV 89148',
    36.067::numeric, -115.287::numeric,
    'https://thedyrt.com/camping/nevada/glamping-adventures-lv',
    $$Glamping Adventures LV — luxury tent and structure rentals near Las Vegas with additional mountain-area offerings toward Mount Charleston per directory listings. Amenities cited include showers, Wi‑Fi, furnished canvas tents/yurts, fire pits, and group/event options. Verify official booking URL and Mt Charleston vs valley lot locations.$$,
    $$Sources: The Dyrt, RV Cos directory, Destination365 (May 2026). Confirm operator website and active inventory.$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Sage Desert Dreams',
    'Geodesic Dome',
    'sage-desert-dreams-mount-charleston-nv',
    'Glamping Resort',
    'Dome',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Mount Charleston',
    'Lovell Canyon area (no street address; host directions), Clark County, NV',
    36.018::numeric, -115.502::numeric,
    'https://sagedesertdreams.com/',
    $$Sage Desert Dreams — off-grid geodesic dome glamping in Lovell Canyon near Mount Charleston. Sleeps up to 4; propane kitchen, shower, composting toilet, Starlink Wi‑Fi (intermittent), solar power, fire pit, telescope. Final ~4.5 mi requires high-clearance 4WD per operator. Distinct from other Mt Charleston area listings.$$,
    $$Sources: sagedesertdreams.com, Hipcamp listing (May 2026).$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Pickett''s RV Park',
    'Safari Tent',
    'picketts-rv-park-alamo-nv',
    'Glamping Resort',
    'Safari Tent',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Alamo',
    '1 Main Street, Alamo, NV 89001',
    37.364::numeric, -115.164::numeric,
    'https://pickettsrvpark.com/',
    $$Pickett''s RV Park — RV park in Alamo, NV also marketing furnished safari-style glamping tents alongside full-hookup RV sites, Wi‑Fi, and modern bathhouse amenities. Gateway to Pahranagat NWR and Great Basin highway corridor; verify glamping unit count and seasonal availability.$$,
    $$Sources: pickettsrvpark.com, The Dyrt glamping-near-Alamo list (May 2026).$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Lahontan Shores High Desert Retreat',
    'Glamping Tent',
    'lahontan-shores-high-desert-retreat-nv',
    'Glamping Resort',
    'Safari Tent',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Silver Springs',
    'Silver Springs, NV (Lahontan Reservoir area; confirm exact address with host)',
    39.415::numeric, -119.225::numeric,
    'https://www.hipcamp.com/en-US/land/nevada-lahontan-shores-high-desert-retreat-6p0h6lm6',
    $$Lahontan Shores High Desert Retreat — private Hipcamp glamping host on Lahontan Reservoir / high-desert shoreline near Silver Springs. Canvas glamping with lake and desert access; verify unit types, hookups, and booking calendar on Hipcamp.$$,
    $$Sources: Hipcamp (May 2026). Coordinates approximate (Silver Springs).$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Ruby Mountain Retreat',
    'Glamping Tent',
    'ruby-mountain-retreat-spring-creek-nv',
    'Glamping Resort',
    'Safari Tent',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Spring Creek',
    'Spring Creek, NV (Ruby Mountains foothills; confirm address with host)',
    40.726::numeric, -115.622::numeric,
    'https://www.hipcamp.com/en-US/land/nevada-ruby-mountain-retreat-2ejh8lk1',
    $$Ruby Mountain Retreat — Hipcamp glamping near Spring Creek / Elko area at the base of the Ruby Mountains. Private-land canvas camping with mountain recreation access; distinct from Ruby 360 Lodge (Lamoille). Verify rates and unit inventory on Hipcamp.$$,
    $$Sources: Hipcamp (May 2026). Not Ruby 360 Lodge.$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Sunshine, Serenity and Sierras',
    'Glamping Tent',
    'sunshine-serenity-sierras-reno-nv',
    'Glamping Resort',
    'Safari Tent',
    'Sage', 'web_research_2026_05_nv',
    'United States', 'NV', 'Reno',
    'Reno, NV area (confirm address with host)',
    39.450::numeric, -119.750::numeric,
    'https://www.hipcamp.com/en-US/land/nevada-sunshine-serenity-and-sierras-4nelhn0m',
    $$Sunshine, Serenity and Sierras — Reno-area private-land Hipcamp glamping with Sierra Nevada views. Furnished tent camping; verify exact location, amenities, and seasonal access on Hipcamp listing.$$,
    $$Sources: Hipcamp (May 2026).$$,
    '2026-05-18', '2026-05-18', 'private_commercial'
  )
) AS v(
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.all_glamping_properties p
  WHERE UPPER(TRIM(p.state)) IN ('NV', 'NEVADA')
    AND lower(trim(p.property_name)) = lower(trim(v.property_name))
);
