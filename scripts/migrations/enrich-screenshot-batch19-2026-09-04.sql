-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Canopée Lit — official 8 tree cabins + 6 unpublished bubbles. From CAD 220.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Canopée Lit', slug = 'canopee-lit',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_canopee_lit_2026_09',
  address = '303 Chemin de l''Anse-de-Roche', city = 'Sacré-Coeur', state = 'QC',
  zip_code = 'G0T 1Y0', country = 'Canada',
  url = 'https://www.canopee-lit.com/', phone_number = '+1 418-236-9544',
  property_total_sites = 14, year_site_opened = 2010,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Canopée Lit, 303 chemin de l''Anse-de-Roche, Sacré-Coeur G0T 1Y0. CITQ 627521 / 304764. Bonjour Québec 418 236-9544 (Sage 418-236-9540 stale). Official 4 summer cabins + 4 four-season cabins (Côte Carrée, Petit Plateau, L''Eau Frette + one more) = 8 tree cabins, plus 6 named bubbles (La Bul''Haute, La Boréale, Les Ti Bouleaux, Les Gros Bouleaux, La Reboule, Galileo). Sage Treehouse qty 6 / canopeelit.com / 214 invented or incomplete.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'CAD. Official from $220/night (2-season cabin or 4m bubble) including breakfast, sheets and towels. 4-season from $248 / fjord-view $259; 5m bubble $240; double bubble $248–274. Stored 220 as official lowest from-rate. Do not store Sage 214/237.',
  description = $$Canopée Lit, 303 Chemin de l'Anse-de-Roche, Sacré-Coeur, QC, 24 ha boreal forest near the Saguenay Fjord. Official 8 tree cabins plus 6 perched bubbles.$$,
  activities_raw = 'On-site: 5 km trails, interpretation booklet, pizzeria, e-bike hire, breakfast delivery. Nearby: Tadoussac whales, Sacré-Coeur, Anse-de-Roche marina.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 45 AND property_id = 'd9b2f3cf-60f7-44bc-a76d-c8fe0dbc40be';

UPDATE public.all_sage_data
SET
  site_name = 'Tree Cabin', unit_type = 'Treehouse', quantity_of_units = 8,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = '4-season cabins year-round; summer cabins and bubbles seasonal. This row is official 8 tree cabins. 6 bubbles unpublished. Do not store qty 6.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 8): official 4 summer + 4 four-season perched cabins. Bubbles unpublished.$$,
  amenities_raw = 'Tree cabin; terrace; kitchenette on cabins; private bath/dry toilet; breakfast included.',
  rate_summer_weekday = '220', rate_summer_weekend = '220',
  rate_winter_weekday = '248', rate_winter_weekend = '248',
  rate_spring_weekday = '248', rate_spring_weekend = '248',
  rate_fall_weekday = '248', rate_fall_weekend = '248',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 248, 'weekend', 248),
      'spring', jsonb_build_object('weekday', 248, 'weekend', 248),
      'summer', jsonb_build_object('weekday', 220, 'weekend', 220),
      'fall', jsonb_build_object('weekday', 248, 'weekend', 248),
      'note', 'CAD breakfast. Official 2-season from $220; 4-season from $248. Do not store Sage 214.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 8 tree cabins + 6 unpublished bubbles. From CAD 220 breakfast. Cleared qty 6 / 214 / stale 418-236-9540.'
WHERE id = 45 AND property_id = 'd9b2f3cf-60f7-44bc-a76d-c8fe0dbc40be';

-- ============================================================================
-- Nomad Ridge at The Wilds — official 12 yurts (6 woodland twins named).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Nomad Ridge at The Wilds', slug = 'nomad-ridge-at-the-wilds',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_nomad_ridge_the_wilds_2026_09',
  address = '14000 International Rd', city = 'Cumberland', state = 'OH',
  zip_code = '43732', country = 'United States',
  url = 'https://www.thewilds.org/yurts', phone_number = '+1 740-638-5030',
  property_total_sites = 12, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Nomad Ridge at The Wilds (Columbus Zoo). Adults 21+. Official thewilds.org: 6 smaller woodland / twin-bed yurts plus King and Grand yurts. Cleveland Magazine quoting Wilds VP + Indianapolis Monthly: 12 private yurts total. Complimentary Open-Air Safari, breakfast and dinner. Sage Safari Tent / 336–372 is the wrong SKU and an invented ADR. Cabins and lodge on the same reserve unpublished.',
  rate_basis = 'half_board',
  rate_basis_notes = 'USD. Official stay includes complimentary breakfast and dinner. Booking calendar only; magazine $292–480 / $329–480 ranges are not an official from-rate. Do not store Sage 336/372.',
  description = $$Nomad Ridge at The Wilds, 14000 International Rd, Cumberland, OH. Official adults-only yurt camp on the Columbus Zoo conservation reserve. 12 yurts; meals and safari included.$$,
  activities_raw = 'On-site: Open-Air Safari, Overlook Café, observation deck, zipline/horse tours extra. Nearby: The Wilds pastures, Cumberland.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13124 AND property_id = '41a97ec1-044a-4492-a455-767db81350e3';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 12,
  unit_capacity = '2', unit_bed = 'Twin or King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = '1 May–31 Oct. Official 6 woodland/twin yurts + King + Grand = 12. Do not store Safari Tent.',
  minimum_nights = '1',
  unit_description = $$Yurt (qty 12): official Nomad Ridge yurts (6 woodland twins plus King and Grand). Ensuite, private deck. Not safari tents.$$,
  amenities_raw = 'Yurt; ensuite; climate control; mini-fridge; private deck; half-board dining; safari.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'USD half_board. Calendar only. Do not store Sage 336/372.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 12 yurts at The Wilds. Cleared Safari Tent / invented 336. Cabins and lodge unpublished.'
WHERE id = 13124 AND property_id = '41a97ec1-044a-4492-a455-767db81350e3';

-- ============================================================================
-- Ridgeback Lodge — official Dream Dome from CAD 150/200. Dome count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Ridgeback Lodge', slug = 'ridgeback-lodge',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_ridgeback_lodge_2026_09',
  address = '86 Old Reach Rd', city = 'Kingston', state = 'NB',
  zip_code = 'E5N 1B2', country = 'Canada',
  url = 'https://ridgebacklodge.com/', phone_number = '+1 506-763-2617',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Ridgeback Lodge, 86 Old Reach Road, Kingston Peninsula NB. Adults only, no pets, no TV/phone/internet. Official lodging types: Dream Domes, Sky View Domes, Robin''s Nest cabin, Deer Run deluxe cabin. Exact dome count unpublished (Venue Report 7 domes + 3 cabins is not official). Official Dream Dome from $150 weekday / $200 weekend. Sky View $200/$240. Cabins unpublished on this Dome row. Sage 200/200 flattened weekend invent on both days.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official Dream Dome $150 weekday / $200 weekend. 2-night minimum; check-in Tue/Fri/Sun. Stored 150/200. Do not store Sage flat 200.',
  description = $$Ridgeback Lodge, 86 Old Reach Rd, Kingston, NB. Official adults-only geodesic-dome and log-cabin retreat on the Kingston Peninsula. Dome count unpublished.$$,
  activities_raw = 'On-site: pond, hiking trails, wood-fired hot tubs on selected units. Nearby: Saint John, Kingston Peninsula.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 16 AND property_id = '0e171342-fefb-445b-bd0e-3e54daac9409';

UPDATE public.all_sage_data
SET
  site_name = 'Dream Dome', unit_type = 'Dome', quantity_of_units = NULL,
  unit_capacity = '2', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Dream Domes year-round; Sky View April–November. Dome count unpublished. Robin''s Nest and Deer Run unpublished.',
  minimum_nights = '2',
  unit_description = $$Dome (qty unpublished): official Dream Domes with wood-fired hot tub. Sky View domes and two log cabins unpublished.$$,
  amenities_raw = 'Geodesic dome; ensuite typical; wood-fired hot tub on Dream Domes; no wifi.',
  rate_summer_weekday = '150', rate_summer_weekend = '200',
  rate_winter_weekday = '150', rate_winter_weekend = '200',
  rate_spring_weekday = '150', rate_spring_weekend = '200',
  rate_fall_weekday = '150', rate_fall_weekend = '200',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 150, 'weekend', 200),
      'spring', jsonb_build_object('weekday', 150, 'weekend', 200),
      'summer', jsonb_build_object('weekday', 150, 'weekend', 200),
      'fall', jsonb_build_object('weekday', 150, 'weekend', 200),
      'note', 'CAD room_only. Official Dream Dome $150 weekday / $200 weekend. Do not store Sage flat 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Dream Dome from 150/200. Dome count unpublished. Cleared flat Sage 200.'
WHERE id = 16 AND property_id = '0e171342-fefb-445b-bd0e-3e54daac9409';

-- ============================================================================
-- EuroParcs De Wije Werelt — official holiday park; SKU split unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'EuroParcs De Wije Werelt', slug = 'europarcs-de-wije-werelt',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_europarcs_de_wije_werelt_2026_09',
  address = 'Arnhemseweg 100-102', city = 'Otterlo', state = 'Gelderland',
  zip_code = '6731 BV', country = 'Netherlands',
  url = 'https://www.europarcsdewijewerelt.nl/', phone_number = '+31 88 070 8090',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official EuroParcs De Wije Werelt, Arnhemseweg 100-102, 6731 BV Otterlo, next to Hoge Veluwe. Phone +31 88 070 8090 (Sage +31 318 591 587 stale). Chalets, tiny houses, treehouses, glamping tents and comfort pitches — per-SKU unpublished. Sage Lodge / total 100 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. EuroParcs calendar only. Do not store Sage 150.',
  description = $$EuroParcs De Wije Werelt, Arnhemseweg 100-102, 6731 BV Otterlo. Official Veluwe holiday park beside Hoge Veluwe. Rental and pitch counts unpublished.$$,
  activities_raw = 'On-site: outdoor pool, petting zoo, indoor playground, restaurant De Houtzagerij. Nearby: Hoge Veluwe, Otterlo, Mosselsche Zand.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11083 AND property_id = '7c3875b1-af44-44eb-982c-b03a7557bbda';

UPDATE public.all_sage_data
SET
  site_name = 'Holiday Home', unit_type = 'Lodge', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round park; some units seasonal. Official SKU split unpublished. Do not store total 100.',
  minimum_nights = NULL,
  unit_description = $$Lodge / holiday home (qty unpublished): official EuroParcs mix of chalets, tiny houses, treehouses and glamping tents. Pitches unpublished.$$,
  amenities_raw = 'Holiday home; park pool; playground; restaurant; shop.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. EuroParcs calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as EuroParcs De Wije Werelt. SKU split unpublished. Cleared invented 100 / 150 / stale 0318 phone.'
WHERE id = 11083 AND property_id = '7c3875b1-af44-44eb-982c-b03a7557bbda';

-- ============================================================================
-- Molecaten Park Wijde Blick — official campground; counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Molecaten Park Wijde Blick', slug = 'molecaten-park-wijde-blick',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_molecaten_wijde_blick_2026_09',
  address = 'Lagezoom 23', city = 'Renesse', state = 'Zeeland',
  zip_code = '4325 CP', country = 'Netherlands',
  url = 'https://www.molecaten.com/en/wijde-blick', phone_number = '+31 111 468 888',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Molecaten Park Wijde Blick, Lagezoom 23, 4325 CP Renesse (Sage Lagezoom 15 stale). Phone +31 111 468 888 (Sage +31 111 461414 stale). Comfort / comfortplus pitches, camper pitches, chalets, beach houses, equipped tents — per-SKU unpublished. Sage Safari Tent / total 20 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Molecaten calendar only. Do not store Sage 150.',
  description = $$Molecaten Park Wijde Blick, Lagezoom 23, 4325 CP Renesse, 1.5 km from Zeeland beaches. Official family campground and chalet park. Pitch and rental counts unpublished.$$,
  activities_raw = 'On-site: indoor pool, playgrounds, sheep meadow. Nearby: Renesse beach, bird boulevard, Schouwen-Duiveland.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11094 AND property_id = 'e4e432b7-de6e-444f-a9e6-7df744d4d822';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal Molecaten calendar. Official pitch count unpublished. Equipped tents / chalets unpublished. Do not store Safari Tent / 20.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty unpublished): official comfort / comfortplus / camper pitches. Rentals unpublished.$$,
  amenities_raw = 'Pitch; electricity; indoor pool; playground; shop.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Molecaten calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Lagezoom 23 / +31 111 468 888. Pitch count unpublished. Cleared Safari Tent / 20 / 150.'
WHERE id = 11094 AND property_id = 'e4e432b7-de6e-444f-a9e6-7df744d4d822';

-- ============================================================================
-- Torre Rinalda — official 16 ha beach camp; pitch count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Torre Rinalda Beach Camping & Resort', slug = 'torre-rinalda-beach-camping-resort',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_torre_rinalda_2026_09',
  address = 'Via Simeone D''Antona 1, Località Torre Rinalda', city = 'Lecce', state = 'Apulia',
  zip_code = '73100', country = 'Italy',
  url = 'https://torrerinalda.it/', phone_number = '+39 0832 382161',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Torre Rinalda Beach Camping & Resort, Via Simeone D''Antona 1, 73100 Lecce. 16 hectares, private beach. Phone / WhatsApp +39 0832 382161 (Sage +39 0832 376017 stale). Official mix: Standard/XL/Premium pitches, Rider tents, mobile homes, glamping tents — per-SKU unpublished. AdriaCamps 780 pitches / 40 mobile homes is a directory count — not stored. Sage Safari Tent / total 50 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official 2025 camping listino is period-based; homepage “from €” did not publish a stable from-rate in the pages reviewed. Do not store Sage 150.',
  description = $$Torre Rinalda Beach Camping & Resort, Via Simeone D'Antona 1, Marina di Lecce. Official 16 ha 4-star beach campground. Pitch and rental counts unpublished.$$,
  activities_raw = 'On-site: private beach, pools, animation, restaurants. Nearby: Lecce, Salento coast.',
  activities_hiking = 'No', activities_swimming = 'Yes', activities_wildlife_watching = 'No',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11044 AND property_id = '3ee9727a-d49b-4c99-b8ad-be92f4a550bd';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = '23 May–13 September typical. Official pitch count unpublished (AdriaCamps 780 not stored). Glamping tents and mobile homes unpublished. Do not store Safari Tent / 50.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty unpublished): official Standard / XL / Premium pitches. Rider tents, mobile homes and glamping tents unpublished.$$,
  amenities_raw = 'Pitch; electricity; pools; private beach; wifi; barbecue area.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official period listino; no single from-rate stored. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Via Simeone D''Antona 1 / +39 0832 382161. Pitch count unpublished. Cleared Safari Tent / 50 / 150 / stale 0832 376017.'
WHERE id = 11044 AND property_id = '3ee9727a-d49b-4c99-b8ad-be92f4a550bd';

COMMIT;
