-- Normalize remaining legacy property_type values to canonical taxonomy (May 2026).

-- 1) Empty → Unknown
UPDATE public.all_glamping_properties
SET property_type = 'Unknown', date_updated = '2026-05-21'
WHERE TRIM(COALESCE(property_type, '')) = '';

-- 2) Boutique Camping (reviewed May 2026)
UPDATE public.all_glamping_properties
SET property_type = 'Outdoor Boutique Hotel', date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Boutique Camping'
  AND slug IN ('douro41-hotel-spa', 'sextantio-le-grotte-della-civita');

UPDATE public.all_glamping_properties
SET property_type = 'Campground', date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Boutique Camping'
  AND slug = 'tcs-camping-lugano-muzzano';

UPDATE public.all_glamping_properties
SET property_type = 'Glamping', date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Boutique Camping';

-- 3) Outdoor Resort (2 slugs: mixed glamping + outdoor bungalow)
UPDATE public.all_glamping_properties
SET property_type = 'Glamping', date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Outdoor Resort';

-- 4) Bulk legacy → Glamping
UPDATE public.all_glamping_properties
SET property_type = 'Glamping', date_updated = '2026-05-21'
WHERE TRIM(property_type) IN (
  'Treehouse Resort',
  'Luxury Cabin Resort',
  'Glamping Retreat',
  'Eco Glamping',
  'Eco Glamping Resort',
  'Eco Glamping Retreat',
  'Glamping Site',
  'Luxury Glamping',
  'Farm Glamping',
  'Farm Stay Glamping',
  'Yurt Glamping',
  'Yurt Resort',
  'Glamping Farm',
  'Glamping Lodge',
  'Glamping Collection',
  'Adventure Glamping',
  'Eco Camping',
  'Unique Glamping Experience',
  'Luxury Treehouse',
  'Hobbit Resort',
  'Airstream Resort',
  'Estate & Glamping',
  'Luxury Cabin Retreat',
  'Farm Stay',
  'Eco Retreat',
  'Nature Retreat',
  'Luxury Retreat',
  'Retreat',
  'Cultural Retreat',
  'Retreat Centre',
  'Mountain Retreat',
  'Eco Lodge',
  'Eco Lodges',
  'Eco Resort',
  'Eco-friendly Resort',
  'Eco-Resort',
  'Nature Lodge',
  'Rustic Lodge'
);

-- 5) Bulk legacy → Outdoor Boutique Hotel
UPDATE public.all_glamping_properties
SET property_type = 'Outdoor Boutique Hotel', date_updated = '2026-05-21'
WHERE TRIM(property_type) IN (
  'Luxury Lodge',
  'Treehouse Hotel',
  'Wellness Resort',
  'Hotel',
  'Boutique Hotel',
  'Boutique Hotel with Glamping Options',
  'Luxury Hotel with Glamping',
  'Luxury Inn',
  'Beach Resort',
  'Beachfront Resort',
  'Seaside Resort',
  'Island Resort',
  'Hot Springs Resort',
  'Luxury Ranch Resort',
  'Nature Resort',
  'Wilderness Resort',
  'Adventure Resort',
  'Resort',
  'Lodge & Vacation Rentals',
  'Vacation Rentals'
);

-- 6) Campground / RV Resort labels
UPDATE public.all_glamping_properties
SET property_type = 'Campground', date_updated = '2026-05-21'
WHERE TRIM(property_type) IN (
  'Holiday Park',
  'National Park Camp',
  'Provincial Park',
  'Nature Park',
  'Camping & Bungalows'
);

UPDATE public.all_glamping_properties
SET property_type = 'RV Resort', date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'RV Park';

-- 7) Other / catch-all one-offs
UPDATE public.all_glamping_properties
SET property_type = 'Glamping', date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Other'
  AND slug IN ('borealis-basecamp', 'jupe-redwoods');

UPDATE public.all_glamping_properties
SET property_type = 'Unknown', date_updated = '2026-05-21'
WHERE TRIM(property_type) IN ('Other', 'Wildlife Reserve', 'Unique Accommodation');
