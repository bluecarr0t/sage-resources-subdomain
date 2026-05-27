-- Trailborn (Outdoor Collection) are boutique hotels, not Glamping product type.
-- Keeps site inventory on /brand/marriott-outdoor-collection; removes from /brands Glamping-only ranking.

UPDATE public.all_glamping_properties p
SET
  property_type = 'Outdoor Boutique Hotel',
  date_updated = '2026-05-26'
FROM public.glamping_brands b
WHERE p.brand_id = b.id
  AND b.slug = 'marriott-outdoor-collection'
  AND p.property_name NOT ILIKE '%postcard%'
  AND p.property_type = 'Glamping';
