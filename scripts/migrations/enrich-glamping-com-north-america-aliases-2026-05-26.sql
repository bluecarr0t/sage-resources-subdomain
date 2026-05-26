-- Glamping.com North America alias cross-reference (May 2026).
-- Links 13 existing canonical property rows to their Glamping.com listing URLs in notes.
-- Safe to re-run (guarded by note content check).

UPDATE public.all_glamping_properties AS p
SET
  notes = COALESCE(p.notes, '') || E'\n\nGlamping.com listing (May 2026): ' || v.gc_url,
  date_updated = '2026-05-26'
FROM (
  VALUES
    ('Verde Ranch Resort', 'https://www.glamping.com/destination/north-america/arizona/camp-verde/verde-ranch-rv-resort/'),
    ('Arizonea Luxury Expeditions', 'https://www.glamping.com/destination/north-america/arizona/goodyear/arizona-luxury-expeditions-llc/'),
    ('Ventana Big Sur', 'https://www.glamping.com/destination/north-america/california/big-sur/ventana-big-sur-an-alila-resort/'),
    ('Flying Flags RV Resort & Campground', 'https://www.glamping.com/destination/north-america/california/buellton/flying-flags-rv-resort-and-campground/'),
    ('Costanoa', 'https://www.glamping.com/destination/north-america/california/pescadero/costanoa-lodge-and-resort/'),
    ('Collective Retreats Vail', 'https://www.glamping.com/destination/north-america/colorado/wolcott/vail-collective-retreat-at-4-eagle-ranch/'),
    ('Woods of Eden Glampground', 'https://www.glamping.com/destination/north-america/maine/bar-harbor/the-woods-of-eden/'),
    ('Collective Yellowstone', 'https://www.glamping.com/destination/north-america/montana/big-sky/the-yellowstone-collective-retreat/'),
    ('Norwegian Wood Ranch', 'https://www.glamping.com/destination/north-america/montana/helena/norwegian-wood-ranch-glamping/'),
    ('Ithaca by Firelight Camp', 'https://www.glamping.com/destination/north-america/new-york/ithaca/ithaca-by-firelight-camps/'),
    ('Shawnee Inn & Golf Resort', 'https://www.glamping.com/destination/north-america/pennsylvania/shawnee-on-delaware/the-shawnee-inn-and-golf-resort/'),
    ('Serenity Eco Luxury Tented Camp', 'https://www.glamping.com/destination/north-america/quintana-roo/xpu-ha/serenity-luxury-tented-camp-by-xperience-hotels/'),
    ('Collective Retreats Hill Country', 'https://www.glamping.com/destination/north-america/texas/wimberley/collective-hill-country-a-retreat-at-montesino-ranch/')
) AS v(property_name, gc_url)
WHERE lower(trim(p.property_name)) = lower(trim(v.property_name))
  AND COALESCE(p.notes, '') NOT ILIKE '%' || v.gc_url || '%';
