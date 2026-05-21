-- Map reviewed Unknown rows → canonical property_type (May 2026).

UPDATE public.all_glamping_properties
SET property_type = 'Glamping', date_updated = '2026-05-21'
WHERE property_type = 'Unknown'
  AND slug IN (
    'aliya-preserve-forks-wa',
    'american-safari-camp',
    'bad-moon',
    'brigid-spring',
    'camp-wandawega',
    'cascade-dome',
    'emerson-resort-spa-mount-tremper-ny',
    'haliburton-forest-wild-life-reserve',
    'hobbit-hollow',
    'inn-town-campground',
    'low-country-oasis',
    'mana-farm-davis',
    'million-stars-hotel',
    'norwegian-wood-ranch',
    'outlander-glamping',
    'pinecone-treehouse',
    'red-river-gorge-cabin-rentals',
    'silk-road-yurts-joshua-tree-ca',
    'skoolie-retreat',
    'spartan-trailer',
    'treehouse-in-vineyard',
    'treehouses-at-starved-rock-ottawa-il',
    'toad-hill',
    'wildman-adventure-resort-silver-cliff-wi',
    'willow-glamping-yurt'
  );

UPDATE public.all_glamping_properties
SET property_type = 'Outdoor Boutique Hotel', date_updated = '2026-05-21'
WHERE property_type = 'Unknown'
  AND slug IN (
    'awol-kennebunkport-me',
    'civana-carefree-resort-spa-carefree-az',
    'daniels-summit-lodge-heber-city-ut',
    'eastwind-hotel-bar',
    'gateway-canyons-resort-spa-gateway-co',
    'indian-hot-springs-resort-idaho-springs-co',
    'mount-princeton-hot-springs-resort-nathrop-co',
    'mystic-hot-springs-monroe-ut',
    'rainbow-ranch-lodge-gallatin-gateway-mt',
    'rancho-de-los-caballeros-wickenburg-az',
    'rustic-inn-at-jackson-hole-jackson-wy',
    'sanctuary-camelback-mountain-paradise-valley-az',
    'shawnee-inn-golf-resort',
    'inn-at-herrington-harbour-rose-haven',
    'the-retreat-on-charleston-peak-mount-charleston-nv',
    'tenkiller-lodge-park-hill-ok',
    'sylvan-dale-guest-ranch-loveland-co',
    'triangle-x-ranch-moose-wy',
    'turtle-bay-resort-kahuku-hi',
    'wildcatter-ranch-resort-graham-tx',
    'alpine-falls-ranch',
    'headwaters-jupiter'
  );

UPDATE public.all_glamping_properties
SET property_type = 'Campground', date_updated = '2026-05-21'
WHERE property_type = 'Unknown'
  AND slug IN (
    'jellystone-park-zion',
    'north-texas-jellystone-park',
    'kalopa-state-recreation-area',
    'mohawk-trail-state-forest-charlemont-ma'
  );

UPDATE public.all_glamping_properties
SET property_type = 'Landscape Hotel', date_updated = '2026-05-21'
WHERE property_type = 'Unknown'
  AND slug = 'ventana-big-sur';
