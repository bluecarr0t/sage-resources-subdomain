-- ============================================================================
-- Tanque Verde Ranch (Tucson, AZ): publish, reclassify, set inventory.
-- Historic Cote-family dude / guest ranch. Hard-sided salas, casitas, and
-- haciendas — not canvas glamping. Distinct from nearby vacation-rental
-- "Tanque Verde Guest Ranch" VRBO aliases and from Amangani-style hotels.
--
-- Sources (retrieved 2026-09-04):
--   https://www.tanqueverderanch.com/
--     /stay/ /stay/rincon-vista/ /stay/roadrunner-ridge/
--     /stay/javelina-heights/ /stay/quail-hollow/ /stay/desert-garden/
--     /stay/mi-casa-su-casa/ /packages/all-inclusive-getaway
--     /packages/3-squares-and-a-bed /groups /history
--   Google Maps business pin:
--     https://www.google.com/maps/place/Tanque+Verde+Ranch/@32.242039,-110.684011,17z
--     lat 32.242039 / lon -110.684011; plus code 68R8+R9
--     14301 E Speedway Blvd, Tucson, AZ 85748
--     (skip google_place_id — CID /g/1thqb91w only, not ChIJ)
--   Cvent / PartySlate / operator groups: 69 guest rooms
--   Booking.com house rules (no pets):
--     https://www.booking.com/hotel/us/tanque-verde-guest-ranch.html
--   Tucson.com: lodging added 1928; cattle ranch 1868; Cote family since 1957
--
-- Operating inventory:
--   Casita qty 69 — operator 69 rooms across six areas (Roadrunner Ridge,
--     Javelina Heights, Quail Hollow, Desert Garden, Rincon Vista, Mi Casa
--     Su Casa). Product mix is Salas (lodge rooms), Casitas / Casita Deluxe,
--     and Rincon Vista Haciendas / Hacienda Deluxe. No published per-SKU
--     counts. Do not invent a 2nd/3rd SKU to split Sala vs Hacienda.
--   property_total_sites = 69
--
-- Rates USD, all_inclusive (primary marketed package). Do not set
--   rate_avg_retail_daily_rate (trigger).
--   Operator homepage "Our Rates" $425. Maps official site Oct 20–21 2026:
--     2 queen $450 / 1 king $550 (taxes extra; $504 / $616 with taxes+fees).
--   Expedia $383 breakfast and goseek from $277 are other bases / discounters
--     — not this ADR. 3 Squares and a Bed = meals without activities;
--     Rise and Dine = breakfast. Gratuities, alcohol, spa, private lessons
--     extra. Peak is winter/spring (Oct–Apr); summer is the value season.
--   Replaces 2026-09-01 firecrawl band that treated summer as high season.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Tanque Verde Ranch',
  slug = 'tanque-verde-ranch-tucson-az',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_tanque_verde_ranch_operator_gmaps_2026_09',
  address = '14301 E Speedway Boulevard',
  city = 'Tucson',
  state = 'AZ',
  zip_code = '85748',
  country = 'United States',
  lat = 32.242039,
  lon = -110.684011,
  url = 'https://www.tanqueverderanch.com/',
  phone_number = '+1-520-296-6275',
  property_total_sites = 69,
  year_site_opened = 1928,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'Yes',
  property_fitness_room = 'Yes',
  property_tennis = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['booking.com', 'expedia']::text[],
  ota_url_booking_com = 'https://www.booking.com/hotel/us/tanque-verde-guest-ranch.html',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Historic Cote-family dude ranch on 640 acres plus ~60,000 leased cattle acres beside Saguaro National Park East and Coronado National Forest. Cattle ranch 1868 (Emilio Carrillo); guest lodging 1928 (Jim Converse); Cote family since 1957. Hard-sided salas, casitas, and haciendas — not glamping. All-inclusive riding/meals package is the flagship; La Sonora Spa, indoor + outdoor pools, tennis/pickleball, Dog House Saloon. Condé Nast / Travel + Leisure. No pets (Booking.com).',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'USD all-inclusive flagship (lodging + three meals + ranch activities: trail rides/lessons 250-lb limit, kids program 4–11, hikes, biking, fishing, yoga, pools, tennis/pickleball). Gratuities, alcohol, spa, private lessons, sunrise/sunset rides extra. Also sells 3 Squares and a Bed (meals, activities extra) and Rise and Dine (breakfast). Check-in cardholder 21+ (Booking.com). Sales tax extra. Direct book tanqueverderanch.com; (520) 296-6275; tvgr@cotefamily.com.',
  description = $$Historic dude ranch at 14301 E Speedway Boulevard, Tucson, Arizona (Google Maps 32.242039, -110.684011; plus code 68R8+R9), on 640 acres at the edge of Saguaro National Park East with ~60,000 leased cattle acres. 69 hard-sided rooms across six areas — Salas, Casitas, and Rincon Vista Haciendas. Indoor and outdoor pools, La Sonora Spa, Dog House Saloon, catch-and-release lake, ~180 horses, tennis and pickleball. Cattle ranch 1868; guest lodging 1928; Cote family since 1957. Not a glamping property.$$,
  activities_raw = 'On-site: horseback trail rides and lessons (~180 horses; 250-lb limit), kids program ages 4–11, cowboy cookouts, breakfast rides, team penning, guided hikes, mountain biking, catch-and-release lake fishing, archery, horseshoes, basketball, pickleball, tennis, yoga, fitness center, La Sonora Spa, indoor + outdoor pools, hot tub, Dog House Saloon, The Barn (events to 350), campfires, stargazing. Adjacent Saguaro National Park East and Coronado National Forest.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_horseback_riding = 'Yes',
  setting_desert = 'Yes',
  setting_ranch = 'Yes',
  setting_mountainous = 'Yes',
  setting_lake = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11634
  AND property_id = 'f6adaaba-b7e7-4175-956a-b9ebc7e8d8a5';

UPDATE public.all_sage_data
SET
  site_name = 'Casita',
  unit_type = 'Cottage',
  quantity_of_units = 69,
  unit_capacity = '6',
  unit_bed = '1 King or 2 Queen (deluxe adds sofa / Murphy beds)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
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
  operating_season_months = 'Year-round since 1969. Peak Oct–Apr. Six areas: Roadrunner Ridge, Javelina Heights, Quail Hollow, Desert Garden, Rincon Vista, Mi Casa Su Casa.',
  minimum_nights = '1',
  unit_description = $$Casita / sala / hacienda mix (qty 69): operator total across six adobe neighborhoods. Salas are lodge-style rooms (king or 2 queens, mini-fridge, coffee, patio). Casitas and Casita Deluxe add sitting rooms, fireplaces, and sofa / alcove beds. Rincon Vista Haciendas / Hacienda Deluxe are the premier SKUs (king + living room; Deluxe adds two queen Murphy beds; ~874 sf cited in 2015). No published Sala vs Casita vs Hacienda counts — do not invent a split. A/C, Wi-Fi, private bath. No pets (Booking.com). Shared indoor/outdoor pools, spa, riding, lake.$$,
  amenities_raw = 'Casita/sala/hacienda; private bath; A/C; Wi-Fi; mini-fridge; coffee; patio; many fireplaces. Shared: indoor + outdoor pools, hot tub, spa, tennis/pickleball, saloon, dining room. No pets. Accessible rooms available.',
  rate_winter_weekday = '475',
  rate_winter_weekend = '525',
  rate_spring_weekday = '450',
  rate_spring_weekend = '495',
  rate_summer_weekday = '375',
  rate_summer_weekend = '415',
  rate_fall_weekday = '450',
  rate_fall_weekend = '495',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 475, 'weekend', 525),
      'spring', jsonb_build_object('weekday', 450, 'weekend', 495),
      'summer', jsonb_build_object('weekday', 375, 'weekend', 415),
      'fall', jsonb_build_object('weekday', 450, 'weekend', 495),
      'note', 'USD all_inclusive. Homepage Our Rates $425. Maps official site Tue Oct 20–Wed Oct 21 2026: 2 queen $450 / king $550 (taxes extra). Peak Oct–Apr; summer is the value season (3rd night free promo through Sep 7 2026). Replaces 2026-09-01 firecrawl band that priced summer highest. Expedia $383 breakfast and goseek from $277 are not this ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from empty shell using tanqueverderanch.com + Google Maps @32.242039,-110.684011 (68R8+R9). property_type Glamping → Ranch & Lodge; is_glamping_property No. This row is Casita qty 69 (Cottage) covering Salas + Casitas + Haciendas — no per-SKU counts. rate_basis all_inclusive. Corrected inverted summer-high seasonality.'
WHERE id = 11634
  AND property_id = 'f6adaaba-b7e7-4175-956a-b9ebc7e8d8a5';

COMMIT;
