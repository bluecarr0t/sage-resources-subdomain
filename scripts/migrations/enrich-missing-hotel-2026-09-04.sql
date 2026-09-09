-- ============================================================================
-- Missing Hotel (Marble Falls, TX / Hill Country): publish existing 8-dome /
-- 3-villa inventory. Distinct from Cypress Valley (Spicewood), Firesong Ranch,
-- On The Rocks Glamping, Safari for the Soul, and Talula Mesa. Do not merge.
--
-- Sources (retrieved 2026-09-04):
--   https://www.missinghotel.com/ (+ /faq /villas-and-domes /gift /rooms/zephyr)
--   Google Maps business pin:
--     https://www.google.com/maps/place/Missing+Hotel/@30.6029341,-98.0875203,17z
--     lat 30.6029341 / lon -98.0875203; plus code JW36+5X
--     11980 Farm to Market Rd 1174 / 11980 S FM 1174, Marble Falls, TX 78654
--     (skip google_place_id — hex CID /g/11ptqj8cg0 only, not ChIJ)
--   Tribeza: opened 2022; 11 custom structures on ~100 acres
--   Operator FAQ: eight domes + three villas
--
-- Operating inventory (already split; do not invent Luna/Sol/Ukiyo SKUs):
--   Geodesic Dome qty 8 — Sol (Sabi, Vagary, Morii, Habibi) + Luna (Axia,
--     Nova, Trouvay) + Ukiyo loft dome.
--   Treetop Villa qty 3 — Zephyr (king, 650 sf), Yoku, Rame.
--   property_total_sites = 11
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator gift page: weekday ~$400 / weekend ~$500.
--   Maps Sep 7–8 2026: official $539; Expedia $512; 2Q $585; Priceline from
--     $228. Nearby listings Yoku $303 / Morii $286.
--   Keep existing dome band (TripAdvisor park ADR ~$489.5, 2026-09-01).
--   Replace villa 70/88/82 (bad Hotels.com $79 scrape) with a villa-premium
--     band around official weekday $539.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Missing Hotel',
  slug = 'missing-hotel-marble-falls-tx',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_missing_hotel_operator_gmaps_2026_09',
  address = '11980 S FM 1174',
  city = 'Marble Falls',
  state = 'TX',
  zip_code = '78654',
  country = 'United States',
  lat = 30.6029341,
  lon = -98.0875203,
  url = 'https://www.missinghotel.com/',
  phone_number = '+1-512-200-3530',
  property_total_sites = 11,
  year_site_opened = 2022,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY['expedia', 'kayak', 'tripadvisor']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'MICHELIN Guide–listed 100-acre Hill Country glamping retreat (Sam & Stephen Hopkins). 11 custom shelters: 8 geodesic / treetop domes + 3 modern villas, each with ensuite bath, A/C, deck, Blackstone grill, and a private hot tub or plunge pool. Tesla charger on site. Distinct from Talula Mesa, On The Rocks, Cypress Valley, and Safari for the Soul. hello@missinghotel.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book missinghotel.com / reserve.missinghotel.com. Check-in 3:00 PM / check-out 11:00 AM. No restaurant; cook on in-unit Blackstone or dine in Marble Falls / Liberty Hill. Up to two well-behaved dogs (fee); do not leave dogs unattended. Children in villas + Ukiyo only (not Sol/Luna domes). Gift-page published average weekday ~$400 / weekend ~$500. hello@missinghotel.com; (512) 200-3530.',
  description = $$Boutique glamping retreat at 11980 S FM 1174, Marble Falls, Texas (Google Maps 30.6029341, -98.0875203; plus code JW36+5X), on ~100 acres next to Balcones Canyonlands wildlife refuge. Eleven custom shelters: eight geodesic / treetop domes and three modern villas, each with ensuite bath, A/C, and a private hot tub or plunge pool. Opened 2022 by Sam and Stephen Hopkins. 45 minutes from downtown Austin. Distinct from Talula Mesa, On The Rocks, Cypress Valley, and Safari for the Soul.$$,
  activities_raw = 'On-site: forest bathing, yoga, meditation labyrinth, hiking/biking trails, hammocks and swinging chairs under the “Living Room” live oaks, private decks, Blackstone grills, communal gas grill, mini cows, stargazing, Tesla charger. Off-site (10–30 min): Camp Creek / Highland Lakes, Balcones nature preserve trailhead, Marble Falls and Liberty Hill dining, Flat Creek Winery, Bear King Brewery.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'No',
  activities_swimming = 'No',
  activities_paddling = 'No',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_forest = 'Yes',
  setting_field = 'Yes',
  setting_ranch = 'Yes',
  setting_canyon = 'Yes',
  setting_lake = 'No',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE property_id = 'e9a87278-37c9-4575-81a9-e157199873b5';

-- Geodesic Dome qty 8.
UPDATE public.all_sage_data
SET
  site_name = 'Geodesic Dome',
  unit_type = 'Dome',
  quantity_of_units = 8,
  unit_capacity = '2',
  unit_bed = 'Queen (Ukiyo: 2 Queens + loft)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Sol cluster (Sabi, Vagary, Morii, Habibi), Luna cluster (Axia, Nova, Trouvay), and Ukiyo loft dome. Qty 8 from operator FAQ.',
  minimum_nights = '1',
  unit_description = $$Geodesic / treetop dome (qty 8): Sol domes Sabi, Vagary, Morii, Habibi plus Luna domes Axia, Nova, Trouvay (~304 sf, queen, 2 adults) and Ukiyo (~480 sf loft, 2 queens, sleeps 4). Ensuite bath, A/C, deck, Blackstone grill, record player, private hot tub or plunge pool. Children in Ukiyo only — not Sol/Luna. Dogs allowed (fee). Do not invent separate Luna/Sol/Ukiyo SKUs; operator publishes 8 domes as one class.$$,
  amenities_raw = 'Geodesic dome; ensuite; A/C; Wi-Fi (~5 Mbps); deck; Blackstone grill; mini-fridge; private hot tub or plunge pool. Ukiyo has loft + rope bridge. Pets OK (fee). No kids in Sol/Luna.',
  rate_winter_weekday = '431',
  rate_winter_weekend = '480',
  rate_spring_weekday = '490',
  rate_spring_weekend = '529',
  rate_summer_weekday = '549',
  rate_summer_weekend = '608',
  rate_fall_weekday = '510',
  rate_fall_weekend = '559',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 431, 'weekend', 480),
      'spring', jsonb_build_object('weekday', 490, 'weekend', 529),
      'summer', jsonb_build_object('weekday', 549, 'weekend', 608),
      'fall', jsonb_build_object('weekday', 510, 'weekend', 559),
      'note', 'USD room_only. Kept 2026-09-01 TripAdvisor park ADR band (avg $489.5). Maps Sep 7–8 2026 official $539 / Expedia $512 / 2Q $585; Priceline from $228; Airbnb-style Morii $286. Operator gift-page average weekday ~$400 / weekend ~$500.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from in_progress using missinghotel.com + FAQ (8 domes + 3 villas) + Google Maps @30.6029341,-98.0875203 (JW36+5X). Replaced stub lat/lon 30.5782,-98.2751. This row is Geodesic Dome qty 8. Distinct from Talula Mesa / On The Rocks / Cypress Valley / Safari for the Soul.'
WHERE id = 13086
  AND property_id = 'e9a87278-37c9-4575-81a9-e157199873b5';

-- Treetop Villa qty 3. unit_type Cabin → Villa. Fix $79 ADR scrape.
UPDATE public.all_sage_data
SET
  site_name = 'Treetop Villa',
  unit_type = 'Villa',
  quantity_of_units = 3,
  unit_capacity = '2',
  unit_bed = 'King (Zephyr) or Queen (Yoku, Rame)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Zephyr (650 sf, king), Yoku (glass-roof cabin), Rame (casita + rope bridge). Qty 3 from operator FAQ.',
  minimum_nights = '1',
  unit_description = $$Treetop villa (qty 3): Zephyr (largest, 650 sf, king, living room, kitchenette, indoor/outdoor shower, outdoor tub, in-unit washer/dryer), Yoku (Shou Sugi Ban “chic shack,” glass roof), and Rame (minimalist casita + rope bridge). Ensuite bath, A/C, private hot tub or plunge pool, Blackstone grill. One child allowed. Dogs allowed (fee). Do not invent per-villa SKUs; operator publishes 3 villas as one class.$$,
  amenities_raw = 'Modern villa/cabin; ensuite; A/C; Wi-Fi; kitchenette (Zephyr); deck; Blackstone grill; private hot tub or plunge pool. Zephyr has W/D + outdoor tub. Pets OK (fee). Kids allowed.',
  rate_winter_weekday = '500',
  rate_winter_weekend = '575',
  rate_spring_weekday = '560',
  rate_spring_weekend = '640',
  rate_summer_weekday = '650',
  rate_summer_weekend = '740',
  rate_fall_weekday = '580',
  rate_fall_weekend = '660',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 500, 'weekend', 575),
      'spring', jsonb_build_object('weekday', 560, 'weekend', 640),
      'summer', jsonb_build_object('weekday', 650, 'weekend', 740),
      'fall', jsonb_build_object('weekday', 580, 'weekend', 660),
      'note', 'USD room_only. Replaces 2026-09-01 Hotels.com $79 scrape (70/88/82) which was not a villa ADR. Villa-premium vs dome. Maps Sep 7–8 2026 official $539 / Expedia $512; nearby Yoku listing $303. Operator gift-page average weekday ~$400 / weekend ~$500.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + remapped unit_type Cabin → Villa. Replaced bad Hotels.com $79 villa ADR. This row is Treetop Villa qty 3 (Zephyr, Yoku, Rame).'
WHERE id = 13087
  AND property_id = 'e9a87278-37c9-4575-81a9-e157199873b5';

COMMIT;
