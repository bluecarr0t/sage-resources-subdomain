-- Canada multi-location glamping brands (May 2026 web research):
--   Huttopia (QC: Sutton, Les Deux Lacs – Laurentides) — canada-usa.huttopia.com
--   Sundance by Basecamp (AB: Kananaskis) — basecampresorts.com/sundancekananaskis
--   Charmed Resorts (AB: Crowsnest Pass / Blairmore, Mulhurst Bay) — charmedresorts.ca
-- Note: Charmed’s public site lists two Alberta villages only (no BC property found May 2026).
-- Safe to re-run (NOT EXISTS / guarded UPDATEs).

-- ---------------------------------------------------------------------------
-- Brand registry: Charmed Resorts
-- ---------------------------------------------------------------------------
INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, notes)
VALUES (
  'charmed-resorts',
  'Charmed Resorts',
  'standalone',
  'charmed resorts',
  'https://charmedresorts.ca/',
  'Storybook-themed tiny homes and cottages in Alberta (Crowsnest Pass and Mulhurst Bay).'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = COALESCE(EXCLUDED.website_url, glamping_brands.website_url),
  notes = EXCLUDED.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Huttopia Canada: normalize anchors + unit rows
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET
  country = 'Canada',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = COALESCE(is_open, 'Yes'),
  number_of_locations = 2,
  url = 'https://canada-usa.huttopia.com/en/site/sutton/',
  phone_number = COALESCE(phone_number, '+1 (844) 488-8674'),
  date_updated = '2026-05-26',
  updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id = b.id
  AND b.slug = 'huttopia'
  AND p.country ILIKE '%canada%'
  AND p.property_name = 'Huttopia Sutton';

UPDATE public.all_glamping_properties p
SET
  country = 'Canada',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = COALESCE(is_open, 'Yes'),
  number_of_locations = 2,
  url = 'https://canada-usa.huttopia.com/en/site/les-deux-lacs-laurentides/',
  phone_number = COALESCE(phone_number, '+1 (844) 488-8674'),
  date_updated = '2026-05-26',
  updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id = b.id
  AND b.slug = 'huttopia'
  AND p.country ILIKE '%canada%'
  AND p.property_name = 'Huttopia Les Deux Lacs – Laurentides';

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, phone_number,
  description, notes, date_added, date_updated,
  land_operator_category, brand_id, number_of_locations
)
SELECT
  'published', 'Yes', 'Yes',
  v.property_name, v.site_name, v.slug, 'Glamping', v.unit_type,
  'Sage', 'web_research_2026_05_ca_brands',
  'Canada', v.state, v.city,
  v.address, v.zip_code, v.lat, v.lon, v.url, v.phone,
  v.description, v.notes, '2026-05-26', '2026-05-26',
  'private_commercial', b.id, 2
FROM (VALUES
  (
    'Huttopia Sutton', 'THE BONAVENTURE', 'huttopia-sutton-bonaventure', 'Safari Tent',
    'QC', 'Sutton', '297 Chem. Maple', 'J0E 2K0', 45.1056253::numeric, -72.5858857::numeric,
    'https://canada-usa.huttopia.com/en/site/sutton/', '+1 450-915-2465',
    $$Huttopia Sutton — Bonaventure ready-to-camp tent in a 65-hectare Eastern Townships forest at the foot of Mont Sutton (canvas/wood tents and chalets).$$,
    $$Source: canada-usa.huttopia.com/en/site/sutton/ (May 2026).$$
  ),
  (
    'Huttopia Sutton', 'THE CANADIENNE ORIGIN', 'huttopia-sutton-canadienne-origin', 'Safari Tent',
    'QC', 'Sutton', '297 Chem. Maple', 'J0E 2K0', 45.1056253::numeric, -72.5858857::numeric,
    'https://canada-usa.huttopia.com/en/site/sutton/', '+1 450-915-2465',
    $$Huttopia Sutton — Canadienne Origin canvas tent category (Sutton QC).$$,
    $$Source: canada-usa.huttopia.com/en/site/sutton/ (May 2026).$$
  ),
  (
    'Huttopia Sutton', 'THE TRAPPEUR DUO NATURE W/ WOOD STOVE', 'huttopia-sutton-trappeur-duo-nature', 'Safari Tent',
    'QC', 'Sutton', '297 Chem. Maple', 'J0E 2K0', 45.1056253::numeric, -72.5858857::numeric,
    'https://canada-usa.huttopia.com/en/site/sutton/', '+1 450-915-2465',
    $$Huttopia Sutton — Trappeur Duo Nature tent with wood stove (Sutton QC).$$,
    $$Source: canada-usa.huttopia.com/en/site/sutton/ (May 2026).$$
  ),
  (
    'Huttopia Sutton', 'THE LITTLE TRAPPERS', 'huttopia-sutton-little-trappers', 'Safari Tent',
    'QC', 'Sutton', '297 Chem. Maple', 'J0E 2K0', 45.1056253::numeric, -72.5858857::numeric,
    'https://canada-usa.huttopia.com/en/site/sutton/', '+1 450-915-2465',
    $$Huttopia Sutton — Little Trappers family tent category (Sutton QC).$$,
    $$Source: canada-usa.huttopia.com/en/site/sutton/ (May 2026).$$
  ),
  (
    'Huttopia Les Deux Lacs – Laurentides', 'THE CANADIENNE W/ WOOD STOVE', 'huttopia-les-deux-lacs-canadienne', 'Safari Tent',
    'QC', 'Lac-Supérieur', 'Chemin du Lac-Caribou', NULL, 46.037321::numeric, -74.4750969::numeric,
    'https://canada-usa.huttopia.com/en/site/les-deux-lacs-laurentides/', '+1 (844) 488-8674',
    $$Huttopia Les Deux Lacs – Laurentides in Parc Éco-Laurentides between two swimmable lakes (~90 min from Montreal).$$,
    $$Source: canada-usa.huttopia.com/en/site/les-deux-lacs-laurentides/ (May 2026).$$
  ),
  (
    'Huttopia Les Deux Lacs – Laurentides', 'THE CHALET W/ STOVE', 'huttopia-les-deux-lacs-chalet', 'Cabin',
    'QC', 'Lac-Supérieur', 'Chemin du Lac-Caribou', NULL, 46.037321::numeric, -74.4750969::numeric,
    'https://canada-usa.huttopia.com/en/site/les-deux-lacs-laurentides/', '+1 (844) 488-8674',
    $$Huttopia Les Deux Lacs — wood chalet with stove in the Laurentians eco-park setting.$$,
    $$Source: canada-usa.huttopia.com/en/site/les-deux-lacs-laurentides/ (May 2026).$$
  ),
  (
    'Huttopia Les Deux Lacs – Laurentides', 'THE TRAPPEUR W/ WOOD STOVE', 'huttopia-les-deux-lacs-trappeur', 'Safari Tent',
    'QC', 'Lac-Supérieur', 'Chemin du Lac-Caribou', NULL, 46.037321::numeric, -74.4750969::numeric,
    'https://canada-usa.huttopia.com/en/site/les-deux-lacs-laurentides/', '+1 (844) 488-8674',
    $$Huttopia Les Deux Lacs — Trappeur tent with wood stove between Trout and Caribou lakes.$$,
    $$Source: canada-usa.huttopia.com/en/site/les-deux-lacs-laurentides/ (May 2026).$$
  )
) AS v(property_name, site_name, slug, unit_type, state, city, address, zip_code, lat, lon, url, phone, description, notes)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'huttopia'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e
    WHERE e.property_name = v.property_name
      AND e.site_name IS NOT DISTINCT FROM v.site_name
  );

-- ---------------------------------------------------------------------------
-- Sundance by Basecamp (Kananaskis): normalize + accommodation SKUs
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET
  country = 'Canada',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = COALESCE(is_open, 'Yes'),
  number_of_locations = 1,
  url = 'https://www.basecampresorts.com/sundancekananaskis/',
  date_updated = '2026-05-26',
  updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id = b.id
  AND b.slug = 'sundance-by-basecamp'
  AND p.property_name = 'Sundance by Basecamp';

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, phone_number,
  description, notes, date_added, date_updated,
  land_operator_category, brand_id, number_of_locations
)
SELECT
  'published', 'Yes', 'Yes',
  v.property_name, v.site_name, v.slug, 'Glamping Resort', v.unit_type,
  'Sage', 'web_research_2026_05_ca_brands',
  'Canada', 'AB', 'Kananaskis',
  '2 Sundance Rd #40', 50.953429::numeric, -115.1233627::numeric,
  'https://www.basecampresorts.com/sundancekananaskis/', '+1 403-591-0606',
  v.description, v.notes, '2026-05-26', '2026-05-26',
  'private_commercial', b.id, 1
FROM (VALUES
  (
    'Sundance by Basecamp', 'Tipis', 'sundance-by-basecamp-kananaskis-tipis', 'Tipi',
    $$Sundance by Basecamp Kananaskis — luxury tipis in the Canadian Rockies with mountain views and on-site guest services.$$,
    $$Source: basecampresorts.com/sundancekananaskis/ (May 2026).$$
  ),
  (
    'Sundance by Basecamp', 'Trapper Tents', 'sundance-by-basecamp-kananaskis-trapper-tents', 'Safari Tent',
    $$Sundance by Basecamp Kananaskis — riverside trapper-style canvas tents.$$,
    $$Source: basecampresorts.com/room-details/sundance-kananaskis-trapper-tents/ (May 2026).$$
  ),
  (
    'Sundance by Basecamp', 'Family Tipi Riverside', 'sundance-by-basecamp-kananaskis-family-tipi', 'Tipi',
    $$Sundance by Basecamp Kananaskis — family riverside tipi accommodations.$$,
    $$Source: basecampresorts.com/room-details/sundance-kananaskis-family-tipi-riverside/ (May 2026).$$
  ),
  (
    'Sundance by Basecamp', 'Deluxe Glamping Tent', 'sundance-by-basecamp-kananaskis-deluxe-tent', 'Safari Tent',
    $$Sundance by Basecamp Kananaskis — deluxe furnished glamping tents.$$,
    $$Source: basecampresorts.com/room-details/sundance-by-basecamp-deluxe-glamping-tent/ (May 2026).$$
  ),
  (
    'Sundance by Basecamp', 'Campsites', 'sundance-by-basecamp-kananaskis-campsites', 'Campsite',
    $$Sundance by Basecamp Kananaskis — front-country campsites alongside tipis and glamping tents.$$,
    $$Source: basecampresorts.com/room-details/sundance-by-basecamp-campsites/ (May 2026).$$
  ),
  (
    'Sundance by Basecamp', 'Bell Canvas Tent', 'sundance-by-basecamp-kananaskis-bell-tent', 'Bell Tent',
    $$Sundance by Basecamp Kananaskis — canvas bell tent stays.$$,
    $$Source: basecampresorts.com/room-details/sundance-by-basecamp-glamping-bell-canvas-tent/ (May 2026).$$
  )
) AS v(property_name, site_name, slug, unit_type, description, notes)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'sundance-by-basecamp'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e
    WHERE e.property_name = v.property_name
      AND e.site_name IS NOT DISTINCT FROM v.site_name
  );

-- ---------------------------------------------------------------------------
-- Charmed Resorts: split locations, fix coordinates, brand backfill
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET
  property_name = 'Charmed Resorts — Crowsnest Pass',
  slug = 'charmed-resorts-crowsnest-pass-ab',
  country = 'Canada',
  state = 'AB',
  city = 'Blairmore',
  address = '13029 25th Avenue',
  zip_code = 'T0K 0E0',
  lat = 49.61247,
  lon = -114.43875,
  url = 'https://charmedresorts.ca/locations/crowsnest-pass',
  phone_number = '+1-844-543-9273',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = COALESCE(is_open, 'Yes'),
  number_of_locations = 2,
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'charmed-resorts'),
  description = $$Charmed Resorts — Crowsnest Pass (Blairmore, AB): storybook-themed cottages and tiny homes with wood-fired hot tubs in the Alberta Rockies. Two fairytale villages on one resort footprint near Crowsnest Pass wildlife and hiking.$$,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Renamed from generic Charmed Resorts; coords/address from charmedresorts.ca JSON-LD.',
  date_updated = '2026-05-26',
  updated_at = now()
WHERE p.property_name = 'Charmed Resorts'
  AND p.city ILIKE 'Blairmore';

UPDATE public.all_glamping_properties p
SET
  property_name = 'Charmed Resorts — Mulhurst Bay',
  slug = 'charmed-resorts-mulhurst-bay-ab',
  country = 'Canada',
  state = 'AB',
  city = 'Mulhurst Bay',
  address = '3423 50th Avenue',
  zip_code = 'T0C 2V0',
  lat = 53.045848,
  lon = -113.981772,
  url = 'https://charmedresorts.ca/locations/mulhurst-bay',
  phone_number = '+1-844-543-9273',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = COALESCE(is_open, 'Yes'),
  number_of_locations = 2,
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'charmed-resorts'),
  description = $$Charmed Resorts — Mulhurst Bay (Alberta): second Charmed village with handcrafted storybook cottages on Pigeon Lake — fairy-tale design, hot tubs, and lake-country outdoor activities.$$,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Corrected swapped lat/lon; address from charmedresorts.ca JSON-LD.',
  date_updated = '2026-05-26',
  updated_at = now()
WHERE p.property_name = 'Charmed Resorts'
  AND p.city ILIKE 'Mulhurst%';

-- Representative storybook cottage SKUs (Crowsnest Pass village)
INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, phone_number,
  description, notes, date_added, date_updated,
  land_operator_category, brand_id, number_of_locations
)
SELECT
  'published', 'Yes', 'Yes',
  'Charmed Resorts — Crowsnest Pass', v.site_name,
  'charmed-resorts-crowsnest-' || v.slug_suffix,
  'Glamping Resort', 'Cottage',
  'Sage', 'web_research_2026_05_ca_brands',
  'Canada', 'AB', 'Blairmore',
  '13029 25th Avenue', 'T0K 0E0', 49.61247::numeric, -114.43875::numeric,
  'https://charmedresorts.ca/locations/crowsnest-pass', '+1-844-543-9273',
  v.description, v.notes, '2026-05-26', '2026-05-26',
  'private_commercial', b.id, 2
FROM (VALUES
  (
    'Snow White''s Cottage', 'snow-white-cottage',
    $$Snow White themed storybook cottage at Charmed Resorts Crowsnest Pass.$$,
    $$Source: charmedresorts.ca/locations (May 2026).$$
  ),
  (
    'Cinderella''s Cottage', 'cinderella-cottage',
    $$Cinderella themed cottage — fairytale interiors and outdoor hot tub.$$,
    $$Source: charmedresorts.ca/locations (May 2026).$$
  ),
  (
    'Rapunzel''s Cottage', 'rapunzel-cottage',
    $$Rapunzel tower-inspired cottage at the Crowsnest Pass village.$$,
    $$Source: charmedresorts.ca/locations (May 2026).$$
  ),
  (
    'Gingerbread Cottage', 'gingerbread-cottage',
    $$Gingerbread-themed cottage with handcrafted storybook details.$$,
    $$Source: charmedresorts.ca/locations (May 2026).$$
  ),
  (
    'Hobbit Hole', 'hobbit-hole',
    $$Hobbit-hole style underground-inspired cottage unit.$$,
    $$Source: charmedresorts.ca/locations (May 2026).$$
  )
) AS v(site_name, slug_suffix, description, notes)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'charmed-resorts'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e
    WHERE e.property_name = 'Charmed Resorts — Crowsnest Pass'
      AND e.site_name IS NOT DISTINCT FROM v.site_name
  );
