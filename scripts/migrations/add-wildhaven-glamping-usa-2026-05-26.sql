-- Wildhaven Glamping — USA portfolio (May 2026 web research).
-- Operating: Wildhaven Sonoma (Healdsburg / Russian River), Wildhaven Yosemite (Mariposa).
-- Pipeline: Wildhaven Lake Berryessa (Spanish Flat — Napa County negotiation, not open).
-- Sources: wildhavensonoma.com, wildhavenyosemite.com, ResNexus booking links.
-- Safe to re-run (NOT EXISTS / guarded UPDATEs).

INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, notes)
VALUES (
  'wildhaven-glamping',
  'Wildhaven Glamping',
  'standalone',
  'wildhaven',
  'https://www.wildhavensonoma.com/',
  'California glamping operator: safari tents and insulated cabins on the Russian River (Sonoma) and near Yosemite (Mariposa).'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = COALESCE(EXCLUDED.website_url, glamping_brands.website_url),
  notes = EXCLUDED.notes,
  updated_at = now();

-- Remove erroneous third-party scrape (backeddy.ca) mislabeled as Wildhaven Sonoma Glamping
DELETE FROM public.all_glamping_properties
WHERE property_name = 'Wildhaven Sonoma Glamping'
  AND url ILIKE '%backeddy%';

-- ---------------------------------------------------------------------------
-- Operating properties: normalize + brand backfill
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET
  property_name = 'Wildhaven Sonoma',
  country = 'United States',
  state = 'CA',
  city = 'Healdsburg',
  address = '2411 Alexander Valley Rd',
  zip_code = COALESCE(NULLIF(zip_code, ''), '95448'),
  url = 'https://www.wildhavensonoma.com/',
  phone_number = COALESCE(phone_number, '+1-707-283-7773'),
  property_type = 'Glamping Resort',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = COALESCE(is_open, 'Yes'),
  number_of_locations = 2,
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'wildhaven-glamping'),
  description = $$Wildhaven Sonoma — top-rated Russian River glamping in Sonoma wine country (Healdsburg). Heavy-duty heated safari tents (single and double queen) among oak trees plus modern riverside cabins with kitchens and en-suite baths. Direct river access, community cooking pavilions, and an on-site camp store with local microbrews and wines.$$,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Brand backfill + enrichment from wildhavensonoma.com.',
  date_updated = '2026-05-26',
  updated_at = now()
WHERE property_name ILIKE 'Wildhaven Sonoma%'
  AND city ILIKE 'Healdsburg%';

UPDATE public.all_glamping_properties p
SET
  property_name = 'Wildhaven Yosemite',
  country = 'United States',
  state = 'CA',
  city = 'Mariposa',
  address = '4808 CA-140',
  zip_code = COALESCE(NULLIF(zip_code, ''), '95338'),
  url = 'https://wildhavenyosemite.com/',
  phone_number = COALESCE(phone_number, '+1-209-225-9225'),
  property_type = 'Glamping Resort',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = COALESCE(is_open, 'Yes'),
  number_of_locations = 2,
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'wildhaven-glamping'),
  description = $$Wildhaven Yosemite — glamping near Yosemite National Park (Mariposa) with heated canvas tents (standard and premium) and modern insulated cabins (studio, classic, and valley-view). Private decks, memory-foam beds, and access to Yosemite gateway recreation.$$,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Brand backfill + enrichment from wildhavenyosemite.com JSON-LD.',
  date_updated = '2026-05-26',
  updated_at = now()
WHERE property_name ILIKE 'Wildhaven Yosemite%'
  AND city ILIKE 'Mariposa%';

UPDATE public.all_glamping_properties p
SET
  country = 'United States',
  property_type = 'Glamping Resort',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = 'Under Construction',
  number_of_locations = 3,
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'wildhaven-glamping'),
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Proposed Lake Berryessa resort — not operating; distinct from Sonoma/Yosemite.',
  date_updated = '2026-05-26',
  updated_at = now()
WHERE property_name = 'Wildhaven Lake Berryessa';

-- ---------------------------------------------------------------------------
-- Unit / SKU rows
-- ---------------------------------------------------------------------------
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
  v.property_name, v.site_name, v.slug, 'Glamping Resort', v.unit_type,
  'Sage', 'web_research_2026_05_wildhaven_usa',
  'United States', 'CA', v.city,
  v.address, v.zip_code, v.lat::numeric, v.lon::numeric, v.url, v.phone,
  v.description, v.notes, '2026-05-26', '2026-05-26',
  'private_commercial', b.id, 2
FROM (VALUES
  (
    'Wildhaven Sonoma', 'Single Queen Tent', 'wildhaven-sonoma-single-queen-tent', 'Safari Tent',
    'Healdsburg', '2411 Alexander Valley Rd', '95448', 38.6585421, -122.8331896,
    'https://www.wildhavensonoma.com/', '+1-707-283-7773',
    $$Heated safari tent with memory-foam queen bed, private deck, and Russian River access (Sonoma wine country).$$,
    $$Source: wildhavensonoma.com — Single Queen Tents (May 2026).$$
  ),
  (
    'Wildhaven Sonoma', 'Double Queen Tent', 'wildhaven-sonoma-double-queen-tent', 'Safari Tent',
    'Healdsburg', '2411 Alexander Valley Rd', '95448', 38.6585421, -122.8331896,
    'https://www.wildhavensonoma.com/', '+1-707-283-7773',
    $$Heated safari tent with two queen memory-foam beds for families and groups.$$,
    $$Source: wildhavensonoma.com — Double Queen Tents (May 2026).$$
  ),
  (
    'Wildhaven Sonoma', 'Riverside Cabin', 'wildhaven-sonoma-riverside-cabin', 'Cabin',
    'Healdsburg', '2411 Alexander Valley Rd', '95448', 38.6585421, -122.8331896,
    'https://www.wildhavensonoma.com/glamping-cabins', '+1-707-283-7773',
    $$Modern riverside cabin with en-suite bathroom, kitchen, AC, and front deck on the Russian River.$$,
    $$Source: wildhavensonoma.com/glamping-cabins (May 2026).$$
  ),
  (
    'Wildhaven Yosemite', 'Standard Tent', 'wildhaven-yosemite-standard-tent', 'Safari Tent',
    'Mariposa', '4808 CA-140', '95338', 37.47075, -119.96179,
    'https://wildhavenyosemite.com/glamping-tents', '+1-209-225-9225',
    $$Large heated canvas tent with memory-foam bed(s) near Yosemite (standard tier).$$,
    $$Source: wildhavenyosemite.com/glamping-tents (May 2026).$$
  ),
  (
    'Wildhaven Yosemite', 'Premium Tent', 'wildhaven-yosemite-premium-tent', 'Safari Tent',
    'Mariposa', '4808 CA-140', '95338', 37.47075, -119.96179,
    'https://wildhavenyosemite.com/glamping-tents', '+1-209-225-9225',
    $$Premium heated glamping tent with upgraded furnishings near Yosemite.$$,
    $$Source: wildhavenyosemite.com/glamping-tents (May 2026).$$
  ),
  (
    'Wildhaven Yosemite', 'Classic Cabin Studio', 'wildhaven-yosemite-classic-cabin-studio', 'Cabin',
    'Mariposa', '4808 CA-140', '95338', 37.47075, -119.96179,
    'https://wildhavenyosemite.com/glamping-cabins', '+1-209-225-9225',
    $$Insulated hard-sided studio cabin with AC and patio near Yosemite.$$,
    $$Source: wildhavenyosemite.com/glamping-cabins (May 2026).$$
  ),
  (
    'Wildhaven Yosemite', 'Classic Cabin 1 Bedroom', 'wildhaven-yosemite-classic-cabin-1br', 'Cabin',
    'Mariposa', '4808 CA-140', '95338', 37.47075, -119.96179,
    'https://wildhavenyosemite.com/glamping-cabins', '+1-209-225-9225',
    $$One-bedroom classic cabin with modern kitchen and bath near Yosemite gateway.$$,
    $$Source: wildhavenyosemite.com/glamping-cabins (May 2026).$$
  ),
  (
    'Wildhaven Yosemite', 'Valley View Cabin 1 Bedroom', 'wildhaven-yosemite-valley-view-cabin', 'Cabin',
    'Mariposa', '4808 CA-140', '95338', 37.47075, -119.96179,
    'https://wildhavenyosemite.com/glamping-cabins', '+1-209-225-9225',
    $$Valley View one-bedroom cabin — insulated hard-sided glamping cabin with scenic outlook.$$,
    $$Source: wildhavenyosemite.com/glamping-cabins (May 2026).$$
  )
) AS v(property_name, site_name, slug, unit_type, city, address, zip_code, lat, lon, url, phone, description, notes)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'wildhaven-glamping'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e
    WHERE e.property_name = v.property_name
      AND e.site_name IS NOT DISTINCT FROM v.site_name
  );
