-- Link Naviva inventory to glamping_brands "Four Seasons"
-- Safe to re-run.

INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, notes)
VALUES (
  'four-seasons',
  'Four Seasons',
  'standalone',
  'four seasons',
  'https://www.fourseasons.com/',
  'Four Seasons Hotels and Resorts; includes tented camps and Naviva (Punta Mita).'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  brand_tier = EXCLUDED.brand_tier,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = EXCLUDED.website_url,
  notes = EXCLUDED.notes,
  updated_at = now();

UPDATE public.all_glamping_properties p
SET
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'four-seasons'),
  date_updated = '2026-05-21'
WHERE p.property_name = 'Naviva'
   OR p.property_id = '8dc6fb82-3351-4a68-a708-235d05e11a2b'::uuid
   OR p.id IN (12190, 12217);
