-- KOA (Kampgrounds of America) full North American directory import (May 2026).
-- Primary load: npx tsx scripts/import-koa-campgrounds.ts
-- Source: https://koa.com/sitemaps/campground-pages-sitemap.xml (471 unique campground URLs)
-- Enrichment: Google Places Find Place API (name, address, lat/lon)
-- property_type = 'Campground', is_glamping_property = 'No', discovery_source = koa_directory_sitemap_2026_05

UPDATE public.glamping_brands
SET
  website_url = 'https://koa.com/',
  notes = 'Kampgrounds of America (KOA) — ~471 North American campgrounds (May 2026 sitemap). Network tiers: Journey, Holiday, Resort. Lodging includes deluxe cabins, premium glamping tents, restored cabooses, and Conestoga wagons; family amenities (pools, playgrounds, KOA Paw Pen™ dog parks, laundry) and multi-stop road-trip booking at koa.com.',
  updated_at = now()
WHERE slug = 'koa';

-- Backfill brand_id on any KOA URL rows missing brand linkage.
UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    date_updated = '2026-05-26'
FROM public.glamping_brands b
WHERE b.slug = 'koa'
  AND p.brand_id IS NULL
  AND (p.url ILIKE '%koa.com/campgrounds/%' OR p.property_name ILIKE '%KOA%');

-- Normalize country label for US KOA rows.
UPDATE public.all_glamping_properties
SET country = 'United States',
    date_updated = '2026-05-26'
WHERE url ILIKE '%koa.com/campgrounds/%'
  AND country IN ('USA', 'US', 'U.S.A.');
