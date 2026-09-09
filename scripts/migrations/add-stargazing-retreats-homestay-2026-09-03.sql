-- ============================================================================
-- NEW PROPERTY: Stargazing Retreats Homestay (Camp Verde, AZ)
-- Published, is_glamping_property = No (user request). Two named sites.
--
-- Sources (retrieved 2026-09-03):
--   https://www.stargazingretreatsaz.com/ (+ /all-listings /contact-us
--     /listings/447158 Night Pod, /listings/447160 Skygazing Pod)
--   Google Maps business pin:
--     https://www.google.com/maps/place/Stargazing+Retreats+Homestay/@34.602481,-111.8750147,17z
--     lat 34.602481 / lon -111.8750147; 2320 N Private Dr; plus code J42F+XX
--   Hipcamp (2 lodging sites):
--     https://www.hipcamp.com/en-US/land/arizona-stargazing-retreats-homestay-y0zhvzpq
--   Booking.com: https://www.booking.com/hotel/us/stargazing-village.html
--
-- Inventory (operator All listings — 2 SKUs):
--   The Night Pod w/King Bed for Skygazing — Guest Suite, sleeps 4, 1 bath
--   Skygazing Pod, Bedroom & Bathroom w/Private Entry — Guesthouse, sleeps 2
--   Each booking includes a transparent sky pod PLUS a private indoor bedroom
--   and bathroom in the main house (bath is not inside the pod).
--   property_total_sites = 2
--
-- Rates (USD, room_only):
--   Operator calendar requires dates to quote. Aggregators: Smartours from $240;
--   RentByOwner from $225. Applied as 225 weekday / 240 weekend all seasons
--   (year-round AZ homestay; winter stays confirmed in Feb 2026 guest review).
--
-- Host: Kathy Saephanh (Stargazing Arizona, LLC). Phone +1-602-935-9633.
-- Email: stargazingarizona@gmail.com (no email column; stored in notes).
-- Check-in 4 PM / check-out 10 AM. Pets not allowed. No indoor smoking.
-- property_type = Vacation Rental (canonical; operator brands as Homestay).
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger.
-- ============================================================================

BEGIN;

INSERT INTO public.all_sage_data (
  property_id, research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights, ota_url_hipcamp, ota_url_booking_com,
  unit_description, amenities_raw, activities_raw,
  url, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_wildlife_watching, activities_stargazing,
  activities_horseback_riding, activities_canoeing_kayaking, activities_scenic_drives,
  setting_mountainous, setting_desert,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  '9100342e-d51f-4bf9-a007-f6826632baf6'::uuid,
  'published', 'Yes', 'No', 'Sage', 'Stargazing Retreats Homestay', v.site_name,
  'web_research_stargazing_retreats_homestay_gmaps_2026_09', '2026-09-03', '2026-09-03',
  '2320 N Private Dr', 'Camp Verde', 'AZ', '86322', 34.602481, -111.8750147, 'United States',
  'stargazing-retreats-homestay-camp-verde-az', 'Vacation Rental',
  2, 1, v.unit_type, v.capacity, v.bed, v.sq_ft,
  'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'No', 'No', 'No',
  'Yes', 'No', 'Yes',
  2019, NULL::smallint, NULL::smallint,
  'Year-round (AZ high desert). Fire pit closed during fire bans. Quiet hours 10 PM.',
  '1',
  'https://www.hipcamp.com/en-US/land/arizona-stargazing-retreats-homestay-y0zhvzpq',
  'https://www.booking.com/hotel/us/stargazing-village.html',
  v.unit_desc, v.amenities,
  'Stargazing / moonbathing from transparent sky pods; on-site yoga & meditation (yogasoulretreat.com); hiking; Montezuma Castle NM (~4 mi); Montezuma Well; Sedona / Chapel of the Holy Cross (~23 mi); Verde River; Out of Africa Wildlife Park; Cliff Castle Casino (~1.9 mi).',
  'https://www.stargazingretreatsaz.com/', '+1-602-935-9633',
  'No', 'No', 'No', 'No',
  'No', 'No', 'No', 'Yes',
  'Yes', 'No', 'private_commercial',
  NULL::text, NULL::text, NULL::text,
  'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes',
  'Yes', 'Yes',
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, 'room_only',
  'No meals included. Kitchenette (kettle, coffee/tea, mini fridge); shared kitchen mentioned by Booking.com. Damage deposit $100. Children 4+ extra $15–$30/night (Agoda/Booking). Pets not allowed. Check-in 4 PM / check-out 10 AM. Guest verification via Truvi (Hipcamp). Cancel 100% refund until 30 days prior (operator).',
  $$Two-acre host-occupied homestay at 2320 N Private Dr, Camp Verde, Arizona (Google Maps 34.602481, -111.8750147; plus code J42F+XX), with Mingus Mountain views in a dark-sky community. Stargazing Arizona, LLC (Kathy Saephanh). Two bookable sky-pod stays — each includes a transparent outdoor pod plus a private indoor bedroom and bathroom in the main house. Shared fire pit, outdoor grill, free WiFi, free parking, yoga/meditation by appointment. Not a hotel; other guests may be on property.$$,
  v.note
FROM (
  VALUES
    (
      'The Night Pod w/King Bed for Skygazing', 'Dome', '4', '1 King (pod) + indoor bedroom', 119::numeric,
      '225', '240', '225', '240', '225', '240', '225', '240',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 225, 'weekend', 240),
          'spring', jsonb_build_object('weekday', 225, 'weekend', 240),
          'summer', jsonb_build_object('weekday', 225, 'weekend', 240),
          'fall', jsonb_build_object('weekday', 225, 'weekend', 240),
          'note', 'Operator listing 447158 (Guest Suite, sleeps 4). Calendar requires dates to quote. Aggregator from: RentByOwner $225 / Smartours $240. Indoor studio ~119 sq ft (Priceline). Hipcamp site “Rest and Relax Under the Night Sky”.'
        )
      ),
      $$The Night Pod: transparent sky pod with a King bed for stargazing (A/C, heat, heated blanket, privacy curtains) plus a private indoor bedroom and bathroom in the main house. Sleeps 4. Kitchenette (mini fridge, coffee/tea, kettle). Shared fire pit and yard. Bath is not inside the pod. Pets not allowed. Operator: stargazingretreatsaz.com/listings/447158.$$,
      'Sky pod (King) + indoor suite; sleeps 4; private indoor bath (walk-in shower); A/C; heat; heated blanket; WiFi; mini fridge; coffee/tea; kettle; private entrance; free parking; shared fire pit; outdoor grill; linens; hair dryer. No ensuite in pod. No pets.',
      E'[2026-09-03] New published Vacation Rental (is_glamping_property=No) from stargazingretreatsaz.com/listings/447158 + Google Maps @34.602481,-111.8750147. Operator Stargazing Arizona, LLC; email stargazingarizona@gmail.com.'
    ),
    (
      'Skygazing Pod, Bedroom & Bathroom w/Private Entry', 'Dome', '2', '1 Queen (pod) + indoor bedroom', 119::numeric,
      '225', '240', '225', '240', '225', '240', '225', '240',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 225, 'weekend', 240),
          'spring', jsonb_build_object('weekday', 225, 'weekend', 240),
          'summer', jsonb_build_object('weekday', 225, 'weekend', 240),
          'fall', jsonb_build_object('weekday', 225, 'weekend', 240),
          'note', 'Operator listing 447160 (Guesthouse, sleeps 2). Same aggregator from $225–$240 as Night Pod. Hipcamp site “Escape in a Bubble for the Night”.'
        )
      ),
      $$Skygazing Pod: transparent sky pod with private entry plus a private indoor bedroom and bathroom in the main house. Sleeps 2. A/C, heat, heated blankets, privacy curtains, WiFi. Kitchenette (mini fridge, coffee/tea). Shared fire pit. Bath is not inside the pod. Pets not allowed. Operator: stargazingretreatsaz.com/listings/447160.$$,
      'Sky pod + indoor suite with private entry; sleeps 2; private indoor bath; A/C; heat; heated blankets; WiFi; mini fridge; coffee/tea; kettle; free parking; shared fire pit; outdoor grill; linens. No ensuite in pod. No pets.',
      E'[2026-09-03] New published Vacation Rental (is_glamping_property=No) from stargazingretreatsaz.com/listings/447160 + Google Maps @34.602481,-111.8750147. Operator Stargazing Arizona, LLC; email stargazingarizona@gmail.com.'
    )
) AS v(
  site_name, unit_type, capacity, bed, sq_ft,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_sage_data x
  WHERE x.slug = 'stargazing-retreats-homestay-camp-verde-az'
);

COMMIT;
