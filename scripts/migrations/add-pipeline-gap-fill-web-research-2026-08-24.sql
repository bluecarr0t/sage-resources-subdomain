-- Confirmed pipeline gap-fill (Aug 2026 web research).
-- discovery_source = web_research_2026_08_pipeline_gap_fill
-- research_status = in_progress
-- Safe to re-run (slug-guarded INSERTs; targeted UPDATEs).

-- Miners Camp (Canmore): application still under review — Proposed, not construction.
UPDATE public.all_sage_data
SET
  research_status = 'in_progress',
  is_open = 'Proposed Development',
  is_glamping_property = 'Yes',
  quantity_of_units = COALESCE(quantity_of_units, 74),
  property_total_sites = COALESCE(property_total_sites, 74),
  discovery_source = COALESCE(discovery_source, 'web_research_2026_08_pipeline_gap_fill'),
  date_updated = '2026-08-24',
  notes = COALESCE(notes, '') || E'\n\nAug 2026: Town of Canmore received Miners Camp development permit (74 wall-tent sites, 3 phases) on 9.7 ha Staircase Lands east of Quarry Lake (Feb 2026). Treat as Proposed Development until permits and construction are verified (web_research_2026_08_pipeline_gap_fill).'
WHERE slug = 'miners-camp-canmore-proposed'
  AND country ILIKE 'Canada';

-- Columbia Wetlands: density reduced 90 → 45 after public feedback.
UPDATE public.all_sage_data
SET
  research_status = 'in_progress',
  is_open = 'Proposed Development',
  quantity_of_units = 45,
  date_updated = '2026-08-24',
  notes = COALESCE(notes, '') || E'\n\nAug 2026: Developers reduced planned sites from 90 to 45 after RDEK / resident feedback (Modern Campground). Still Proposed Development (web_research_2026_08_pipeline_gap_fill).',
  description = $$Private developer (Haworth Development Consulting) seeks RDEK zoning/OCP amendments for a nature-based glamping campground on 42.5 acres near Wilmer: mix of prospector tents, small cottages, and stationary units, 20 m Columbia Wetlands buffer, on-site wells/septic, no guest RVs. Density revised from 90 to 45 sites after public opposition—proposed only until regional approval and construction are verified.$$
WHERE slug = 'columbia-wetlands-glamping-resort-wilmer-bc'
  AND country ILIKE 'Canada';

INSERT INTO public.all_sage_data (
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
  v.site_name,
  v.slug,
  'Glamping Resort',
  v.unit_type,
  'Sage',
  'web_research_2026_08_pipeline_gap_fill',
  v.country,
  v.state,
  v.city,
  v.address,
  v.lat::numeric,
  v.lon::numeric,
  v.url,
  v.description,
  v.notes,
  '2026-08-24',
  '2026-08-24',
  'private_commercial',
  v.quantity_of_units::numeric
FROM (VALUES
  (
    'in_progress',
    'Proposed Development',
    'Wildfire Lodge',
    NULL,
    'wildfire-lodge-urbana-il',
    'Cabin',
    'United States',
    'IL',
    'Urbana',
    'Urbana Township, Champaign County, IL (PIN 30-21-02-302-012; ~15.3 acres in AG-2)',
    40.1106,
    -88.2073,
    'http://www.champaigncountyil.gov/CountyBoard/ZBA/2026/260528/260528_207-S-26%20Preliminary%20Memo.pdf',
    $$Jennifer Ash (Wildfire Lodge) seeks a Champaign County special use permit (CASE 207-S-26) for a boutique lodging operation on ~15 acres in Urbana Township: eight park-model cabins with outdoor recreation space, sauna and fitness buildings, greenhouse gathering space, pond, restroom building, and internal walking paths. Applicant materials describe a low-density, non-RV-park product—proposed pipeline until ZBA approval, building permits, and guest bookings are verified.$$,
    $$Sources: Champaign County ZBA CASE 207-S-26 preliminary memo (May 2026) (web_research_2026_08_pipeline_gap_fill). Coordinates approximate (Urbana). Distinct from Wildlife Prairie Park RV campground (Peoria County).$$,
    '8'
  ),
  (
    'in_progress',
    'Under Construction',
    'Prairie Junction Prairie Haven',
    'Prairie Haven',
    'prairie-junction-prairie-haven-stettler-ab',
    'Cabin',
    'Canada',
    'AB',
    'Stettler',
    'Prairie Junction RV Resort, Stettler, AB (Prairie Haven expansion pad)',
    52.323,
    -112.719,
    'https://moderncampground.com/canada/alberta/prairie-junction-rv-resort-to-add-themed-glamping-accommodations-in-winter-2026-expansion/',
    $$Prairie Junction RV Resort (Stettler, Alberta) is adding Prairie Haven: nine themed glamping accommodations (destination-inspired units including The Aloha, The Paris, The Wrangler, and others) in partnership with Travel Alberta, marketed as a Winter 2026 opening. Row tracks the glamping expansion only—treat as under construction until the themed units accept public bookings.$$,
    $$Sources: Modern Campground / Daily Hive / operator Facebook (web_research_2026_08_pipeline_gap_fill). Coordinates approximate (Stettler). Distinct from the existing RV park inventory.$$,
    '9'
  )
) AS v(
  research_status,
  is_open,
  property_name,
  site_name,
  slug,
  unit_type,
  country,
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
  SELECT 1 FROM public.all_sage_data e WHERE e.slug = v.slug
);

-- Seed status history for newly inserted gap-fill rows that have none yet.
INSERT INTO glamping_pipeline_status_history (
  property_id,
  slug,
  is_open,
  started_on,
  change_source,
  notes
)
SELECT
  p.id,
  p.slug,
  p.is_open,
  COALESCE(NULLIF(TRIM(p.date_added), '')::date, CURRENT_DATE),
  'manual_script',
  'Initial stint from web_research_2026_08_pipeline_gap_fill.'
FROM public.all_sage_data p
WHERE p.discovery_source = 'web_research_2026_08_pipeline_gap_fill'
  AND p.slug IN (
    'wildfire-lodge-urbana-il',
    'prairie-junction-prairie-haven-stettler-ab'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM glamping_pipeline_status_history h
    WHERE h.property_id = p.id
  );
