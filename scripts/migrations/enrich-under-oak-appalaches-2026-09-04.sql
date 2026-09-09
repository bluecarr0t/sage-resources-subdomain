-- Under the Oak (5 named units; this row is 2 safari tents) and
-- Appalaches Domes & Spa / Old Church Cottages (3 official CAD 300 domes).
-- Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Under the Oak Glamping — official 5: 1 lodge + 2 safari + 2 wagons.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Under the Oak Glamping', slug = 'under-the-oak-glamping',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_under_the_oak_glamping_2026_09',
  address = 'The Barn, Pen y Waun Farm, Mountain Road', city = 'Bedwas',
  state = 'Caerphilly', zip_code = 'CF83 8ER', country = 'United Kingdom',
  lat = NULL, lon = NULL,
  url = 'https://www.undertheoakglamping.co.uk/', phone_number = '+44-7886-477930',
  property_total_sites = 5, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official five named units at Pen y Waun Farm, Mountain Road, Bedwas CF83 8ER: Dan y Dderwen lodge (5 adults + 1 child, year-round; 2025 rebuild of the original safari tent), safari tents Y Ddraenen Wen (4+1) and Dan y Ffawydden (6), railway wagons Cynefin and Cartref (2 each). Every unit has wood-fired hot tub, fire pit, ensuite, kitchen, wood burner. Pets welcome. Min 2 nights. Sage Gelli Farm / CF83 8HT / +44 7775 661608 / qty 3 were stale. No operator GPS published. undertheoakglamping@gmail.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official booking calendar only; homepage says prices are not binding. Coolstays from-rates are a listing partner — not stored. Do not store Sage 150.',
  description = $$Under the Oak Glamping, The Barn, Pen y Waun Farm, Mountain Road, Bedwas, Caerphilly CF83 8ER. Official five units around a farm pond: one lodge, two safari tents, two railway wagons. No operator pin published.$$,
  activities_raw = 'On-site: private hot tubs, fire pits, pond, dark skies, red kites. Nearby: Cardiff, Bannau Brycheiniog, Abergavenny.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11266 AND property_id = '7c3e8c46-d7f2-40df-87d2-c0f90ff22610';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = 2,
  unit_capacity = '4-6', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical for canvas; lodge year-round. This row is the 2 safari tents only. Lodge + 2 railway wagons unpublished on this row. Do not invent a 3rd tent.',
  minimum_nights = '2',
  unit_description = $$Safari Tent (qty 2): Y Ddraenen Wen (4 adults + 1 child, pond-side) and Dan y Ffawydden (sleeps 6). Ensuite, kitchen, wood burner, private hot tub. Lodge and wagons unpublished here.$$,
  amenities_raw = 'Safari tent; ensuite; kitchen; wood burner; private wood-fired hot tub; fire pit; bedding and towels.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. Calendar only. Do not store Sage 150 or Coolstays from-rates.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 5 units at Pen y Waun Farm. This row is Safari Tent qty 2. Lodge + 2 wagons unpublished. Rates unpublished.'
WHERE id = 11266 AND property_id = '7c3e8c46-d7f2-40df-87d2-c0f90ff22610';

-- ============================================================================
-- Appalaches Domes & Spa — Old Church Cottages, 3 official CAD 300 domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Appalaches Domes & Spa', slug = 'appalaches-domes-spa',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_appalaches_domes_spa_2026_09',
  address = '62 Islandview Drive', city = 'Flatlands', state = 'NB',
  zip_code = 'E3N 4X2', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.oldchurchcottages.com/', phone_number = '+1-506-329-5444',
  property_total_sites = 3, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Old Church Cottages adults-only Flatlands domes (Dome 4, 5, 6). Official CAD 300 + tax each, max 2 adults, no exceptions. Insulated four-season: ensuite, kitchen, queen, heat pump, pellet stove, private fenced yard and hot tub. Do not add Island View Cottage, Jones Brook Cottage, or Brézé — those are separate Old Church products. No operator GPS published. 506-329-5444.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official Dome 4 / 5 / 6 = $300/night + tax. Full payment at booking; $500 security pre-auth. Adults only (children 15+ only at cottages, not these domes).',
  description = $$Appalaches Domes & Spa, 62 Islandview Drive, Flatlands NB E3N 4X2. Three official adults-only glamping domes from Old Church Cottages. Church cottages and Island View are separate. No operator pin published.$$,
  activities_raw = 'On-site: private hot tub, BBQ, patio. Nearby: Restigouche River, Sugarloaf Provincial Park, kayaking.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13044 AND property_id = '6860ca12-a1c7-4d5b-8125-cb086c97f5b0';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '2', unit_bed = 'Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Official Dome 4, 5, 6 only. Do not invent a 4th dome or add cottages.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 3): official Dome 4, 5, 6. Queen, ensuite, kitchen, private hot tub. Max 2 adults. Do not add cottages.$$,
  amenities_raw = 'Insulated geodome; ensuite; kitchen; heat pump; pellet stove; private hot tub and fenced yard; BBQ.',
  rate_summer_weekday = '300', rate_summer_weekend = '300',
  rate_winter_weekday = '300', rate_winter_weekend = '300',
  rate_spring_weekday = '300', rate_spring_weekend = '300',
  rate_fall_weekday = '300', rate_fall_weekend = '300',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 300, 'weekend', 300),
      'spring', jsonb_build_object('weekday', 300, 'weekend', 300),
      'summer', jsonb_build_object('weekday', 300, 'weekend', 300),
      'fall', jsonb_build_object('weekday', 300, 'weekend', 300),
      'note', 'CAD room_only. Official $300 + tax per dome. Cottages not on this row.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Old Church Cottages Flatlands. This row is Dome qty 3 at CAD 300. Cottages unpublished.'
WHERE id = 13044 AND property_id = '6860ca12-a1c7-4d5b-8125-cb086c97f5b0';

COMMIT;
