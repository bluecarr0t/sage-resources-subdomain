-- Log House Holidays: 8 lakeside Finnish log cabins, Poole Keynes.
-- Sources: loghouseholidays.co.uk; Hello 2026 from £800 / 4 nights ≈ £200.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Log House Holidays', slug = 'log-house-holidays-poole-keynes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_log_house_holidays_operator_2026_09',
  address = 'Poole Keynes', city = 'Cirencester', state = 'Gloucestershire',
  zip_code = 'GL7 6ED', country = 'United Kingdom',
  lat = 51.6683, lon = -1.9902,
  url = 'https://www.loghouseholidays.co.uk/', phone_number = '+44-1285-770082',
  property_total_sites = 8, year_site_opened = 1980,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Eight hand-built Baltic-pine log cabins on a private 130-acre Cotswold lake reserve. Each has hot tub, fire pit, row boat, private beach. Mayo Landing adds heated pool + wood-fired sauna. Pet friendly. Lumped — do not invent per-cabin SKUs.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Self-cater. Hello 2026 from £800 / 4-night 4-person cabin ≈ £200/night. Visit Gloucester £585/week is stale. +44 1285 770082.',
  description = $$Eight secluded luxury log cabins at Poole Keynes, Cirencester GL7 6ED (51.6683, -1.9902), on a private 130-acre Cotswold lake reserve. Each cabin has a Finnish hot tub, fire pit, log burner, row boat and private beach. Pet friendly. Not a campground.$$,
  activities_raw = 'On-site: lake swimming, rowing, hot tub, fire pit, wildlife (otters, kingfishers). Nearby: Cotswolds pubs, Cirencester.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11261 AND property_id = 'c514a453-77b6-45f5-b8ef-d92816a68865';

UPDATE public.all_sage_data
SET
  site_name = 'Log Cabin', unit_type = 'Cabin', quantity_of_units = 8,
  unit_capacity = '4-11', unit_bed = 'Varies (sleeps 4–11)',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Eight named lakeside cabins lumped (Lake Springs, Keno, Island Lodge, Mayo Landing, etc.). Mayo Landing only has pool + sauna.',
  minimum_nights = '3',
  unit_description = $$Log Cabin (qty 8): Finnish Baltic-pine cabins sleeping 4–11 with full kitchen, log burner, hot tub, fire pit, row boat and private beach. Lumped — do not invent per-name quantities.$$,
  amenities_raw = 'Log cabin; full kitchen; hot tub; fire pit; row boat; Wi-Fi; pet friendly. Mayo Landing: pool + sauna.',
  rate_winter_weekday = '200', rate_winter_weekend = '200',
  rate_spring_weekday = '200', rate_spring_weekend = '200',
  rate_summer_weekday = '200', rate_summer_weekend = '200',
  rate_fall_weekday = '200', rate_fall_weekend = '200',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 200, 'weekend', 200), 'spring', jsonb_build_object('weekday', 200, 'weekend', 200), 'summer', jsonb_build_object('weekday', 200, 'weekend', 200), 'fall', jsonb_build_object('weekday', 200, 'weekend', 200), 'note', 'GBP room_only. From £800 / 4 nights (Hello 2026) ≈ £200/night.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Cabin qty 8 from loghouseholidays.co.uk. rate_basis unknown → room_only. Stub 400 ADR treated as above from-rate.'
WHERE id = 11261 AND property_id = 'c514a453-77b6-45f5-b8ef-d92816a68865';

COMMIT;
