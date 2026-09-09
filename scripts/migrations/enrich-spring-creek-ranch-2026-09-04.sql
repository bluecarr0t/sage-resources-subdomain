-- ============================================================================
-- Spring Creek Ranch (Jackson, WY): publish and split inn / townhome / villa.
-- Distinct from Amangani (adjacent luxury resort) and from third-party
-- Harvest Dance / Choate vacation-rental listings (Outpost, Boundary JH).
-- Do not store the Wilderness Adventure Spa teepee as lodging.
--
-- Sources (retrieved 2026-09-04):
--   https://www.springcreekranch.com/
--     /lodging/ /lodging/inn-room-cliff-view/ /lodging/townhomes/
--     /lodging/mountain-villas/ /lodging/resort-amenities/
--   Kayak (live Mon Sep 7–Tue Sep 8 2026, 2 guests):
--     https://www.kayak.com/Jackson-Hotels-Spring-Creek-Ranch.16548.ksp
--   Booking.com listing (JS-walled; URL only):
--     https://www.booking.com/hotel/us/s-c-ranch-jackson-wyoming.html
--   Expedia hotel page (121 rooms; map marker):
--     https://www.expedia.com/Jackson-Hole-Hotels-Spring-Creek-Ranch.h41135.Hotel-Information
--     lat 43.50503 / lon -110.77302; plus code 85MFG64G+2Q
--     1600 N. East Butte Rd, Jackson, WY 83001
--     (skip google_place_id — Maps listing did not resolve a ChIJ)
--   Travel Weekly (opened 1983; renovated 2004)
--
-- Operating inventory (operator amenities: "Total number of accommodations 118"):
--   Inn Room qty 36 — 9 rustic cabins × 4 rooms (pond-side and cliff-side).
--     Cliff-view inn page banner: Currently Closed for Renovation. Still
--     counted in operator 118; do not drop the 36.
--   Townhome qty 77 — Harvest Dance Studio / Suite, 1BR / 2BR / 3BR
--     townhomes (Peter Choate cliff-side lofts). Residual 118 − 36 − 5.
--     4BR townhomes page is Private; do not invent a 4th SKU.
--   Mountain Villa qty 5 — named: Alpenglow (5BR), Alta Vista (4BR/4.5BA,
--     4,300 sf), Deer Path (4BR/4.5BA, 5,700 sf), Wolfe Spirit (4BR/4.5BA,
--     4,961 sf), Rendezvous (5BR / 5 full + 2 half, 6,500 sf).
--   property_total_sites = 118. OTAs often say 121; Travel Weekly 125.
--     Do not invent SKUs to close 118 vs 121/125.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Do not store resort fee as ADR (Studio/Suite $20, 2BR $40, 3BR $60,
--     Villa $80). Lodging tax 5% + sales tax 6% extra.
--   Inn Room keeps 2026-09-01 momondo park band 417/474/531/493 (typical
--     ~$474). Kayak Sep 7–8 2026 queen from $284 with fees is a live fall
--     floor, not a replacement ADR (fees included; taxes extra).
--   Townhome / Villa scaled from that band + Kayak standard/superior
--     $391–$703 and luxury $784–$1,200 (Sep 7–8 2026, with fees).
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Spring Creek Ranch',
  slug = 'spring-creek-ranch-jackson-wy',
  property_type = 'Outdoor Boutique Hotel',
  source = 'Sage',
  discovery_source = 'web_research_spring_creek_ranch_operator_gmaps_2026_09',
  address = '1600 North East Butte Road',
  city = 'Jackson',
  state = 'WY',
  zip_code = '83001',
  country = 'United States',
  lat = 43.50503,
  lon = -110.77302,
  url = 'https://www.springcreekranch.com/',
  phone_number = '+1-800-443-6139',
  property_total_sites = 118,
  year_site_opened = 1983,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'Yes',
  property_tennis = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['booking.com', 'expedia', 'kayak', 'hotels.com']::text[],
  ota_url_booking_com = 'https://www.booking.com/hotel/us/s-c-ranch-jackson-wyoming.html',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '1,000-acre East Gros Ventre Butte wildlife sanctuary ~700–1,000 ft above Jackson (opened 1983; renovated 2004). Hard-sided inn rooms, townhomes, and owner-furnished mountain villas. Condé Nast Gold List / Robb Report rustic-luxury ranch hotel. Wilderness Adventure Spa (massage in a teepee is a treatment, not lodging), seasonal outdoor heated pool, indoor salt-water hot tubs, sauna/steam, fitness, two tennis courts, equestrian center. No pets (wildlife refuge). No A/C (fans/humidifiers). Distinct from adjacent Amangani.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book springcreekranch.com; OTAs Booking.com / Expedia / Kayak. Check-in 4:00 PM / check-out 11:00 AM. Resort fee extra (Studio/Suite $20, 2BR $40, 3BR $60, Villa $80) — not ADR. Lodging tax 5% + sales tax 6%. Cancel: ≤21 days forfeit deposit; 22+ days refund minus 3% (min $25). No pets. No A/C. Shuttle to town / JAC / JHMR (ski season; airport surcharge). Housekeeping on request for a fee. Toll-free (800) 443-6139; local (307) 733-8833.',
  description = $$Luxury ranch hotel on a 1,000-acre wildlife sanctuary atop East Gros Ventre Butte, 1600 North East Butte Road, Jackson, Wyoming (Expedia/Maps pin 43.50503, -110.77302; plus code 85MFG64G+2Q), about 10 minutes from town and 15 minutes from Jackson Hole Mountain Resort. 118 hard-sided accommodations: 36 inn rooms in nine rustic cabins, townhomes/studios/suites, and five named mountain villas. Seasonal outdoor pool, indoor hot tubs, spa, tennis, equestrian center, gift shop, and The Granary / Sage Overlook dining. Opened 1983. No pets; no A/C. Distinct from Amangani next door.$$,
  activities_raw = 'On-site: Wilderness Adventure Spa (teepee massage is a treatment only), seasonal outdoor heated pool, indoor salt-water hot tubs, sauna/steam, fitness, two tennis courts, equestrian center / horseback, fire pit, naturalist programs (wildlife tours, astronomy, snowshoe), trout pond, conference/ballroom, gift shop (beer/wine/spirits), shuttle to town/airport/JHMR. Nearby: Grand Teton and Yellowstone, Snake River fly fishing and whitewater, Jackson Town Square, National Museum of Wildlife Art, skiing at JHMR.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_whitewater_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_snow_sports = 'Yes',
  activities_horseback_riding = 'Yes',
  setting_mountainous = 'Yes',
  setting_ranch = 'Yes',
  setting_forest = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11664
  AND property_id = 'e9d6dce9-8eca-4c48-a22b-2c688e8a7939';

-- Existing shell → Inn Room (9 cabins × 4 = 36).
UPDATE public.all_sage_data
SET
  site_name = 'Inn Room',
  unit_type = 'Hotel Room',
  quantity_of_units = 36,
  unit_capacity = '4',
  unit_bed = '1 King or 2 Queen',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'Yes',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Nine rustic cabins × 4 rooms (pond-side and cliff-side). Cliff-view inn rooms listed Closed for Renovation as of 2026-09-04; still counted in operator 118.',
  minimum_nights = '1',
  unit_description = $$Inn room (qty 36): nine rustic cabins with four deluxe hotel rooms each, pond-side and cliff-side, Grand Teton views. 1 king or 2 queens, wood-burning fireplace, balcony/patio, mini-fridge (not stocked), coffee maker, cable TV/HBO, robes. No A/C; no kitchen. Walking distance to The Granary and reception. Cliff-view SKU listed closed for renovation 2026-09-04 — confirm availability. Shared resort pool, indoor hot tubs, spa, tennis. No pets.$$,
  amenities_raw = 'Hotel room; 1 king or 2 queens; fireplace; balcony/patio; mini-fridge; coffee; cable/HBO; Wi-Fi; robes. No A/C. No kitchen. Shared pool, hot tubs, spa, tennis, laundry. No pets. Accessible rooms available.',
  rate_winter_weekday = '417',
  rate_winter_weekend = '465',
  rate_spring_weekday = '474',
  rate_spring_weekend = '512',
  rate_summer_weekday = '531',
  rate_summer_weekend = '588',
  rate_fall_weekday = '493',
  rate_fall_weekend = '540',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 417, 'weekend', 465),
      'spring', jsonb_build_object('weekday', 474, 'weekend', 512),
      'summer', jsonb_build_object('weekday', 531, 'weekend', 588),
      'fall', jsonb_build_object('weekday', 493, 'weekend', 540),
      'note', 'USD room_only. Park/inn band from 2026-09-01 momondo typical ~$474 (winter 417 / summer 531 / fall 493). Kayak Mon Sep 7–Tue Sep 8 2026 queen from $284 with fees is a live fall floor (fees included; $20 studio resort fee is not ADR). Taxes extra. Call 1-800-443-6139 for rack. kayak.com/Jackson-Hotels-Spring-Creek-Ranch.16548.ksp.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from empty shell using springcreekranch.com + Kayak Sep 7–8 2026 + Expedia pin @43.50503,-110.77302 (85MFG64G+2Q). This row is Inn Room qty 36 (Hotel Room). Cliff-view inn listed closed for renovation. Spa teepee is not lodging. is_glamping_property set to No. Corrected prior lat/lon 43.5645,-110.7815 (street-level stub).'
WHERE id = 11664
  AND property_id = 'e9d6dce9-8eca-4c48-a22b-2c688e8a7939';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights, ota_url_booking_com,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_fitness_room, property_tennis, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_paddling, activities_whitewater_paddling, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives, activities_historic_sightseeing,
  activities_snow_sports, activities_horseback_riding,
  setting_mountainous, setting_ranch, setting_forest,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'No', 'Sage', 'Spring Creek Ranch', v.site_name,
  'web_research_spring_creek_ranch_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  118, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', v.kitchenette, v.full_kitchen,
  'No', 'Yes', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'Yes', 'No', 'No',
  v.fridge, NULL, NULL, 'No',
  1983::numeric, NULL::smallint, NULL::smallint,
  v.season, '1', g.ota_url_booking_com,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_tennis, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_paddling, g.activities_whitewater_paddling, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives, g.activities_historic_sightseeing,
  g.activities_snow_sports, g.activities_horseback_riding,
  g.setting_mountainous, g.setting_ranch, g.setting_forest,
  g.rv_parking,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Townhome', 77::numeric, 'Suite', '8', 'Studio queen wall bed through 3BR',
      'Yes', 'Yes', 'Yes',
      'Year-round. Harvest Dance Studio / Suite, 1BR / 2BR / 3BR townhomes (Peter Choate cliff-side lofts). Qty 77 is residual 118 − 36 inn − 5 villas. 4BR townhomes page is Private.',
      '520', '580', '590', '650', '680', '750', '620', '690',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 520, 'weekend', 580), 'spring', jsonb_build_object('weekday', 590, 'weekend', 650), 'summer', jsonb_build_object('weekday', 680, 'weekend', 750), 'fall', jsonb_build_object('weekday', 620, 'weekend', 690), 'note', 'USD room_only. Scaled above inn/momondo park ADR; Kayak Sep 7–8 2026 standard/superior $391–$703 and resort $345–$803 with fees (2BR/3BR resort fee $40–$60 is not ADR). Studio/suite fee $20. No dated operator IBE by SKU. Taxes extra.')),
      $$Townhome / studio / suite (qty 77): Harvest Dance Studio (queen wall bed, kitchen, sunken living room, fireplace), Harvest Dance Suite (sitting suite or 2-bedroom), 1BR Harvest Dance townhome, 2BR townhomes including Peter Choate cliff-side lofts, and 3BR cliff-side townhomes. Full kitchens on townhomes; studios have a kitchen. Fireplaces, Wi-Fi, no A/C, no pets. Shared resort pool, hot tubs, spa, tennis. Qty is residual so 36 + 77 + 5 = operator 118; OTAs sometimes say 121.$$,
      'Studio/suite/townhome; kitchen or full kitchen; fireplace; Wi-Fi; cable. No A/C. Shared pool, hot tubs, spa, tennis, laundry. No pets.',
      E'[2026-09-04] Added Townhome qty 77 (Suite) as residual 118 − 36 inn − 5 villas from springcreekranch.com/lodging/townhomes.'
    ),
    (
      'Mountain Villa', 5::numeric, 'Villa', '12', '4–5 bedrooms',
      'No', 'Yes', 'No',
      'Year-round. Five named owner-furnished villas: Alpenglow, Alta Vista, Deer Path, Wolfe Spirit, Rendezvous.',
      '900', '1000', '1100', '1250', '1400', '1600', '1200', '1350',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 900, 'weekend', 1000), 'spring', jsonb_build_object('weekday', 1100, 'weekend', 1250), 'summer', jsonb_build_object('weekday', 1400, 'weekend', 1600), 'fall', jsonb_build_object('weekday', 1200, 'weekend', 1350), 'note', 'USD room_only. Scaled from Kayak Sep 7–8 2026 luxury $784–$1,200 with fees. Villa resort fee $80 is not ADR. No dated operator IBE. Taxes extra.')),
      $$Mountain villa (qty 5): named owner-furnished homes — Alpenglow (5BR rustic log), Alta Vista (4BR/4.5BA, 4,300 sf), Deer Path (4BR/4.5BA, 5,700 sf), Wolfe Spirit (4BR/4.5BA, 4,961 sf), Rendezvous (5BR / 5 full + 2 half, 6,500 sf). Full kitchen, dining, living, fireplaces, decks, Teton views. No A/C; no pets. Shared resort amenities. Do not invent a 6th villa.$$,
      'Villa; 4–5 BR; full kitchen; fireplaces; deck; Wi-Fi. No A/C. Shared pool, hot tubs, spa, tennis. No pets.',
      E'[2026-09-04] Added Mountain Villa qty 5 from springcreekranch.com/lodging/mountain-villas named list.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  kitchenette, full_kitchen, fridge,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11664
  AND g.property_id = 'e9d6dce9-8eca-4c48-a22b-2c688e8a7939'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'e9d6dce9-8eca-4c48-a22b-2c688e8a7939'
      AND x.site_name = v.site_name
  );

COMMIT;
