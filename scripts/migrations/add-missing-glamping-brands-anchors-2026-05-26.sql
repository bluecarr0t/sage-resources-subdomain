-- Missing glamping brand registry + anchor property rows (May 2026 web research).
-- Covers: Nightfall Camp, Paperbark Camp, Tanja Lagoon Camp, Eco Retreat Odisha,
--   Tathaastu Hospitality, The Bubble Retreat, Tentrr (platform brand only),
--   Timberline Glamping at Pine Acres (Lake Allatoona), Collective Hudson Valley.
-- Also: Collective Retreats brand_id backfill + Vail/Governors Island dedupe.
-- Safe to re-run (ON CONFLICT / WHERE NOT EXISTS guards).

-- ---------------------------------------------------------------------------
-- Extend chain label: Collective name variants → collective retreats
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sage_chain_label_from_property_name(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n              text := btrim(COALESCE(p_name, ''));
  ln             text;
  p              text;
  prefixes       text[] := ARRAY[
    'outdoor collection by marriott bonvoy',
    'collective retreats',
    'nightfall camp',
    'paperbark camp',
    'tanja lagoon camp',
    'eco retreat',
    'tathaastu',
    'the bubble retreat',
    'postcard cabins',
    'rvc outdoor destinations',
    'sundance by basecamp',
    'trailer inn lodging',
    'worldhotels backdrop',
    'douglas lake ranch',
    'terramor outdoor resort',
    'bliss camps glamping (rocky mountain glamping)',
    'bliss camps',
    'the glamping collective',
    'westgate river ranch resort & rodeo',
    'westgate river ranch',
    'glamping resorts ltd',
    'camp ferncrest',
    'timberline glamping at',
    'ulum',
    'under canvas',
    'wander camp',
    'timberline glamping co.',
    'timberline glamping',
    'getaway house',
    'brush creek ranch',
    'long live the simple life',
    'firelight camps',
    'nomadic resort',
    'autocamp',
    'huttopia',
    'getaway',
    'koa holiday',
    'trailer inn',
    'yogi bear''s jellystone park',
    'jellystone park',
    'koa'
  ];
BEGIN
  IF n = '' THEN
    RETURN '';
  END IF;

  ln := lower(n);

  FOREACH p IN ARRAY prefixes
  LOOP
    IF ln = p
      OR ln LIKE p || ' %'
      OR ln LIKE p || '-%'
      OR ln LIKE p || ' -%'
      OR ln LIKE p || ' –%'
      OR ln LIKE p || ' —%'
    THEN
      RETURN p;
    END IF;
  END LOOP;

  -- Collective Retreats portfolio (exclude unrelated "Collective" operators)
  IF ln LIKE 'collective %'
     AND ln NOT LIKE '%elemental collective%'
     AND ln NOT ILIKE '%glamping collective%'
  THEN
    RETURN 'collective retreats';
  END IF;

  IF strpos(n, ' — ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' — ') - 1)));
  END IF;
  IF strpos(n, ' – ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' – ') - 1)));
  END IF;
  IF strpos(n, ' - ') > 0 THEN
    RETURN lower(btrim(split_part(n, ' - ', 1)));
  END IF;

  RETURN lower(n);
END;
$$;

-- ---------------------------------------------------------------------------
-- Priority 2: Register brands
-- ---------------------------------------------------------------------------
INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, notes)
VALUES
  (
    'nightfall-camp',
    'Nightfall Camp',
    'standalone',
    'nightfall camp',
    'https://www.nightfall.com.au/',
    'Luxury glamping in Lamington National Park, Queensland, Australia (est. 2012).'
  ),
  (
    'paperbark-camp',
    'Paperbark Camp',
    'standalone',
    'paperbark camp',
    'https://www.paperbarkcamp.com.au/',
    'Safari-style luxury camp on Jervis Bay, NSW, Australia (est. 1999).'
  ),
  (
    'tanja-lagoon-camp',
    'Tanja Lagoon Camp',
    'standalone',
    'tanja lagoon camp',
    'https://www.tanjalagooncamp.com.au/',
    'Coastal Wilderness Ventures — Aboriginal-inspired safari tents on NSW South Coast.'
  ),
  (
    'eco-retreat-odisha',
    'Eco Retreat Odisha',
    'standalone',
    'eco retreat',
    'https://ecoretreat.odishatourism.gov.in/',
    'Odisha Tourism seasonal luxury glamping festival at multiple state destinations (est. 2022).'
  ),
  (
    'tathaastu-hospitality',
    'Tathaastu Hospitality & Travels',
    'standalone',
    'tathaastu',
    NULL,
    'Indian glamping operator (est. 2020); hill-station and trekking-region luxury camps. Distinct from Tathastu Resorts wildlife lodges.'
  ),
  (
    'the-bubble-retreat',
    'The Bubble Retreat',
    'standalone',
    'the bubble retreat',
    'https://thebubble.it/en/',
    'BlueForward eco-glamping domes in Umbria, Italy (est. 2021). Marche expansion via separate Bubble Marche operator.'
  ),
  (
    'tentrr',
    'Tentrr',
    'standalone',
    NULL,
    'https://www.tentrr.com/',
    'US glamping marketplace / platform connecting campers to private landowner sites (~1,000+ locations). Registry only — individual landowner sites are not inventoried as branded rows.'
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  brand_tier = EXCLUDED.brand_tier,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = COALESCE(EXCLUDED.website_url, glamping_brands.website_url),
  notes = EXCLUDED.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Priority 1: Anchor property rows
-- ---------------------------------------------------------------------------
INSERT INTO public.all_glamping_properties (
  research_status,
  is_glamping_property,
  is_open,
  property_name,
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
  brand_id,
  number_of_locations,
  glamping_service_tier,
  glamping_service_tier_source,
  glamping_service_tier_notes
)
SELECT
  v.research_status,
  v.is_glamping_property,
  v.is_open,
  v.property_name,
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
  v.land_operator_category,
  (SELECT id FROM public.glamping_brands WHERE slug = v.brand_slug),
  v.number_of_locations,
  v.glamping_service_tier,
  v.glamping_service_tier_source,
  v.glamping_service_tier_notes
FROM (
  VALUES
  (
    'published', 'Yes', 'Yes',
    'Nightfall Camp',
    'nightfall-camp-lamington-qld',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'Australia', 'QLD', 'Lamington',
    '2776 Beechmont Rd, Lamington QLD 4285',
    -28.2073::numeric, 153.1353::numeric,
    'https://www.nightfall.com.au/',
    $$Luxury safari-style glamping beside Lamington National Park rainforest and pristine creeks in Queensland. Founded 2012; wellness-focused stays with organic cuisine, yoga, natural spa treatments, and guided bushwalks in a secluded setting.$$,
    $$Sources: nightfall.com.au (May 2026 web research). Also marketed as Nightfall Camp Pty Ltd.$$,
    '2026-05-26', '2026-05-26', 'private_commercial', 'nightfall-camp', 1,
    'luxury', 'manual', 'Australian luxury rainforest glamping pioneer.'
  ),
  (
    'published', 'Yes', 'Yes',
    'Paperbark Camp',
    'paperbark-camp-woollamia-nsw',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'Australia', 'NSW', 'Woollamia',
    '571 Woollamia Rd, Woollamia NSW 2540',
    -34.9830::numeric, 150.7330::numeric,
    'https://www.paperbarkcamp.com.au/',
    $$Pioneering Australian glamping on Jervis Bay (est. 1999): luxury tents in bushland near pristine beaches, treetop dining at The Gunyah, wine tastings, and coastal excursions in New South Wales.$$,
    $$Sources: paperbarkcamp.com.au schema.org address (May 2026 web research).$$,
    '2026-05-26', '2026-05-26', 'private_commercial', 'paperbark-camp', 1,
    'luxury', 'manual', '25th-anniversary Australian glamping flagship.'
  ),
  (
    'published', 'Yes', 'Yes',
    'Tanja Lagoon Camp',
    'tanja-lagoon-camp-tanja-nsw',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'Australia', 'NSW', 'Tanja',
    '795 Arthur Kaines Rd, Tanja NSW 2550',
    -36.6250::numeric, 149.9260::numeric,
    'https://www.tanjalagooncamp.com.au/',
    $$Coastal Wilderness Ventures operates this Aboriginal-inspired safari tent camp on the NSW South Coast near Bega. Beachfront lagoon setting with eco-cabins, dining, and family-focused nature experiences on Australia's Sapphire Coast.$$,
    $$Sources: tanjalagooncamp.com.au (May 2026 web research). Operator: Coastal Wilderness Ventures.$$,
    '2026-05-26', '2026-05-26', 'private_commercial', 'tanja-lagoon-camp', 1,
    'upscale', 'manual', 'NSW South Coast eco-glamping.'
  ),
  (
    'published', 'Yes', 'Yes',
    'Eco Retreat Konark',
    'eco-retreat-konark-odisha',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'India', 'Odisha', 'Konark',
    'Ramchandi Beach / Chandrabhaga Beach area, Konark, Odisha',
    19.8870::numeric, 86.0940::numeric,
    'https://ecoretreat.odishatourism.gov.in/',
    $$Seasonal Odisha Tourism luxury glamping on Konark's Ramchandi/Chandrabhaga beachfront with air-conditioned tents, Sun Temple views, cultural performances, guided tours, and water sports. Part of the annual Eco Retreat Odisha festival (2025–26 season through ~March 2026).$$,
    $$Sources: utsav.gov.in, moderncampground.com Konark Eco Retreat 2025-26, bookodisha.com (May 2026 web research).$$,
    '2026-05-26', '2026-05-26', 'other_public', 'eco-retreat-odisha', 6,
    'upscale', 'manual', 'Flagship beachfront Eco Retreat venue.'
  ),
  (
    'published', 'Yes', 'Yes',
    'Eco Retreat Daringbadi',
    'eco-retreat-daringbadi-odisha',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'India', 'Odisha', 'Daringbadi',
    'Daringbadi hill station, Kandhamal district, Odisha',
    19.9090::numeric, 84.1310::numeric,
    'https://ecoretreat.odishatourism.gov.in/',
    $$Seasonal Eco Retreat Odisha hill-station glamping in Daringbadi ("Kashmir of Odisha"): luxury tents overlooking pine forests, coffee gardens, and valleys with curated adventure and cultural programming. Operates as part of the state winter glamping festival.$$,
    $$Sources: incredibleindia.gov.in, odishatour.in Eco Retreat 2025 (May 2026 web research).$$,
    '2026-05-26', '2026-05-26', 'other_public', 'eco-retreat-odisha', 6,
    'upscale', 'manual', 'Hill-station Eco Retreat venue.'
  ),
  (
    'published', 'Yes', 'Yes',
    'Tathaastu Glamping Resort Mussoorie',
    'tathaastu-glamping-resort-mussoorie',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'India', 'Uttarakhand', 'Mussoorie',
    'Mussoorie hills area, Uttarakhand (approx. 11 km from Mussoorie centre)',
    30.4590::numeric, 78.0660::numeric,
    'https://www.makemytrip.com/hotels/tathaastu_glamping_resort-details-mussoorie.html',
    $$Tathaastu Hospitality & Travels (est. 2020) luxury camp near Mussoorie with panoramic Himalayan views — representative flagship for the operator's India hill-station glamping portfolio (also reported at Auli/Joshimath and Kedarkantha).$$,
    $$Sources: makemytrip.com listing, GIS market profile (May 2026 web research). Operator also listed at Nahan Road / Auli / Kedarkantha — add site rows when canonical URLs confirmed. Not affiliated with Tathastu Resorts wildlife lodges.$$,
    '2026-05-26', '2026-05-26', 'private_commercial', 'tathaastu-hospitality', 3,
    'upscale', 'manual', 'Representative Tathaastu Hospitality anchor row.'
  ),
  (
    'published', 'Yes', 'Yes',
    'The Bubble Retreat',
    'the-bubble-retreat-monteleone-di-spoleto-italy',
    'Glamping Resort', 'Dome',
    'Sage', 'web_research_2026_05_brand_anchors',
    'Italy', 'Umbria', 'Monteleone di Spoleto',
    'Valnerina hills near Monteleone di Spoleto, Umbria',
    42.6500::numeric, 12.9500::numeric,
    'https://thebubble.it/en/',
    $$BlueForward (est. 2021) flagship geodesic dome glamping at ~1,000 m in Umbria's Valnerina. Eco-sustainable transparent domes with Casale Montebello hospitality, wellness focus, and stargazing — first Italian glamping dome concept of its kind.$$,
    $$Sources: thebubble.it, umbriaecultura.it (May 2026 web research). Separate Bubble Marche (bubblemarche.it) is a distinct Marche-region operator.$$,
    '2026-05-26', '2026-05-26', 'private_commercial', 'the-bubble-retreat', 1,
    'luxury', 'manual', 'BlueForward / The Bubble Retreat Umbria flagship.'
  ),
  (
    'published', 'Yes', 'Yes',
    'Timberline Glamping at Pine Acres',
    'timberline-glamping-at-pine-acres-acworth-ga',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'United States', 'GA', 'Acworth',
    '3963 Bartow Carver Rd SE, Acworth, GA 30102',
    34.1050::numeric, -84.6760::numeric,
    'https://lakeallatoona.tlglamping.com/',
    $$Timberline Glamping Co. location at Pine Acres Retreat on Lake Allatoona (opened 2024): upscale safari tents and domes on 216 acres with pool, trails, and lake access northwest of Atlanta.$$,
    $$Sources: moderncampground.com Feb 2024, mapquest.com / lakeallatoona.tlglamping.com (May 2026 web research). Also referenced as Timberline Glamping Lake Allatoona.$$,
    '2026-05-26', '2026-05-26', 'private_commercial', 'timberline-glamping-co', 1,
    'upscale', 'manual', 'Timberline Pine Acres / Lake Allatoona outpost.'
  ),
  (
    'published', 'Yes', 'Closed',
    'Collective Retreats Hudson Valley',
    'collective-retreats-hudson-valley-ghent-ny',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_brand_anchors',
    'United States', 'NY', 'Ghent',
    'Liberty Farms, Ghent, NY (historical Collective Retreats site)',
    42.6060::numeric, -73.6150::numeric,
    'https://www.collectiveretreats.com/retreat/collective-hudson-valley/',
    $$Former Collective Retreats upstate New York glamping at Liberty Farms near Hudson, NY — bucolic safari tents on a working organic farm (~2 hours from NYC). Listed historically on glamping directories; Collective's Hudson Valley URL now routes to generic retreats hub (May 2026) — treat as closed legacy site; active NY inventory is Collective Governors Island.$$,
    $$Sources: glamping.com Ghent listing, mytravelingkids.com retrospective (May 2026 web research). Operating status verified closed / not bookable May 2026.$$,
    '2026-05-26', '2026-05-26', 'private_commercial', 'collective-retreats', 1,
    'luxury', 'manual', 'Legacy Hudson Valley site — closed; retained for brand completeness.'
  )
) AS v(
  research_status, is_glamping_property, is_open,
  property_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, lat, lon,
  url, description, notes, date_added, date_updated,
  land_operator_category, brand_slug, number_of_locations,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties existing
  WHERE existing.slug = v.slug
     OR existing.property_name = v.property_name
);

-- ---------------------------------------------------------------------------
-- Priority 3: Collective Retreats — canonical naming, dedupe, brand backfill
-- ---------------------------------------------------------------------------

-- Canonical property_id for Governors Island (merge duplicate property anchors)
UPDATE public.all_glamping_properties p
SET
  property_name = 'Collective Retreats Governors Island',
  slug = 'collective-retreats-governors-island',
  property_id = '54752c1b-e4ae-4f5e-9f4c-65234d4b95cd'::uuid,
  url = COALESCE(NULLIF(btrim(p.url), ''), 'https://www.collectiveretreats.com/governors-island/'),
  city = 'New York',
  state = 'NY',
  country = 'United States',
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'collective-retreats'),
  date_updated = '2026-05-26',
  notes = COALESCE(p.notes, '') || E'\n\nDeduped to canonical Collective Retreats Governors Island property_id (May 2026 brand audit).'
WHERE p.property_name IN ('Collective Governors Island', 'Collective Retreats Governors Island');

-- Canonical property_id for Vail (merge Collective Vail duplicates)
UPDATE public.all_glamping_properties p
SET
  property_name = 'Collective Retreats Vail',
  slug = 'collective-retreats-vail',
  property_id = '64029283-bd01-4fe0-abba-1e5c04e60e21'::uuid,
  url = COALESCE(NULLIF(btrim(p.url), ''), 'https://www.collectiveretreats.com/retreat/collective-vail/'),
  city = 'Wolcott',
  state = 'CO',
  country = 'United States',
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'collective-retreats'),
  date_updated = '2026-05-26',
  notes = COALESCE(p.notes, '') || E'\n\nDeduped to canonical Collective Retreats Vail property_id (May 2026 brand audit).'
WHERE p.property_name IN ('Collective Vail', 'Collective Retreats Vail');

-- Hill Country legacy name alignment
UPDATE public.all_glamping_properties p
SET
  property_name = 'Collective Retreats Hill Country',
  slug = 'collective-retreats-hill-country',
  property_id = COALESCE(p.property_id, '946432a4-c5f2-402b-9aa6-c48eccde7050'::uuid),
  url = COALESCE(NULLIF(btrim(p.url), ''), 'https://www.collectiveretreats.com/retreat/collective-hill-country/'),
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'collective-retreats'),
  date_updated = '2026-05-26'
WHERE p.property_name ILIKE 'Collective%Hill Country%'
  AND p.property_name NOT ILIKE '%Glamping Collective%';

-- Backfill brand_id on all Collective Retreats portfolio rows
UPDATE public.all_glamping_properties p
SET
  brand_id = b.id,
  date_updated = '2026-05-26'
FROM public.glamping_brands b
WHERE b.slug = 'collective-retreats'
  AND p.is_glamping_property = 'Yes'
  AND p.property_name ILIKE 'Collective %'
  AND p.property_name NOT ILIKE '%Glamping Collective%'
  AND p.property_name NOT ILIKE '%Elemental%'
  AND p.brand_id IS DISTINCT FROM b.id;

-- Legacy chain-key backfill for new brands
UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    date_updated = '2026-05-26'
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.legacy_chain_key IS NOT NULL
  AND lower(public.sage_chain_label_from_property_name(p.property_name)) = b.legacy_chain_key;

-- Timberline Pine Acres explicit backfill (name uses "at Pine Acres" prefix)
UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    date_updated = '2026-05-26'
FROM public.glamping_brands b
WHERE b.slug = 'timberline-glamping-co'
  AND p.property_name = 'Timberline Glamping at Pine Acres'
  AND p.brand_id IS DISTINCT FROM b.id;

-- Sky Ridge Yurts: common "Sandy Ridge Yurts" misspelling alias (already published)
UPDATE public.all_glamping_properties p
SET
  notes = COALESCE(p.notes, '') || E'\n\nAlso frequently referenced as "Sandy Ridge Yurts" in glamping roundups — canonical operator name is Sky Ridge Yurts (Bryson City, NC).',
  date_updated = '2026-05-26'
WHERE p.property_name = 'Sky Ridge Yurts'
  AND COALESCE(p.notes, '') NOT ILIKE '%Sandy Ridge Yurts%';

-- Sibling brand_id alignment when property_id is set
WITH canonical AS (
  SELECT
    property_id,
    (mode() WITHIN GROUP (ORDER BY brand_id::text))::uuid AS brand_id
  FROM public.all_glamping_properties
  WHERE property_id IS NOT NULL
    AND brand_id IS NOT NULL
  GROUP BY property_id
)
UPDATE public.all_glamping_properties p
SET brand_id = c.brand_id,
    date_updated = '2026-05-26'
FROM canonical c
WHERE p.property_id = c.property_id
  AND p.brand_id IS DISTINCT FROM c.brand_id;
