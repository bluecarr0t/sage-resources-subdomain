-- ============================================================================
-- The Disco Ranch / Disco Domes (Fischer, TX / Hill Country): publish and
-- split the two named geodesic domes. Distinct from other Lipan Run /
-- Wimberley / Canyon Lake vacation rentals and from Sound Cream park
-- parties (not lodging). Do not add event space, Disco Ranch Radio, or
-- a 3rd dome.
--
-- Sources (retrieved 2026-09-04):
--   https://www.thediscodomes.com/ (+ /disco-dome-africa /disco-dome-mexico
--     /faq /contact)
--   Voyage Austin: Danielle + Andres Rizo launched October 2021
--   Google Maps business pin (listed as The Disco Domes):
--     https://www.google.com/maps/place/The+Disco+Domes/@29.9452556,-98.2005129,17z
--     lat 29.9452556 / lon -98.2005129; plus code WQWX+4Q
--     698 Lipan Run, Fischer, TX 78623
--     (skip google_place_id — /g/11hzppnqhd only, not ChIJ)
--   Airbnb:
--     Africa https://www.airbnb.com/rooms/51966007
--     Mexico https://www.airbnb.com/rooms/719845335488177027
--   Booking.com:
--     https://www.booking.com/hotel/us/the-disco-domes.html
--
-- Operating inventory:
--   Disco Dome Africa qty 1 — Serengeti-inspired; outdoor bathhouse
--   Disco Dome Mexico qty 1 — Tulum-inspired; private bath + grass yard
--   property_total_sites = 2. Both 21+ / 2 adults, 1 king. Year-round.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator from-rates: Africa $325 / Mexico $335.
--   Maps official site Nov 30–Dec 1 2026: $413 (dated sample above the
--     from-rate — not stored as weekend ADR). VRBO aggregator $600+ ignored.
--   Existing stub already 325 flat (Africa from-rate).
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'The Disco Ranch',
  slug = 'the-disco-ranch-fischer-tx',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_the_disco_ranch_operator_gmaps_2026_09',
  address = '698 Lipan Run',
  city = 'Fischer',
  state = 'TX',
  zip_code = '78623',
  country = 'United States',
  lat = 29.9452556,
  lon = -98.2005129,
  url = 'https://www.thediscodomes.com/',
  phone_number = '+1-512-657-7058',
  property_total_sites = 2,
  year_site_opened = 2021,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY['airbnb', 'booking.com']::text[],
  ota_url_airbnb = 'https://www.airbnb.com/rooms/51966007',
  ota_url_booking_com = 'https://www.booking.com/hotel/us/the-disco-domes.html',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Danielle + Andres Rizo’s adults-only “nature nightclub” on Lipan Run in the Texas Hill Country (Fischer; Wimberley ~20 min, Austin ~1 hr). Two luxury geodesic Disco Domes with full kitchens, A/C, fireplaces, surround sound + disco ball, private 8-ft cold plunge, outdoor soaking tub, rain showers. 21+ / two guests. No pets. Launched October 2021. Sound Cream park parties and member music events are not lodging. Distinct from nearby Canyon Lake / Wimberley cabins.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Self-cater (full kitchen; pour-over coffee). No meals included. Check-in 3:00 PM / check-out 11:00 AM. 21+ only; two adults. No pets (service animals by prior arrangement; ESAs do not qualify). Quiet hours 10pm–8am. Maps official site $413 Nov 30–Dec 1 2026 is a dated sample above the operator from-rate. +1-512-657-7058.',
  description = $$Adults-only geodesic-dome glamping at 698 Lipan Run, Fischer, Texas (Google Maps 29.9452556, -98.2005129; plus code WQWX+4Q), marketed as The Disco Domes at The Disco Ranch in the Hill Country between Wimberley (~20 min) and Canyon Lake (~8 min). Two named luxury domes — Africa and Mexico — each with a king bed, full kitchen, A/C, fireplace, surround sound and disco ball, private cold plunge, and outdoor soaking tub. Launched October 2021 by Danielle and Andres Rizo. 21+ / two guests; no pets. Not a family ranch and not a campground.$$,
  activities_raw = 'On-site: private cold plunge, outdoor soaking tub / disco bathtub, fire pit, hammock, stargazing, curated DJ mixes / disco-ball “club for two,” board games, optional gas grill ($50 setup on Mexico listing). Nearby: Canyon Lake (~8 min), Wimberley (~20 min), Devil’s Backbone, Austin (~1 hr). Sound Cream outdoor dance parties are off-site / member events — not lodging. No restaurant.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes',
  setting_field = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11437
  AND property_id = '59ed4e96-43d0-4ba2-9949-bb8c68dde7a0';

UPDATE public.all_sage_data
SET
  site_name = 'Disco Dome Africa',
  unit_type = 'Dome',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 King',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Adults-only (21+), two guests. Serengeti-inspired dome with open-air bathhouse (flush toilet, sink, two rain showers) and lounge deck. Quiet hours 10pm–8am.',
  minimum_nights = '1',
  unit_description = $$Disco Dome Africa (qty 1): Serengeti-inspired geodesic dome with a plush king, full kitchen, dining, fireplace, spa robes, and surround sound + disco ball. Lounge deck with 8-ft cold plunge, disco soaking tub, fire pit, hammock, and outdoor shower. Outdoor bathhouse (not an indoor ensuite). Sleeps 2 adults only. Operator from $325/night. Do not invent a second Africa dome.$$,
  amenities_raw = 'Geodesic dome; king; full kitchen; A/C; fireplace; Wi-Fi; surround sound / disco ball; private cold plunge; outdoor soaking tub; fire pit; hammock; outdoor rain showers. 21+. No pets. No TV.',
  rate_winter_weekday = '325',
  rate_winter_weekend = '325',
  rate_spring_weekday = '325',
  rate_spring_weekend = '325',
  rate_summer_weekday = '325',
  rate_summer_weekend = '325',
  rate_fall_weekday = '325',
  rate_fall_weekend = '325',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 325, 'weekend', 325),
      'spring', jsonb_build_object('weekday', 325, 'weekend', 325),
      'summer', jsonb_build_object('weekday', 325, 'weekend', 325),
      'fall', jsonb_build_object('weekday', 325, 'weekend', 325),
      'note', 'USD room_only. Operator starting at $325 (thediscodomes.com/disco-dome-africa). Maps official site $413 Nov 30–Dec 1 2026 is a dated sample above the from-rate — not stored as weekend ADR. Airbnb airbnb.com/rooms/51966007.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Dome qty 2 stub using thediscodomes.com + Google Maps @29.9452556,-98.2005129 (WQWX+4Q). This row is Disco Dome Africa qty 1. Corrected stub lat/lon 29.9274,-98.2366. rate_basis unknown → room_only. 21+ / no pets.'
WHERE id = 11437
  AND property_id = '59ed4e96-43d0-4ba2-9949-bb8c68dde7a0';

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
  operating_season_months, minimum_nights, ota_url_airbnb, ota_url_booking_com,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_fitness_room, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_swimming, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives,
  setting_ranch, setting_field, setting_mountainous,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'The Disco Ranch', v.site_name,
  'web_research_the_disco_ranch_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  2, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'Yes', 'No',
  'No', 'No', v.grill, 'No',
  2021::numeric, NULL::smallint, NULL::smallint,
  v.season, '1', v.airbnb, g.ota_url_booking_com,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_swimming, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives,
  g.setting_ranch, g.setting_field, g.setting_mountainous,
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
      'Disco Dome Mexico', 1::numeric, 'Dome', '2', '1 King',
      'Yes',
      'Year-round. Adults-only (21+), two guests. Tulum-inspired dome at the end of the road with a private grass yard. Quiet hours 10pm–8am.',
      '335', '335', '335', '335', '335', '335', '335', '335',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 335, 'weekend', 335), 'spring', jsonb_build_object('weekday', 335, 'weekend', 335), 'summer', jsonb_build_object('weekday', 335, 'weekend', 335), 'fall', jsonb_build_object('weekday', 335, 'weekend', 335), 'note', 'USD room_only. Operator starting at $335 (thediscodomes.com/disco-dome-mexico). Maps official $413 Nov 30–Dec 1 2026 is a dated property-level sample — not stored as weekend ADR. Airbnb airbnb.com/rooms/719845335488177027.')),
      $$Disco Dome Mexico (qty 1): Tulum-inspired geodesic dome at the end of the road for total seclusion. King bed, full kitchen (gas burners, small oven, fridge), fireplace, spa robes, surround sound + disco ball. Private 8-ft cold plunge, two-person outdoor soaking tub, Tulum outdoor bathhouse (toilet, sink, rain shower), fire pit, hammock, grass yard. Gas grill available with $50 setup. Sleeps 2 adults only. Operator from $335/night. Do not invent a second Mexico dome.$$,
      'Geodesic dome; king; full kitchen; A/C; fireplace; Wi-Fi; surround sound / disco ball; private cold plunge; outdoor soaking tub; outdoor bathhouse; fire pit; grass yard. 21+. No pets. Grill $50 setup.',
      'https://www.airbnb.com/rooms/719845335488177027',
      E'[2026-09-04] Added Disco Dome Mexico qty 1 from thediscodomes.com/disco-dome-mexico + Airbnb 719845335488177027.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  grill,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, airbnb, note
)
WHERE g.id = 11437
  AND g.property_id = '59ed4e96-43d0-4ba2-9949-bb8c68dde7a0'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '59ed4e96-43d0-4ba2-9949-bb8c68dde7a0'
      AND x.site_name = v.site_name
  );

COMMIT;
