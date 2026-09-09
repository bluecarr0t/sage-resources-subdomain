-- ============================================================================
-- Tree Inn (Wolfcenter Dörverden): publish 3 identical treehouses, not 5.
-- Crownview (2012), Highfield (2015), Pineside (2021). Outdoor boutique
-- hotel above wolf enclosures.
--
-- Sources (retrieved 2026-09-04):
--   https://www.tree-inn.de/
--   Wolfcenter: Kasernenstraße 2, 27313 Dörverden-Barme
--   52°49′37.8″N 9°12′47.6″E = 52.8271667, 9.2132222
--   Landkreis Verden: from EUR 490 VIP / 590 main incl. breakfast + park
--
-- Operating inventory:
--   Treehouse qty 3 — lumped (identical fit-out)
--   property_total_sites = 3
--
-- Rates EUR, breakfast.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Tree Inn',
  slug = 'tree-inn-doerverden',
  property_type = 'Outdoor Boutique Hotel',
  source = 'Sage',
  discovery_source = 'web_research_tree_inn_wolfcenter_2026_09',
  address = 'Kasernenstraße 2',
  city = 'Dörverden',
  state = 'Lower Saxony',
  zip_code = '27313',
  country = 'Germany',
  lat = 52.8271667,
  lon = 9.2132222,
  url = 'https://www.tree-inn.de/',
  phone_number = '+49-4234-4999660',
  property_total_sites = 3,
  year_site_opened = 2012,
  property_clubhouse = 'No',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'Yes',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Three luxury treehouses (Crownview 2012, Highfield 2015, Pineside 2021) 5m above Wolfcenter enclosures. Shuttle check-in from the car park. Wolfsrevier restaurant. Pets not allowed (park rule). Phone 04234 4999660 — not the stub 941390.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR. Official Landkreis listing: from 490 VIP / 590 main per night including breakfast and Wolfcenter entry. Campanyon dated samples ~EUR 716 are above the from-rate — not stored as weekend ADR. No pets. +49 4234 4999660.',
  description = $$Baumhaushotel at Kasernenstraße 2, 27313 Dörverden-Barme (52.8271667, 9.2132222), inside the Wolfcenter. Three identically equipped treehouses — Crownview, Highfield, Pineside — each 5m up with a whirlpool, panoramic glass, and a roof terrace overlooking wolves. Opened April 2012. Not five treehouses.$$,
  activities_raw = 'On-site: wolf / alpaca / fox viewing, Wolfcenter playgrounds, Wolfsrevier restaurant, hiking. Nearby: Serengeti Park Hodenhagen, Bremen.',
  activities_hiking = 'Yes',
  activities_swimming = 'No',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'No',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11024
  AND property_id = '0da548b9-08be-4630-9465-72e1fae6db84';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse',
  unit_type = 'Treehouse',
  quantity_of_units = 3,
  unit_capacity = '3-4',
  unit_bed = 'Sleeps 3 adults or 2+2 children',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Three identical houses (Crownview, Highfield, Pineside). Access by stairs / suspension bridge — not ADA. No dogs.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 3): Crownview, Highfield and Pineside — identical luxury treehouses with underfloor heating, A/C, whirlpool, minibar, coffee machine, smart TV, and 30 m² roof terrace. Sleeps 3 adults or 2 adults + 2 children. Breakfast + park entry included in the from-rate. Do not invent a 4th or 5th house.$$,
  amenities_raw = 'Treehouse; whirlpool; A/C; underfloor heat; Wi-Fi; minibar; ensuite; roof terrace; Netflix. No kitchen. No pets. Stairs only.',
  rate_winter_weekday = '490',
  rate_winter_weekend = '590',
  rate_spring_weekday = '490',
  rate_spring_weekend = '590',
  rate_summer_weekday = '490',
  rate_summer_weekend = '590',
  rate_fall_weekday = '490',
  rate_fall_weekend = '590',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 490, 'weekend', 590),
      'spring', jsonb_build_object('weekday', 490, 'weekend', 590),
      'summer', jsonb_build_object('weekday', 490, 'weekend', 590),
      'fall', jsonb_build_object('weekday', 490, 'weekend', 590),
      'note', 'EUR breakfast. Landkreis Verden from 490 VIP / 590 main incl. park + breakfast. Campanyon ~716 is a dated sample — not stored as weekend ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Treehouse qty 5 stub. Corrected to qty 3 (Crownview/Highfield/Pineside). Address Am Wolfcenter 1 → Kasernenstraße 2. Phone → +49 4234 4999660. rate_basis unknown → breakfast. year 2012.'
WHERE id = 11024
  AND property_id = '0da548b9-08be-4630-9465-72e1fae6db84';

COMMIT;
