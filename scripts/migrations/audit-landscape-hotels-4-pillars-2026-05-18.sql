-- Landscape Hotel 4-pillar audit (May 2026).
-- Definition: (1) low-impact elevated/modular invisible architecture,
-- (2) dispersed freestanding pavilions, no central tower,
-- (3) nature-centric glass/minimal interiors,
-- (4) radical eco-stewardship / removable footprint.
-- discovery_source suffix: web_research_2026_05_landscape_hotels_4_pillars
-- Scoring: C=confirmed (3-4 pillars), P=partial (2 pillars), R=rejected (0-1 pillars)

-- Reference archetype: Ambiente Sedona
UPDATE public.all_glamping_properties SET
  property_type = 'Landscape Hotel',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars',
  description = $$Ambiente Sedona: first U.S. landscape hotel (per operator)—40 adults-only glass-walled Atrium suites on elevated steel structures across red-rock terrain; floor-to-ceiling glass, restrained interiors, biophilic design; no central guest tower; suites accessed via desert paths. Pillar audit (May 2026): P1 elevated/modular YES | P2 dispersed pavilions YES | P3 glass/minimal YES | P4 eco-stewardship PARTIAL (verify solar/removable claims with operator).$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit (May 2026): CONFIRMED reference. Score 4/4 operational pillars. Sources: ambientesedona.com/landscape, LHW listing.',
  date_updated = '2026-05-18'
WHERE property_name ILIKE 'Ambiente%';

-- CONFIRMED: update descriptions for true landscape hotels (anchor rows only via property_name match on min id subquery pattern - apply all rows per property)

UPDATE public.all_glamping_properties SET
  description = $$Loire Valley Lodges (France): 18 freestanding artist-designed lodges scattered through ~750 acres of private forest—no central hotel block; each lodge is a private pavilion with floor-to-ceiling glazing and minimal interiors focused on the canopy. Pillar audit: P1 PARTIAL | P2 YES | P3 YES | P4 PARTIAL.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: CONFIRMED (3/4). Room + Wild 2025 list.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'Loire Valley Lodges';

UPDATE public.all_glamping_properties SET
  description = $$Oasyhotel (Tuscany): WWF-affiliated nature reserve hotel with dispersed Dynamo / canvas-and-timber lodges placed in wild parkland—modular low-impact units, nature-first minimal interiors, strong sustainability mandate. Pillar audit: P1 YES | P2 YES | P3 YES | P4 YES.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: CONFIRMED (4/4). oasyhotel.com.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'Oasyhotel';

UPDATE public.all_glamping_properties SET
  description = $$The Tawny (UK): "Deconstructed hotel"—shepherd huts, treehouses, lookouts, and retreats scattered across two Staffordshire estates in wild woodland; no conventional central corridor hotel. Pillar audit: P1 PARTIAL | P2 YES | P3 YES | P4 PARTIAL.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: CONFIRMED (3/4). thetawny.co.uk.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'The Tawny';

UPDATE public.all_glamping_properties SET
  description = $$Manshausen Island Resort (Norway): Snøhetta-designed sea cabins on stilts over the Arctic waters—four freestanding glass-walled cabins with panoramic views and restrained Nordic minimalism; island setting with wild coastal terrain between units. Pillar audit: P1 YES | P2 YES (minor service building) | P3 YES | P4 PARTIAL.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: CONFIRMED (3/4). manshausen.com.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'Manshausen Island Resort';

UPDATE public.all_glamping_properties SET
  description = $$Fogo Island Inn (Canada): Iconic stilted modern inn on North Atlantic coast—architecture celebrates landscape with floor-to-ceiling views and local craft minimalism; single main building on piles (fails strict "no main building" test) but exemplary P1/P3/P4 design ethos. Pillar audit: P1 YES | P2 PARTIAL | P3 YES | P4 PARTIAL.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: PARTIAL CONFIRMED (3/4)—retain as landscape hotel with caveat on dispersed layout.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'Fogo Island Inn';

UPDATE public.all_glamping_properties SET
  description = $$Seehof Nature Retreat (South Tyrol): Nature-integrated retreat with dispersed lodge/suite inventory in alpine landscape setting—minimal interiors oriented to meadow and mountain views. Pillar audit: verify modular/stilt construction on site; provisional P2/P3 YES.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: PARTIAL CONFIRMED (pending P1/P4 verification).',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'Seehof Nature Retreat';

UPDATE public.all_glamping_properties SET
  description = $$Gundari (Folegandros, Greece): Cliffside resort of minimalist suites/villas integrated into Cycladic landscape—strong P3 nature views and low visual clutter; suites are fixed masonry (not modular/removable). Pillar audit: P1 NO | P2 PARTIAL | P3 YES | P4 PARTIAL.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: PARTIAL—landscape positioning but not modular/stilt architecture.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'Gundari';

UPDATE public.all_glamping_properties SET
  description = $$La Manigua Lodge (Colombia): Low-density luxury lodges in tropical forest reserve—dispersed pavilion-style accommodations oriented to nature immersion per Room + Wild landscape hotel feature. Pillar audit: P2/P3 YES; verify P1/P4 with operator.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: PARTIAL CONFIRMED pending site verification.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'La Manigua Lodge';

UPDATE public.all_glamping_properties SET
  description = $$RESET Hotel Joshua Tree: Off-grid desert retreat with standalone guest units designed for landscape immersion and sustainability narrative in Joshua Tree boulder terrain. Pillar audit: P1/P2/P4 strong; verify construction type.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: PARTIAL CONFIRMED (eco desert pods).',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars'
WHERE property_name = 'RESET Hotel Joshua Tree';

-- Post Ranch Inn: upgrade classification
UPDATE public.all_glamping_properties SET
  property_type = 'Landscape Hotel',
  description = $$Post Ranch Inn (Big Sur): 40 acres of freestanding cliff houses, treehouses, and meadow pavilions—no central hotel tower; dramatic glass walls and minimal interiors framed on Pacific views. Not modular/removable (conventional luxury construction). Pillar audit: P1 PARTIAL | P2 YES | P3 YES | P4 NO.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: PARTIAL CONFIRMED (3/4)—dispersed pavilion model fits pillars 2-3.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars',
  date_updated = '2026-05-18'
WHERE property_name = 'Post Ranch Inn';

-- Cuixmala: upgrade classification
UPDATE public.all_glamping_properties SET
  property_type = 'Landscape Hotel',
  description = $$Cuixmala (Mexico): 25,000-acre nature reserve with low-density casitas/bungalows scattered across jungle and beach—no high-rise; landscape-first hospitality. Pillar audit: P1 PARTIAL | P2 YES | P3 YES | P4 PARTIAL.$$,
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit: PARTIAL CONFIRMED—reserve-scale dispersed layout.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars',
  date_updated = '2026-05-18'
WHERE property_name = 'Cuixmala';

-- REJECTED: traditional resorts mis-tagged as landscape hotels
UPDATE public.all_glamping_properties SET
  research_status = 'rejected',
  property_type = 'Luxury Resort',
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit (May 2026): REJECTED—not a landscape hotel. Central resort/spa with conventional buildings; fails P1 elevated modular, P2 dispersed pavilions, and/or P4 removable footprint.',
  discovery_source = 'web_research_2026_05_landscape_hotels_4_pillars',
  date_updated = '2026-05-18'
WHERE property_name IN (
  'Civana Carefree Resort & Spa',
  'Miraval Arizona Resort & Spa',
  'Sanctuary Camelback Mountain, A Gurney''s Resort',
  'Amangani',
  'Rancho La Puerta',
  'Wickaninnish Inn',
  'Sonora Resort',
  'Cathedral Mountain Lodge',
  'Tweedsmuir Park Lodge',
  'Little Wolf Resort',
  'Bison Lodge Revelstoke',
  'Hotel Quintessence',
  'Le Germain Hotel Charlevoix',
  'Wildflower Farms, Auberge Resorts Collection',
  'Stanly Ranch, Auberge Resorts Collection',
  'The Lodge at Blue Sky, Auberge Resorts Collection',
  'One&Only Moonlight Basin',
  'Hotel Domestique',
  'Falling Rock at Nemacolin',
  'Caldera House',
  'Sheldon Chalet',
  'The Compton',
  'Populus',
  'The Newt in Somerset',
  'AWOL Kennebunkport'
) AND property_type = 'Landscape Hotel';

-- Amangiri: published but not true landscape hotel per 4 pillars
UPDATE public.all_glamping_properties SET
  notes = COALESCE(notes, '') || E'\n\n4-pillar audit (May 2026): NOT a strict landscape hotel—desert concrete/masonry camp suites; fails P1 modular/stilt and P4 removable footprint. Retain published comp set as desert luxury.',
  date_updated = '2026-05-18'
WHERE property_name = 'Amangiri';

-- NEW: true landscape hotels from Room + Wild 2025 + pillar research
INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  url, description, notes, date_added, date_updated, land_operator_category
) VALUES
(
  'in_progress', 'Yes', 'Yes',
  'Wild Coast Tented Lodge', 'Cocoon Suite', 'wild-coast-tented-lodge-sri-lanka',
  'Landscape Hotel', 'Tent',
  'Sage', 'web_research_2026_05_landscape_hotels_4_pillars',
  'Sri Lanka', 'Southern Province', 'Yala',
  'https://www.resplendentceylon.com/wild-coast-tented-lodge/',
  $$Wild Coast Tented Lodge (Yala, Sri Lanka): Resplendent Ceylon "luxury tented camp" with cocoon-shaped fabric pavilions set among dunes and boulders near Yala—dispersed suite tents with panoramic glazing and minimal interiors; low-impact safari-lodge model. Pillar audit: P1 YES | P2 YES | P3 YES | P4 PARTIAL.$$,
  $$Room + Wild 2025 landscape hotels list. Verify unit count and rates with Resplendent Ceylon.$$,
  '2026-05-18', '2026-05-18', 'private_commercial'
),
(
  'in_progress', 'Yes', 'Yes',
  'Suitree Experience Hotel', 'Treehouse Suite', 'suitree-experience-hotel-costa-rica',
  'Landscape Hotel', 'Treehouse',
  'Sage', 'web_research_2026_05_landscape_hotels_4_pillars',
  'Costa Rica', 'Guanacaste', 'Nicoya Peninsula',
  'https://www.suitree.com/',
  $$Suitree Experience Hotel (Costa Rica): Elevated treehouse suites in dry tropical forest—freestanding units with glass walls and minimal interiors immersed in canopy; no central hotel block. Pillar audit: P1 YES (elevated treehouses) | P2 YES | P3 YES | P4 PARTIAL.$$,
  $$Room + Wild 2025 SKY category. Verify ADR and unit count.$$,
  '2026-05-18', '2026-05-18', 'private_commercial'
),
(
  'in_progress', 'Yes', 'Yes',
  'Svart Hotel', 'Room', 'svart-hotel-norway',
  'Landscape Hotel', 'Room',
  'Sage', 'web_research_2026_05_landscape_hotels_4_pillars',
  'Norway', 'Nordland', 'Meløy',
  'https://www.svart.no/',
  $$Svart (Norway): World's first energy-positive hotel (per operator)—circular timber design on stilts over Holandsfjorden fjord with 360° views; radical eco-stewardship and low-impact architecture. Pillar audit: P1 YES | P2 PARTIAL (single ring building) | P3 YES | P4 YES.$$,
  $$Arctic Circle; verify operating status/seasonality with operator.$$,
  '2026-05-18', '2026-05-18', 'private_commercial'
);
