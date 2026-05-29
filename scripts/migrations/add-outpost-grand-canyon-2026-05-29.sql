-- The Outpost Grand Canyon — Airstream glamping near Grand Canyon South Rim (May 2026 web research).
-- Source: https://www.outpostgrandcanyon.com/ (Firecrawl + Google Places Find Place).
-- Location: 507 Linger Ln, Williams, AZ 86046 (Valle area gateway to South Rim).
-- Safe to re-run (NOT EXISTS on slug).

INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, notes)
VALUES (
  'the-outpost-grand-canyon',
  'The Outpost Grand Canyon',
  'standalone',
  'the outpost grand canyon',
  'https://www.outpostgrandcanyon.com/',
  'Vintage Airstream micro-resort ~25 minutes from Grand Canyon National Park South Rim (Valle / Williams, AZ). Private hot tubs, communal sauna and cold plunge.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = COALESCE(EXCLUDED.website_url, glamping_brands.website_url),
  notes = EXCLUDED.notes,
  updated_at = now();

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
  zip_code,
  lat,
  lon,
  url,
  phone_number,
  description,
  notes,
  date_added,
  date_updated,
  land_operator_category,
  brand_id,
  property_hot_tub,
  unit_hot_tub,
  unit_hot_tub_or_sauna,
  property_sauna,
  unit_pets,
  property_dog_park,
  unit_wifi,
  activities_hiking,
  setting_desert,
  glamping_service_tier
)
SELECT
  'published',
  'Yes',
  'Yes',
  'The Outpost Grand Canyon',
  'The Outpost Grand Canyon',
  'the-outpost-grand-canyon-az',
  'Glamping',
  'Airstream',
  'Sage',
  'web_research_outpost_grand_canyon_2026_05',
  'United States',
  'AZ',
  'Williams',
  '507 Linger Ln, Williams, AZ 86046',
  '86046',
  35.6500313::numeric,
  -112.1356514::numeric,
  'https://www.outpostgrandcanyon.com/',
  '+1-928-707-3045',
  'The Outpost Grand Canyon is a vintage Airstream glamping micro-resort about 25 minutes from the Grand Canyon National Park South Rim entrance (Valle / Williams area). Each renovated Airstream suite includes a private hot tub, outdoor lounge, kitchenette, and comfortable sleeping setup, with access to communal barrel sauna, cold plunge, BBQ area, campfire spaces, and dog parks. Self check-in; book direct at outpostgrandcanyon.com.',
  'Sources: outpostgrandcanyon.com home, accommodations, and contact pages (May 2026 Firecrawl). Google Places: The Outpost Grand Canyon, 507 Linger Ln, Williams, AZ 86046. Booking: bookingsus.newbook.cloud/online/the_outpost.',
  '2026-05-29',
  '2026-05-29',
  'private_commercial',
  b.id,
  'Yes',
  'Yes',
  'Yes',
  'Yes',
  'Yes',
  'Yes',
  'Yes',
  'Yes',
  'Yes',
  'upscale'
FROM public.glamping_brands b
WHERE b.slug = 'the-outpost-grand-canyon'
  AND NOT EXISTS (
    SELECT 1
    FROM public.all_glamping_properties e
    WHERE e.slug = 'the-outpost-grand-canyon-az'
  );
