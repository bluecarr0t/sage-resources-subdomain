-- TCS Camping Sempach (314 pitches + 21 unpublished-split rentals) and
-- TCS Camping Sion (333 pitches + 37 unpublished-split rentals).
-- Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- TCS Camping Sempach — official 314 pitches. Rental SKU split unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'TCS Camping Sempach', slug = 'tcs-camping-sempach',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_tcs_camping_sempach_2026_09',
  address = 'Seelandstrasse 6', city = 'Sempach', state = 'Lucerne',
  zip_code = '6204', country = 'Switzerland',
  lat = 47.1242, lon = 8.1881,
  url = 'https://camping.tcs.ch/en/campsites/tcs-camping-sempach/',
  phone_number = '+41-41-460-14-66',
  property_total_sites = 314, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official TCS: 314 pitches + 21 rental accommodations (bungalow / pod / safari tent — per-SKU unpublished, not stored). Lake Sempach shore. Sage Eichweid 1 and +41 41 460 46 64 were stale. Official Seelandstrasse 6, +41 41 460 14 66, GPS 47°7''27"N 8°11''17"E. Luzern.com 180 seasonal + 240 tourist + named bungalow/pod/tipi counts are tourism copy — not stored against official 314/21.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. TCS calendar only; prices subject to change without taxes. Do not store Sage 210/240 as pitch ADR.',
  description = $$TCS Camping Sempach, Seelandstrasse 6, 6204 Sempach (47.1242, 8.1881), on Lake Sempach. Official 314 pitches plus 21 unpublished-split rentals. Not Eichweid 1.$$,
  activities_raw = 'On-site: lake beach, volleyball, pedal boats, playground, restaurant/bar. Nearby: Sempach, Lucerne.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11209 AND property_id = '42157fc0-2ea4-42dc-8cba-26590214fe08';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 314,
  unit_capacity = '5', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal TCS calendar. Official 314 pitches lumped. 21 rentals unpublished split — not stored. Do not invent Safari Tent qty.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 314): official TCS pitches for tent / caravan / motorhome. 21 rental units unpublished. Do not store Sage Safari Tent.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; wifi; lake access; playground; restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CHF room_only. TCS calendar. Do not store Sage 210/240.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 314 pitches at Seelandstrasse 6. This row is Tourist Pitch / Campsite qty 314. 21 rentals unpublished. Cleared invented Safari Tent / 210.'
WHERE id = 11209 AND property_id = '42157fc0-2ea4-42dc-8cba-26590214fe08';

-- ============================================================================
-- TCS Camping Sion — official 333 pitches + 37 unpublished-split rentals.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'TCS Camping Sion', slug = 'tcs-camping-sion',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_tcs_camping_sion_2026_09',
  address = 'Chemin du Camping 6', city = 'Sion', state = 'Valais',
  zip_code = '1950', country = 'Switzerland',
  lat = 46.2114, lon = 7.3136,
  url = 'https://camping.tcs.ch/en/campsites/tcs-camping-sion/',
  phone_number = '+41-27-346-43-47',
  property_total_sites = 333, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official TCS: 333 pitches + 37 rental accommodations (cabane, Airlodge, safari tents, POD, tipi, bungalow, chalet — per-SKU unpublished, not stored). Natural swimming lake. Sage Route des Iles / +41 58 958 27 77 (TCS central) stale. Official Chemin du Camping 6, +41 27 346 43 47, GPS 46°12''41"N 7°18''49"E. Restaurant Le Pic Vert.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. TCS calendar only; prices subject to change without taxes. Do not store Sage 140/160 as pitch ADR.',
  description = $$TCS Camping Sion, Chemin du Camping 6, 1950 Sion (46.2114, 7.3136). Official 333 pitches plus 37 unpublished-split rentals and a natural swimming lake. Not Route des Iles.$$,
  activities_raw = 'On-site: natural lake, playground, restaurant, surf-camp tents. Nearby: Sion, Alaïa Bay, Valais valleys.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11214 AND property_id = '501b549c-ed3b-4e6e-85ea-4c92febcb3bc';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 333,
  unit_capacity = '5', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal TCS calendar (winter service reduced). Official 333 pitches lumped (standard / premium / tent meadow / private camp). 37 rentals unpublished split — not stored.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 333): official TCS pitches. 37 rental units unpublished. Do not store Sage Safari Tent.$$,
  amenities_raw = 'Pitch; 4A typical; shared sanitary; wifi; natural lake; playground; restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CHF room_only. TCS calendar. Do not store Sage 140/160.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 333 pitches at Chemin du Camping 6. This row is Tourist Pitch / Campsite qty 333. 37 rentals unpublished. Cleared invented Safari Tent / 140.'
WHERE id = 11214 AND property_id = '501b549c-ed3b-4e6e-85ea-4c92febcb3bc';

COMMIT;
