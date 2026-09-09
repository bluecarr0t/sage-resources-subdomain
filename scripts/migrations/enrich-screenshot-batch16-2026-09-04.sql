-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Klahoose Wilderness Resort — official 4 lodge rooms + 3 cedar cabins = 7.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Klahoose Wilderness Resort', slug = 'klahoose-wilderness-resort',
  property_type = 'Ranch & Lodge', source = 'Sage',
  discovery_source = 'web_research_klahoose_wilderness_resort_2026_09',
  address = 'Thee chum mi yich (Homfray Channel)', city = 'Desolation Sound', state = 'BC',
  zip_code = NULL, country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.klahooseresort.com/', phone_number = '1-833-443-3838',
  property_total_sites = 7, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Klahoose Wilderness Resort, 100% Klahoose First Nation (Qathen Xwegus Management). Homfray Channel / Desolation Sound, boat or seaplane only. Homepage + rooms page: 4 lodge rooms + 3 oceanfront cedar cabins = 7. FAQ: average 14 guests double occupancy. Toll-free 1-833-443-3838, info@klahooseresort.com. Sage Cabin qty 4 / +1 604-483-3000 / 2634 stale. No operator GPS published.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'CAD per person, double occupancy, 3/4/7-night packages (plus conservation fee, service fee, taxes). Official 2026 Discover Klahoose from $3,529 pp (May 7–Aug 19). Grizzly Bears of Toba Inlet from $4,249 pp (Aug 20–Oct 21). Rooms and cabins same package price. Not a nightly ADR. Do not store Sage 2634/2916 or invent a daily split.',
  description = $$Klahoose Wilderness Resort, Thee chum mi yich (Homfray Channel), Desolation Sound, BC. Official Indigenous-owned all-inclusive wilderness lodge: 4 lodge rooms and 3 cedar cabins. Boat transfer from Lund. No operator pin published.$$,
  activities_raw = 'On-site: dining, great-room lounge, wood-fired sauna, dock kayak/SUP, rainforest trails, campfire. Included packages: wildlife boat tour, Ahpokum village tour, Indigenous cultural sharing; Aug–Oct grizzly viewing in Toba Inlet. Nearby: Lund, Powell River, Desolation Sound.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'No',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11466 AND property_id = '10e9a720-2bae-4adc-b235-c7e4a113a0d9';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = 3,
  unit_capacity = '4-5', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'May–October. This row is official 3 cedar cabins (Cabin 1 and 2 sleep 5; Cabin 3 sleeps 4). 4 lodge rooms unpublished. Do not store Cabin qty 4.',
  minimum_nights = '3',
  unit_description = $$Cabin (qty 3): official oceanfront cedar cabins with ensuite, loft queens, living-area pull-out and large balcony. Lodge rooms unpublished.$$,
  amenities_raw = 'Cedar cabin; ensuite shower; Nespresso; mini-fridge; ocean balcony; shared lodge dining and wood-fired sauna.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD all_inclusive package. Official Discover from $3,529 pp; Grizzly from $4,249 pp. Not a nightly ADR. Do not store Sage 2634.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Ranch & Lodge, not glamping. Official 7 keys. This row is Cabin qty 3. Lodge rooms unpublished. Cleared invented 4 / 2634 / stale 604 phone / unpublished GPS.'
WHERE id = 11466 AND property_id = '10e9a720-2bae-4adc-b235-c7e4a113a0d9';

-- ============================================================================
-- Arbor Camp — official 11 dwellings: 9 treehouses + 2 cabins.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Arbor Camp', slug = 'arbor-camp',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_arbor_camp_2026_09',
  address = '30 Old Mill Road', city = 'Ellsworth', state = 'ME',
  zip_code = '04605', country = 'United States',
  lat = NULL, lon = NULL,
  url = 'https://arborcamp.com/', phone_number = NULL,
  property_total_sites = 11, year_site_opened = 2025,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Arbor Camp (Arbor House Properties / Tim Stone, Matt Krivonen, Scott Bradshaw), 30 acres on the Union River, Ellsworth. Homepage: 11 unique dwellings. book.arborcamp.com named SKUs: Poplar, Alder, Ash, Elm, Cedar, Beech, Birch, Chestnut, Spruce treehouses + Cherry and Willow cabins = 9 + 2. Ellsworth planning / MaineBiz parcel 30 Old Mill Road (off Bangor Road). booking@arborcamp.com. LinkedIn 207-815-6044 unpublished on arborcamp.com. Press “16 units” is a future build-out — not stored. Sage 336/372 and 1168/1293 invented. Sage 44.4937 / -68.4466 not an operator pin.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Dynamic book.arborcamp.com calendar. OTA snapshots (Willow ~$302, Cherry ~$435) are not an official from-rate. Do not store Sage 336/372 or 1168/1293.',
  description = $$Arbor Camp, 30 Old Mill Road, Ellsworth ME 04605. Official 11 dwellings on 30 acres along the Union River, north of Acadia: 9 treehouses and 2 riverside cabins. No operator pin published.$$,
  activities_raw = 'On-site: Union River frontage, hand-cut walking trails, private hot tubs, hammocks, fire pits. Nearby: downtown Ellsworth, Acadia National Park ~30 minutes.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE property_id = '24156d8a-6400-4bb9-a71a-2ebd00e14432'
  AND id IN (12957, 12958);

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 9,
  unit_capacity = '2-8', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is official 9 named treehouses (Poplar, Alder, Ash, Elm, Cedar, Beech, Birch, Chestnut, Spruce). Future 16-unit build-out unpublished.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 9): official named treehouses with kitchen, tiled shower, wood stove and private hot tub. Capacities 2–8. Cabins unpublished on this row.$$,
  amenities_raw = 'Treehouse; ensuite; kitchen; wood stove; private hot tub; Union River / forest setting.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'USD room_only. Calendar only. Do not store Sage 336/372.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 11 dwellings. This row is Treehouse qty 9. Cleared invented 336 and unpublished GPS.'
WHERE id = 12957 AND property_id = '24156d8a-6400-4bb9-a71a-2ebd00e14432';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = 2,
  unit_capacity = '4-6', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is official Cherry (sleeps 6) and Willow (sleeps 4) riverside cabins. Do not invent a 3rd cabin.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty 2): official Cherry and Willow riverside cabins with kitchen, wood stove and private hot tub. Treehouses unpublished on this row.$$,
  amenities_raw = 'Riverside cabin; ensuite; kitchen; wood stove; private hot tub.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'USD room_only. Calendar only. Do not store Sage 1168/1293.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 2 cabins (Cherry + Willow). Cleared invented 1168.'
WHERE id = 12958 AND property_id = '24156d8a-6400-4bb9-a71a-2ebd00e14432';

COMMIT;
