-- ============================================================================
-- Tutka Bay Lodge (Homer / Kachemak Bay, AK): publish cabin inventory.
-- Distinct from Stillpoint Lodge (Halibut Cove, id 11684), Between Beaches
-- Alaska Lodge, The Lodge at Otter Cove, Kachemak Bay Wilderness Lodge,
-- sold Winterlake Lodge, Danish Daughter Farm (flower farm), and La Baleine
-- Cafe on the Homer Spit. Do not merge those. Do not add the wellness yurt
-- or Widgeon II cooking-school boat as lodging SKUs.
--
-- Sources (retrieved 2026-09-04):
--   https://withinthewild.com/lodges/tutka-bay-lodge/ (+ /about-us/)
--   Google Maps business pin:
--     https://www.google.com/maps/place/Tutka+Bay+Lodge/@59.4736941,-151.484079,17z
--     lat 59.4736941 / lon -151.484079; plus code FGF8+F9
--     SE coast across Kachemak Bay, Homer, AK 99603
--     (skip google_place_id — CID /g/11bbrm3y0g only, not ChIJ)
--   GoNorth 2026 rate card (pp, transfers extra):
--     https://gonorth-alaska.com/travel-center/tutka-bay-lodge/
--   Rustic Vacations / AdventureSmith / Traveller Made (cabin names)
--   Travel Weekly: Dixons purchased the then-26-year-old lodge in 2009
--
-- Operating inventory:
--   Cabin qty 6 — operator “six private cabins.” Named bookable units across
--     trade copy: Oyster Catcher, Crow’s Nest (upstairs suite, often paired
--     with Oyster Catcher), Eagle’s Nest, Kittiwake, Steller’s Jay, Loon.
--     GoNorth “five” and AdventureSmith “four (one split)” are stale.
--     Do not invent per-SKU cabin rows. Wellness yurt is an amenity.
--   property_total_sites = 6
--
-- Rates USD, all_inclusive. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator: from $9,900 for a 3-night stay (Alaska Fly Out: per person)
--     = $3,300 pp/night. Store unit ADR as double occupancy (pp × 2) =
--     $6,600, same convention as Stillpoint Lodge. 3-night min.
--   GoNorth 2026: $9,515 pp / 3 nights ($3,172 pp); $11,915 / 4 nights.
--     Water taxi Homer–lodge $200 pp extra on that card.
--   Rustic Vacations $2,000–$2,400 pp/night and stub 1936–2728 ($2,200
--     GoNorth avg) are stale. Alaska Rail $11,747 pp includes air — ignore.
--   Closed October–April; winter rates left null.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Tutka Bay Lodge',
  slug = 'tutka-bay-lodge-homer-ak',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_tutka_bay_lodge_operator_gmaps_2026_09',
  address = 'Tutka Bay, Kachemak Bay',
  city = 'Homer',
  state = 'AK',
  zip_code = '99603',
  country = 'United States',
  lat = 59.4736941,
  lon = -151.484079,
  url = 'https://withinthewild.com/lodges/tutka-bay-lodge/',
  phone_number = '+1-907-274-2710',
  property_total_sites = 6,
  year_site_opened = 2009,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Dixon family (Within the Wild) all-inclusive wilderness lodge on ~35–40 private acres at the mouth of Tutka Bay / Kachemak Bay State Park. Water taxi from Homer Harbor or floatplane from Anchorage. Six hard-walled guest cabins + main lodge; Michelin-trained / James Beard kitchen; Condé Nast and Travel + Leisure lodge awards; 2024 Oprah Hotel O-Award. Wellness yurt and Widgeon II cooking boat are amenities, not lodging. Not a glamping camp. Distinct from Stillpoint Lodge. info@withinthewild.com.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'USD per person packages; unit ADR stored as double occupancy (pp × 2), same as Stillpoint. Operator from $9,900 / 3 nights = $3,300 pp ($6,600 unit). Includes private cabin, three plated meals + appetizer hour, personal guide, two out-camp excursions, daily yoga, hot tub/sauna, cooking classes, lodge adventure gear, house wine and beer, fishing license. Transfers typically extra (GoNorth water taxi $200 pp). 3-night min (4 recommended). Closed Oct–Apr. No pets. Gratuity extra. info@withinthewild.com; +1-907-274-2710.',
  description = $$All-inclusive wilderness lodge at Tutka Bay on Kachemak Bay, Homer, Alaska (Google Maps 59.4736941, -151.484079; plus code FGF8+F9), about a 25–30 minute water taxi from Homer Harbor or a floatplane from Anchorage. Six private guest cabins plus a main lodge with dining, bar, two hot tubs, sauna, and a wellness yurt, on ~35–40 acres beside Kachemak Bay State Park. Dixon family purchased the existing lodge in 2009 (predecessor ~1983). Distinct from Stillpoint Lodge in Halibut Cove and from sold Winterlake Lodge.$$,
  activities_raw = 'On-site: main-lodge dining and appetizer hour, daily yoga, cooking classes, forest/meditation walks, foraging, two hot tubs, sauna, wellness yurt, kayaking, tidepooling, snorkeling, dock fishing, Widgeon II cooking-school boat. Included: personal guide and two out-camp excursions (Katmai bear viewing, helicopter glacier, wildlife cruise, deep-sea fishing — package-dependent). Nearby: Kachemak Bay State Park, Homer / Homer Spit, Seldovia, Danish Daughter Farm (sister flower farm, not lodging).',
  activities_hiking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_boating = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'No',
  activities_historic_sightseeing = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  setting_lake = 'No',
  setting_coastal = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11683
  AND property_id = '43a55271-077b-4744-bdfc-283f7a51d092';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 6,
  unit_capacity = '2',
  unit_bed = 'King, twins, or mix (varies by cabin; some sleep 4–5)',
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
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_mini_fridge = 'No',
  unit_ada_accessibility = 'No',
  season_open_month = 5,
  season_close_month = 9,
  operating_season_months = 'Seasonal May 1–September 30 (GoNorth / Alaska Rail through ~Sep 27). 3-night minimum; 4 nights recommended. Closed October–April.',
  minimum_nights = '3',
  unit_description = $$Private guest cabin (qty 6): operator “six private cabins.” Trade copy names Oyster Catcher, Crow’s Nest (separate upstairs suite above Oyster Catcher, often booked together), Eagle’s Nest, Kittiwake, Steller’s Jay, and Loon — ensuite, decks/balconies, Wi-Fi, heat. Mix sleeps 2–5. Do not invent per-SKU cabin rows. The wellness yurt, Widgeon II cooking boat, and main lodge rooms are amenities / common space, not extra lodging.$$,
  amenities_raw = 'Hard-walled cabin; private bath; heat; Wi-Fi; deck or balcony. Shared: main-lodge dining/bar, two hot tubs, sauna, wellness yurt, kayaks/gear. No pets. No A/C. Meals included.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '6600',
  rate_spring_weekend = '6600',
  rate_summer_weekday = '6600',
  rate_summer_weekend = '6600',
  rate_fall_weekday = '6600',
  rate_fall_weekend = '6600',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'spring', jsonb_build_object('weekday', 6600, 'weekend', 6600),
      'summer', jsonb_build_object('weekday', 6600, 'weekend', 6600),
      'fall', jsonb_build_object('weekday', 6600, 'weekend', 6600),
      'note', 'USD all_inclusive, double occupancy. Operator from $9,900 pp / 3 nights = $3,300 pp → $6,600 unit. GoNorth 2026 $9,515 pp / 3 nights. Replaces 2026-09-01 $2,200 GoNorth-avg stub (1936–2728). Closed Oct–Apr. Transfers extra. withinthewild.com/lodges/tutka-bay-lodge.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from in_progress using withinthewild.com + GoNorth 2026 + Google Maps @59.4736941,-151.484079 (FGF8+F9). Replaced stub lat/lon 59.451,-151.323 and phone 907-435-4011. rate_basis unknown → all_inclusive; is_glamping_property No. This row is Cabin qty 6. Distinct from Stillpoint Lodge and sold Winterlake Lodge.'
WHERE id = 11683
  AND property_id = '43a55271-077b-4744-bdfc-283f7a51d092';

COMMIT;
