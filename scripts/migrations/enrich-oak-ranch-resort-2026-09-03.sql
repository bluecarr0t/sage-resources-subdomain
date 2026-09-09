-- ============================================================================
-- Oak Ranch Resort (Graham, TX): publish and split 6 lodging SKUs.
--
-- Sources (retrieved 2026-09-03):
--   https://oakranchresort.com/ (+ /mirror-houses /our-casitas /la-casa-tierra
--     /faqs /activities /add-ons /book-the-whole-ranch)
--   Google Maps business pin:
--     https://www.google.com/maps/place/Oak+Ranch+Resort/@33.0448555,-98.7564419,17z
--     lat 33.0448555 / lon -98.7564419; plus code 26VV+WC; 303 Young Ln
--   OwnerRez direct book pages (no static rack on widget scrape)
--   OTA from-rates (aggregator “best-rates”):
--     Reflections Mirror House $447 (luxuryrentalstexas HA-3214998191)
--     Silver Moon / Honeymooners Delight $432 (HA-3213493443)
--     Golden Rock / A Magical Place $584 (onlinereservations HA-3213493760)
--     La Casa Tierra $1,125 (Casai HA-3213495278)
--     Whole-ranch buyout $5,097 (not stored as a site)
--
-- Operating inventory (FAQ: “all 6 of our units”; qty 1 each; total 6):
--   Reflections Mirror House, Whispering Oaks Mirror House (238 sq ft)
--   Golden Rock Casita (sleeps 8), Rocky Ridge Casita (sleeps 4),
--     Silver Moon Casita (sleeps 2)
--   La Casa Tierra (subterranean ~2,500 sq ft, sleeps 16+)
--   Whole-ranch buyout / Social House / Pavilion are not extra sites.
--   Google review “Bunk House” is La Casa Tierra bunk rooms, not a 7th SKU.
--
-- Rates USD, room_only. Seasonal shape from existing Reflections ADR
--   (winter 393/438 … summer 501/554) scaled to each unit’s spring from-rate.
--   Rocky Ridge has no published from-rate; spring weekday $490 interpolated
--   between Silver Moon $432 and Golden Rock $584.
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Oak Ranch Resort',
  slug = 'oak-ranch-resort-graham-tx',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_oak_ranch_resort_operator_gmaps_2026_09',
  address = '303 Young Lane',
  city = 'Graham',
  state = 'TX',
  zip_code = '76450',
  country = 'United States',
  lat = 33.0448555,
  lon = -98.7564419,
  url = 'https://oakranchresort.com/',
  phone_number = '+1-940-456-2806',
  property_total_sites = 6,
  year_site_opened = 2021,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'Yes',
  property_ota_platforms = ARRAY['vrbo', 'airbnb']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '57-acre gated ranch resort (founded 2021) with two 238 sq ft mirrored cabins (private hot tub, heated floors, shared sauna), three casitas with private hot tubs, and La Casa Tierra subterranean house (sleeps 16+). Shared pool, lighted pickleball, fishing pond, Social House, pavilion. Pets only at La Casa Tierra ($50, dogs).',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book via OwnerRez (oakranchresort.com/book-now-*). Check-in 3 PM / check-out 11 AM; self check-in. Quiet hours 11 PM–6 AM unless all 6 units are booked. Pets only at La Casa Tierra ($50 non-refundable, dogs only, max 2). Cancel 30+ days 94% refund; 14–29 days 44%; <14 days none. Add-ons: birthday $95, romance $60, anniversary $150. Private chef by request. Whole-ranch buyout from ~$5,097 (not a separate site).',
  description = $$57-acre gated ranch resort at 303 Young Lane, Graham, Texas (Google Maps 33.0448555, -98.7564419; plus code 26VV+WC), 15 minutes from downtown Graham and north of Possum Kingdom Lake in the Eastern Cross Timbers / Brazos bottomlands. Six lodging SKUs: Reflections and Whispering Oaks Mirror Houses (238 sq ft), Golden Rock / Rocky Ridge / Silver Moon casitas, and hillside La Casa Tierra. Shared pool, on-site sauna (by the mirror houses), lighted pickleball, catch-and-release fishing pond, Social House, and pavilion. Entire ranch books as a 34-guest buyout.$$,
  activities_raw = 'On-site: pickleball (lighted), swimming pool, sauna, fishing pond (catch-and-release), hiking/biking trails, horseshoes, cornhole, washers, stargazing, wildlife watching, private hot tubs and fire pits at each unit. Nearby: Brazos River fishing/canoeing, Lake Graham, Possum Kingdom Lake, Graham Country Club, Fort Belknap, downtown Graham square.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_golf = 'Yes',
  activities_stargazing = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes',
  setting_field = 'Yes',
  setting_forest = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 13119
  AND property_id = 'd4ef07a0-df89-4ef2-b0cc-24b4950320b7';

-- Existing qty-2 Mirror House shell becomes Reflections (named SKU).
UPDATE public.all_sage_data
SET
  site_name = 'Reflections Mirror House',
  unit_type = 'Mirror Cabin',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 Queen',
  unit_sq_ft = 238,
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = 'No',
  unit_mini_fridge = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_hot_tub = 'Yes',
  unit_sauna = 'No',
  unit_cable = 'Yes',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Shared sauna steps from the mirror houses. No wood-fire ban stated; private fire pit on patio.',
  minimum_nights = '1',
  unit_description = $$Reflections Mirror House: 238 sq ft Scandinavian mirrored cabin among the oaks. Queen bed, spa bath with walk-in shower, heated floors, A/C and heat, kitchenette (mini-fridge, hotplate, toaster, ice maker, Keurig), Wi-Fi, smart TV (Dish). Private patio with Adirondack chairs, gas BBQ/flat-top, fire pit, and private hot tub. Sleeps 2. Shared on-site sauna between the two mirror houses. No pets.$$,
  amenities_raw = '238 sq ft mirror cabin; Queen; sleeps 2; private bath/walk-in shower; heated floors; kitchenette; mini-fridge; Keurig; Wi-Fi; smart TV; private patio; gas BBQ; fire pit; private hot tub. Shared sauna nearby. No pets.',
  rate_winter_weekday = '393',
  rate_winter_weekend = '438',
  rate_spring_weekday = '447',
  rate_spring_weekend = '483',
  rate_summer_weekday = '501',
  rate_summer_weekend = '554',
  rate_fall_weekday = '465',
  rate_fall_weekend = '510',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 393, 'weekend', 438),
      'spring', jsonb_build_object('weekday', 447, 'weekend', 483),
      'summer', jsonb_build_object('weekday', 501, 'weekend', 554),
      'fall', jsonb_build_object('weekday', 465, 'weekend', 510),
      'note', 'USD. Keep existing Reflections OTA from-rate $447 as spring weekday. luxuryrentalstexas HA-3214998191. Book direct oakranchresort.com/book-now-reflections.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split qty-2 Mirror House into six named SKUs from oakranchresort.com + Google Maps @33.0448555,-98.7564419. This row is Reflections Mirror House.'
WHERE id = 13119
  AND property_id = 'd4ef07a0-df89-4ef2-b0cc-24b4950320b7';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_boating, activities_paddling, activities_golf, activities_stargazing,
  activities_wildlife_watching, activities_historic_sightseeing, activities_scenic_drives,
  setting_ranch, setting_field, setting_forest,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Oak Ranch Resort', v.site_name,
  'web_research_oak_ranch_resort_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  6, 1::numeric, v.unit_type, v.capacity, v.bed, v.sq_ft,
  'Yes', 'Yes', v.kitchenette, v.full_kitchen,
  'Yes', 'Yes', v.pets, 'Yes', 'Yes',
  'Yes', 'Yes', v.gas_fp, 'Yes', 'Yes', 'No',
  v.mini_fridge, v.picnic, 'Yes', 'No',
  v.year_opened, NULL::smallint, NULL::smallint,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_boating, g.activities_paddling, g.activities_golf, g.activities_stargazing,
  g.activities_wildlife_watching, g.activities_historic_sightseeing, g.activities_scenic_drives,
  g.setting_ranch, g.setting_field, g.setting_forest,
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
      'Whispering Oaks Mirror House', 'Mirror Cabin', '2', '1 Queen', 238::numeric,
      'Yes', 'No', 'No', 'Yes', 'No', 'No',
      2025::numeric, 'Year-round. Shared sauna between the two mirror houses.',
      '393', '438', '447', '483', '501', '554', '465', '510',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 393, 'weekend', 438), 'spring', jsonb_build_object('weekday', 447, 'weekend', 483), 'summer', jsonb_build_object('weekday', 501, 'weekend', 554), 'fall', jsonb_build_object('weekday', 465, 'weekend', 510), 'note', 'USD. Same band as Reflections ($447 OTA from-rate). Book direct oakranchresort.com/book-now-whispering-oaks-mirror-house. Arrived Dec 2025.')),
      $$Whispering Oaks Mirror House: 238 sq ft Scandinavian mirrored cabin among the oaks (same spec as Reflections). Queen bed, spa bath with walk-in shower, heated floors, kitchenette, Wi-Fi, smart TV. Private patio, gas BBQ/flat-top, fire pit, private hot tub. Sleeps 2. Shared sauna between the mirror houses. No pets.$$,
      '238 sq ft mirror cabin; Queen; sleeps 2; private bath; heated floors; kitchenette; mini-fridge; Wi-Fi; private patio; gas BBQ; fire pit; private hot tub. Shared sauna. No pets.',
      E'[2026-09-03] Added from oakranchresort.com/mirror-houses.'
    ),
    (
      'Golden Rock Casita', 'Casita', '8', '1 King + 2 bunks (twin over full)', NULL::numeric,
      'Yes', 'No', 'No', 'Yes', 'No', 'No',
      2023::numeric, 'Year-round. 2 bedroom / 1 bath casita. Shared pool and pickleball.',
      '513', '572', '584', '631', '655', '724', '607', '666',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 513, 'weekend', 572), 'spring', jsonb_build_object('weekday', 584, 'weekend', 631), 'summer', jsonb_build_object('weekday', 655, 'weekend', 724), 'fall', jsonb_build_object('weekday', 607, 'weekend', 666), 'note', 'USD. OTA from-rate $584 (A Magical Place, HA-3213493760) as spring weekday; seasonal ratios from Reflections ADR. Book direct oakranchresort.com/book-now-golden-rock-casita.')),
      $$Golden Rock Casita: two-bedroom casita sleeping 8. King in bedroom 1; two bunks (twins over fulls) in bedroom 2. Kitchenette with cooktop, microwave, Keurig, retro refrigerator. Smart TV, Wi-Fi. Covered patio, gas grill, private fire pit, private hot tub. Shared pool and pickleball. No pets (operator FAQ).$$,
      '2BR casita; King + twin-over-full bunks; sleeps 8; kitchenette; Wi-Fi; smart TV; covered patio; gas grill; fire pit; private hot tub. Shared pool/pickleball. No pets.',
      E'[2026-09-03] Added from oakranchresort.com/our-casitas (Golden Rock).'
    ),
    (
      'Rocky Ridge Casita', 'Casita', '4', '1 King + sofa bed', NULL::numeric,
      'Yes', 'No', 'No', 'Yes', 'No', 'No',
      2023::numeric, 'Year-round. 1 bedroom / 1 bath casita with 270° views. Shared pool and pickleball.',
      '431', '480', '490', '530', '549', '607', '510', '559',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 431, 'weekend', 480), 'spring', jsonb_build_object('weekday', 490, 'weekend', 530), 'summer', jsonb_build_object('weekday', 549, 'weekend', 607), 'fall', jsonb_build_object('weekday', 510, 'weekend', 559), 'note', 'USD. No published Rocky Ridge from-rate. Spring weekday $490 interpolated between Silver Moon $432 and Golden Rock $584; seasonal ratios from Reflections ADR. Book direct oakranchresort.com/book-now-rocky-ridge-casita.')),
      $$Rocky Ridge Casita: one-bedroom casita sleeping 4 (king + full sofa bed) with 270-degree ranch views. Separate living/dining, kitchenette with cooktop, microwave, Keurig, mini-fridge. Smart TV, Wi-Fi. Covered patio, gas grill, private fire pit, private hot tub. Shared pool and pickleball. No pets.$$,
      '1BR casita; King + sofa bed; sleeps 4; kitchenette; mini-fridge; Wi-Fi; covered patio; gas grill; fire pit; private hot tub. Shared pool/pickleball. No pets.',
      E'[2026-09-03] Added from oakranchresort.com/our-casitas (Rocky Ridge).'
    ),
    (
      'Silver Moon Casita', 'Casita', '2', '1 King', NULL::numeric,
      'Yes', 'No', 'No', 'Yes', 'No', 'No',
      2023::numeric, 'Year-round. Couples studio casita. Shared pool and pickleball.',
      '380', '423', '432', '467', '484', '535', '449', '493',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 380, 'weekend', 423), 'spring', jsonb_build_object('weekday', 432, 'weekend', 467), 'summer', jsonb_build_object('weekday', 484, 'weekend', 535), 'fall', jsonb_build_object('weekday', 449, 'weekend', 493), 'note', 'USD. OTA from-rate $432 (Honeymooners Delight, HA-3213493443) as spring weekday. Airbnb 843408394067107380. Book direct oakranchresort.com/book-now-silver-moon-casita.')),
      $$Silver Moon Casita: romantic studio built for two. King bed, separate bathroom with closet, kitchenette with cooktop, microwave, Keurig, mini-fridge. Smart TV, Wi-Fi. Private back patio, gas grill, fire pit, private hot tub. Shared pool and pickleball. No pets.$$,
      'Studio casita; King; sleeps 2; kitchenette; mini-fridge; Wi-Fi; private patio; gas grill; fire pit; private hot tub. Shared pool/pickleball. No pets.',
      E'[2026-09-03] Added from oakranchresort.com/our-casitas (Silver Moon).'
    ),
    (
      'La Casa Tierra', 'Cave House', '16', '2 King + bunks + sofa/daybed', 2500::numeric,
      'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      2021::numeric, 'Year-round. Hillside/subterranean house (~2,500 sq ft). Only pet-friendly unit ($50, dogs, max 2). Laundry on site.',
      '989', '1103', '1125', '1216', '1261', '1394', '1170', '1284',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 989, 'weekend', 1103), 'spring', jsonb_build_object('weekday', 1125, 'weekend', 1216), 'summer', jsonb_build_object('weekday', 1261, 'weekend', 1394), 'fall', jsonb_build_object('weekday', 1170, 'weekend', 1284), 'note', 'USD. OTA from-rate $1,125 (Casai HA-3213495278) as spring weekday; seasonal ratios from Reflections ADR. Book direct oakranchresort.com/book-now-la-casa-tierra. Structure marketed as 45+ year dugout, renovated.')),
      $$La Casa Tierra: hillside subterranean house (~2,500 sq ft) sleeping 16+. Four bedrooms and three full baths — master king + daybed with ensuite; second king with bath across the hall; two bunk rooms sharing a hall bath; Great Room sofa bed. Full kitchen, laundry, Wi-Fi, three TVs, mini office/library, gazebo, gas grill, private hot tub and fire pit. Shared pool and pickleball. Dogs only ($50, max 2).$$,
      'Subterranean house; 4BR/3BA; sleeps 16+; full kitchen; laundry; Wi-Fi; 3 TVs; gazebo; gas grill; fire pit; private hot tub. Shared pool/pickleball. Pets: dogs only.',
      E'[2026-09-03] Added from oakranchresort.com/la-casa-tierra + /underground-homes.'
    )
) AS v(
  site_name, unit_type, capacity, bed, sq_ft,
  kitchenette, full_kitchen, pets, mini_fridge, picnic, gas_fp,
  year_opened, season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13119
  AND g.property_id = 'd4ef07a0-df89-4ef2-b0cc-24b4950320b7'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'd4ef07a0-df89-4ef2-b0cc-24b4950320b7'
      AND x.site_name = v.site_name
  );

COMMIT;
