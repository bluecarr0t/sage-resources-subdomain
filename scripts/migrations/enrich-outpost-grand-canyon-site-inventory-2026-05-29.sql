-- The Outpost Grand Canyon: per-site inventory from Newbook booking engine (May 2026).
-- Source: https://bookingsus.newbook.cloud/online/the_outpost
-- 10 bookable categories (Units A–J); property markets 12 boutique Airstreams on-site.
-- Rates are date-dynamic in Newbook; rate_unit_rates_by_year documents booking source (re-quote for ADR).
-- Safe to re-run (NOT EXISTS on inserts; UPDATE anchor id by slug).

-- ---------------------------------------------------------------------------
-- Anchor row (id from initial insert) → Unit A
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties SET
  site_name = 'Buddy Airstream with Private Hot Tub (Unit A)',
  slug = 'the-outpost-grand-canyon-az',
  property_type = 'Glamping',
  unit_type = 'Airstream',
  source = 'Sage',
  discovery_source = 'web_research_outpost_site_inventory_2026_05_29',
  url = 'https://bookingsus.newbook.cloud/online/the_outpost',
  property_total_sites = 12,
  quantity_of_units = 2,
  unit_capacity = '6',
  unit_bed = 'Airstream Bambi: 3/4 bed + dinette; Avion Holiday: 2 twin + lounge',
  unit_kitchenette = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_hot_tub = 'Yes',
  unit_hot_tub_or_sauna = 'Yes',
  unit_patio = 'Yes',
  unit_air_conditioning = 'Yes',
  property_sauna = 'Yes',
  property_hot_tub = 'Yes',
  property_dog_park = 'Yes',
  glamping_service_tier = 'upscale',
  date_updated = '2026-05-29',
  unit_description = 'Buddy lot: 2019 Airstream Bambi Flying Cloud plus 1961 Avion Holiday on one site with shared private hot tub, fenced patio, and outdoor lounge. Sleeps up to 6; max 2 pets.',
  amenities_raw = 'Dual vintage trailers; private hot tub; kitchenette; full bath; WiFi; TV; AC/heat; fenced patio; communal sauna; BBQ lounge; dog park.',
  rate_unit_rates_by_year = '{"2026":{"source":"newbook_the_outpost_may_2026","currency":"USD","note":"Dynamic nightly rates in booking engine; scrape did not capture dollar amounts without live date selection"}}'::jsonb,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Site inventory from bookingsus.newbook.cloud/online/the_outpost (Unit A anchor).'
WHERE slug = 'the-outpost-grand-canyon-az';

-- ---------------------------------------------------------------------------
-- Units B–J (sibling rows, shared property_id)
-- ---------------------------------------------------------------------------
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, phone_number,
  brand_id, property_total_sites, quantity_of_units,
  unit_capacity, unit_bed, unit_kitchenette, unit_private_bathroom, unit_shower,
  unit_wifi, unit_pets, unit_hot_tub, unit_hot_tub_or_sauna, unit_patio, unit_air_conditioning,
  unit_ada_accessibility,
  property_sauna, property_hot_tub, property_dog_park,
  land_operator_category, glamping_service_tier,
  unit_description, amenities_raw, rate_unit_rates_by_year,
  date_added, date_updated, notes
)
SELECT
  '2284cb70-3899-4dd7-8f49-7b721ca41ded'::uuid,
  'published', 'Yes', 'Yes',
  'The Outpost Grand Canyon', v.site_name, v.slug, 'Glamping', v.unit_type,
  'Sage', 'web_research_outpost_site_inventory_2026_05_29',
  'United States', 'AZ', 'Williams',
  '507 Linger Ln, Williams, AZ 86046', '86046',
  35.6500313::numeric, -112.1356514::numeric,
  'https://bookingsus.newbook.cloud/online/the_outpost', '+1-928-707-3045',
  b.id, 12, 1,
  v.capacity, v.bed, 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  v.ada,
  'Yes', 'Yes', 'Yes',
  'private_commercial', v.tier,
  v.unit_desc, v.amenities,
  '{"2026":{"source":"newbook_the_outpost_may_2026","currency":"USD","note":"Dynamic nightly rates; re-quote in booking engine for travel dates"}}'::jsonb,
  '2026-05-29', '2026-05-29',
  'May 2026: Site row from Newbook category ' || v.site_name || '.'
FROM (VALUES
  (
    'Airstream w/ Private Hot Tub (Unit B)', 'the-outpost-grand-canyon-az-unit-b', 'Airstream', 'upscale',
    '4', 'Queen + lounge futon',
    'Queen bed (60x75) and lounge bed/futon; private hot tub; kitchenette; full bath; WiFi; TV; AC/heat; fenced patio.',
    'Queen bed; lounge futon; private hot tub; kitchenette; full bath; WiFi; TV; AC/heat; patio; sauna; BBQ; dog park (max 2 pets).',
    'No'
  ),
  (
    'Airstream w/ Private Hot Tub (Unit C)', 'the-outpost-grand-canyon-az-unit-c', 'Airstream', 'upscale',
    '4', '2 twin + dinette',
    'Two twin beds plus convertible dinette; private hot tub; kitchenette; full bath; WiFi; TV; AC/heat; fenced patio.',
    'Twin beds; dinette bed; private hot tub; kitchenette; full bath; WiFi; TV; AC/heat; communal sauna; BBQ; dog park.',
    'No'
  ),
  (
    'Airstream w/ Private Hot Tub (Unit D)', 'the-outpost-grand-canyon-az-unit-d', 'Airstream', 'upscale',
    '3', 'Queen + dinette',
    'Queen bedroom plus Big Rig dinette bed (42x76); private hot tub; kitchenette; full bath; outdoor lounge.',
    'Queen bed; dinette bed; private hot tub; kitchenette; shower; WiFi; TV; AC/heat; patio seating.',
    'No'
  ),
  (
    'Airstream w/ Private Hot Tub (Unit E)', 'the-outpost-grand-canyon-az-unit-e', 'Airstream', 'upscale',
    '5', 'Queen + dinette + lounge',
    'Private queen bedroom, dinette bed, and lounge bed; private hot tub; kitchenette; full bath.',
    'Queen bed; dinette; lounge bed; hot tub; kitchenette; bath; WiFi; TV; AC/heat; shared sauna and BBQ.',
    'No'
  ),
  (
    'Airstream w/ Private Hot Tub (Unit F)', 'the-outpost-grand-canyon-az-unit-f', 'Airstream', 'upscale',
    '3', 'Queen + futon',
    'Queen bedroom and futon; private hot tub; kitchenette; full bath; fenced patio and outdoor lounge.',
    'Queen bed; futon; private hot tub; kitchenette; shower; WiFi; TV; AC/heat; dog-friendly (max 2 pets).',
    'No'
  ),
  (
    'Airstream w/ Private Hot Tub (Unit G)', 'the-outpost-grand-canyon-az-unit-g', 'Airstream', 'upscale',
    '4', 'Queen + dinette + lounge',
    'Queen bedroom with convertible dinette and lounge bed; private hot tub; kitchenette; full bath.',
    'Queen bed; dinette; lounge bed; hot tub; kitchenette; bath; WiFi; TV; AC/heat; communal wellness amenities.',
    'No'
  ),
  (
    'Airstream w/ Private Hot Tub (Unit H)', 'the-outpost-grand-canyon-az-unit-h', 'Airstream', 'upscale',
    '5', 'Queen + dinette + lounge',
    'Queen bedroom, dinette bed, and lounge bed for up to 5; private hot tub; kitchenette; full bath.',
    'Queen bed; dinette; lounge bed; private hot tub; kitchenette; shower; WiFi; TV; AC/heat; BBQ and sauna access.',
    'No'
  ),
  (
    'Premium Airstream with Private Hot Tub (Unit I)', 'the-outpost-grand-canyon-az-premium-unit-i', 'Airstream', 'luxury',
    '3', 'Queen + L-shaped sofa',
    'The Spartan: ADA-accessible layout with roll-in shower, queen memory-foam bed, L-shaped sofa sleeper, private hot tub.',
    'ADA roll-in shower; grab bars; queen bed; sofa sleeper; hot tub; kitchenette; WiFi; TV; AC/heat; sauna and cold plunge access.',
    'Yes'
  ),
  (
    'Airstream w/ Private Hot Tub (Unit J)', 'the-outpost-grand-canyon-az-unit-j', 'Airstream', 'upscale',
    '4', 'Full bed + futon',
    'Bedroom with full bed and living-room futon; private hot tub; kitchenette; full bath; outdoor lounge.',
    'Full bed; futon; private hot tub; kitchenette; bath; WiFi; TV; AC/heat; dog park and BBQ lounge.',
    'No'
  )
) AS v(site_name, slug, unit_type, tier, capacity, bed, unit_desc, amenities, ada)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'the-outpost-grand-canyon'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug
  );
