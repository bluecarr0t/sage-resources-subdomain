-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Hedgerow Luxury Glamping — relocate Axminster stub to official Ribble Valley.
-- Official 7 named pods.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Hedgerow Luxury Glamping', slug = 'hedgerow-luxury-glamping',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_hedgerow_luxury_glamping_2026_09',
  address = 'Knott Lane, Newsholme', city = 'Clitheroe', state = 'Lancashire',
  zip_code = 'BB7 4JF', country = 'United Kingdom',
  lat = NULL, lon = NULL,
  url = 'https://hedgerowluxuryglamping.com/', phone_number = '+44 7828 311422',
  property_total_sites = 7, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'No',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Hedgerow Luxury Glamping, Knott Lane, Newsholme, Clitheroe, Lancs BB7 4JF. Adults-only Ribble Valley pods. Phone 07828 311 422. Official 7 named pods: Bramble, Bluebell, Foxglove, Willow, Daisy, Buttercup, Dandelion. Sage Axminster / EX13 7TU / +44 1297 678402 / hedgerowluxuryglamping.co.uk / Safari Tent total 5 / 200 was the wrong county. Do not merge Lower Keats Glamping (Tytherleigh / Axminster, 6 safari lodges). Official GPS unpublished.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official from-rates are 2/3/4/7-night packages by named pod (cold-season 2-night from £260 Buttercup & Dandelion). Thursday 1-night special £175–215 is not a general ADR. Do not store Sage 200 or invent a nightly split.',
  description = $$Hedgerow Luxury Glamping, Knott Lane, Newsholme, Clitheroe, Lancashire BB7 4JF. Official adults-only Ribble Valley pod retreat. Relocated from invented Axminster pin. 7 named pods.$$,
  activities_raw = 'On-site: private hot tub / sauna by pod, Highland cattle views. Nearby: Ribble Valley, Clitheroe.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11278 AND property_id = '48cdf45b-73ae-481b-b1e1-54e9e2a07a6f';

UPDATE public.all_sage_data
SET
  site_name = 'Pod', unit_type = 'Cabin', quantity_of_units = 7,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Official 7 named pods. Check-in Mon/Thu/Fri. Do not store Safari Tent / 5.',
  minimum_nights = '2',
  unit_description = $$Cabin / Pod (qty 7): official Bramble, Bluebell, Foxglove, Willow, Daisy, Buttercup, Dandelion. Adults only.$$,
  amenities_raw = 'Luxury pod; ensuite; hot tub and/or sauna by unit; kitchenette.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. Official 2-night from £260 (Buttercup & Dandelion, cold season). Not a nightly ADR. Do not store Sage 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published and relocated from Axminster to Newsholme / Clitheroe. Official 7 pods. Cleared Safari Tent / 5 / 200 / Devon GPS / 01297 phone.'
WHERE id = 11278 AND property_id = '48cdf45b-73ae-481b-b1e1-54e9e2a07a6f';

-- ============================================================================
-- Camping Arolla — temporary 2026 pitches after July 2025 hazard closure.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Arolla', slug = 'camping-arolla',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_arolla_2026_09',
  address = 'Route de Tsallion 1', city = 'Arolla', state = 'Valais',
  zip_code = '1986', country = 'Switzerland',
  lat = NULL, lon = NULL,
  url = 'https://www.camping-arolla.ch/', phone_number = NULL,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Camping Arolla. Original Route de Tsallion 8 permanently closed 13 July 2025 for natural-hazard risk. Temporary 2026 field next to Hotel-Restaurant Aiguille de la Tza, Route de Tsallion 1, 19 Jun–13 Sep 2026: about fifteen motorhomes plus unspecified tents. No electricity, no reservations. Showers at the hotel CHF 8. info@camping-arolla.ch. Sage camping-arolla.com / Yurt / 130–150 / +41 27 283 15 44 invented or stale. Alpina''tent rental pages are from the closed site — not stored. Official GPS unpublished.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. Official temporary-site from-rate CHF 15 per tent / CHF 20 per vehicle per night, plus tourist tax CHF 1.10 adult / 0.55 child. Stored 15 as official tent from-rate. Do not store Sage 130/150.',
  description = $$Camping Arolla, temporary 2026 pitch field at Route de Tsallion 1, 1986 Arolla. Original Tsallion 8 site closed July 2025. About 15 motorhomes plus tents; exact totals unpublished. Not yurt glamping.$$,
  activities_raw = 'Nearby: Arolla hiking, Aiguille de la Tza hotel. On-site: toilets, dishwashing, fresh water only.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11211 AND property_id = '9066c522-90ef-4352-a9a5-bccdaa07d751';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'No', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = '19 Jun–13 Sep 2026 (weather-dependent). Official “about fifteen” motorhomes plus tents — exact qty unpublished. Do not store Yurt. Alpina''tent rentals unpublished / likely closed-site.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty unpublished): official temporary van / tent field. About 15 motorhomes plus unspecified tents. Not yurts.$$,
  amenities_raw = 'Pitch; toilets; dishwashing; fresh water; hotel showers extra. No electricity.',
  rate_summer_weekday = '15', rate_summer_weekend = '15',
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'summer', jsonb_build_object('weekday', 15, 'weekend', 15),
      'note', 'CHF room_only. Official tent CHF 15 / vehicle CHF 20 plus tourist tax. Do not store Sage 130/150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as rustic campground, not glamping. Temporary Tsallion 1 field after July 2025 closure. Pitch qty unpublished. Official tent from CHF 15. Cleared Yurt / 130 / stale .com URL / unpublished GPS.'
WHERE id = 11211 AND property_id = '9066c522-90ef-4352-a9a5-bccdaa07d751';

-- ============================================================================
-- Saskatchewan Landing Provincial Park — official camping; no park cabins.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Saskatchewan Landing Provincial Park', slug = 'saskatchewan-landing-provincial-park',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_saskatchewan_landing_pp_2026_09',
  address = NULL, city = 'Swift Current', state = 'SK',
  zip_code = NULL, country = 'Canada',
  url = 'https://parks.saskatchewan.ca/saskatchewan-landing-provincial-park/',
  phone_number = '+1 306-375-5525',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'other_public',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Saskatchewan Landing Provincial Park on Lake Diefenbaker. Sask Parks camping only — management plan: no park-operated cabins/yurts (private RFPs failed). Pitch totals conflict (management plan 313 regular + 79 group/equestrian; 2022 tourism 380; Wikipedia ~300 across Bearpaw 170 / Sagebrush 54 / Riverside 40 / Nighthawk 28) — unpublished. Sage Cabin qty 12 / 100 invented. Do not merge already-published Glamping Resorts Ltd - Sask Landing (id 10751, private canvas cabins). Reservations saskparks.com / 1-800-205-7070.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Sask Parks reservation calendar only. Do not store Sage 100/110 as cabin ADR.',
  description = $$Saskatchewan Landing Provincial Park, Lake Diefenbaker west of Swift Current. Official Sask Parks campground with four main loops plus group/equestrian camping. No park-operated cabins. Pitch count unpublished (313 vs ~300 vs 380).$$,
  activities_raw = 'On-site: beach, boat launch, marina, golf, hiking, Goodwin House visitor centre. Nearby: Swift Current, Lake Diefenbaker.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11443 AND property_id = 'f87309ec-47ee-4840-83a0-a3dadcd61ce8';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Mid-May–September typical. Official pitch count unpublished (313 vs ~300 vs 380). Do not store Cabin / 12. Private Glamping Resorts canvas cabins are a different already-published operator.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty unpublished): official Sask Parks campsites in Bearpaw, Sagebrush, Riverside, Nighthawk plus group/equestrian. Not cabins.$$,
  amenities_raw = 'Electric sites typical; showers; laundry; dump station; store; beach.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Sask Parks calendar. Do not store Sage 100/110.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as public campground, not glamping. Pitch count unpublished. Cleared invented Cabin 12 / 100. Do not merge Glamping Resorts Ltd - Sask Landing (id 10751).'
WHERE id = 11443 AND property_id = 'f87309ec-47ee-4840-83a0-a3dadcd61ce8';

-- ============================================================================
-- Northshore Resort — lot / seasonal RV community, not 12 overnight cabins.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Northshore Resort on Buffalo Pound Lake', slug = 'northshore-resort-on-buffalo-pound-lake',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_northshore_buffalo_pound_2026_09',
  address = NULL, city = 'Moose Jaw', state = 'SK',
  zip_code = 'S6H 7K7', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://buffalopoundnorthshoreresorts.ca/', phone_number = '+1 306-529-8957',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Buffalo Pound Northshore Resorts: 64 lakefront cabin lots for sale and over 150 RV sites for sale/lease on ~600 acres, ~30 minutes north of Moose Jaw. Not an overnight 12-cabin lodge. Sage Cabin qty 12 / 178 / +1 306-692-6352 / northshoreresort.ca was Glamping Resorts inventory mis-attributed. Overnight domes/tents on this land are already published as Glamping Resorts Ltd - Buffalo Pound Lake (id 10744). Do not merge. Official “over 150” RV sites unpublished as an exact count. Official GPS unpublished. Sage 50.5714 / -105.4172 cleared.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Operator sells/leases lots; no official overnight cabin from-rate. Do not store Sage 178/197.',
  description = $$Northshore Resort on Buffalo Pound Lake, north of Moose Jaw. Official titled lakefront lots (64) and seasonal RV community (over 150 sites). Not a 12-cabin overnight glamping resort.$$,
  activities_raw = 'On-site: private beach, boat launch, marina, valley trails. Nearby: Moose Jaw, Buffalo Pound Provincial Park.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11442 AND property_id = 'f4c837a6-af5a-4dfe-acb4-7d616f4e37cd';

UPDATE public.all_sage_data
SET
  site_name = 'RV Site', unit_type = 'Campsite', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal. Official 64 lakefront lots + over 150 RV sites (exact RV count unpublished). Do not store Cabin / 12. Glamping Resorts overnight units unpublished on this row.',
  minimum_nights = NULL,
  unit_description = $$RV Site (qty unpublished): official seasonal / titled RV community. Not overnight cabins.$$,
  amenities_raw = 'RV / lot community; beach; boat launch; marina.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD. Lot sale / seasonal lease. No overnight cabin ADR. Do not store Sage 178.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as RV/lot community, not glamping. Cleared Cabin 12 / 178 / stale 306-692-6352 / unpublished GPS. Do not merge Glamping Resorts Ltd (id 10744).'
WHERE id = 11442 AND property_id = 'f4c837a6-af5a-4dfe-acb4-7d616f4e37cd';

COMMIT;
