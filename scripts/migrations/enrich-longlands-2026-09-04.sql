-- ============================================================================
-- Longlands Devon (Coulsworthy, Combe Martin): publish 5 Safari Lodge
-- Treehouses + Lakeview Farmhouse. Exclusive-use estate; units also book
-- separately. Not Safari Tent qty 5 only.
--
-- Sources (retrieved 2026-09-04):
--   https://longlandsdevon.co.uk/ (+ corporate-retreats-devon)
--   Coolplaces: Longlands Farm, Coulsworthy, EX34 0PD
--   EX34 0PD 51.186965, -3.975794
--
-- Operating inventory:
--   Safari Lodge Treehouse qty 5 — sleep 6 each (30)
--   Lakeview Farmhouse qty 1 — sleep 20
--   property_total_sites = 6 (5+1). 21 bedrooms / 50 guests exclusive use.
--
-- Rates GBP, room_only (self-catering). Corporate: lodge from £500+VAT /
--   2 nights ≈ £300/night inc VAT; farmhouse from £2,500+VAT / 2 nights
--   ≈ £1,500/night inc VAT.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Longlands',
  slug = 'longlands-combe-martin-devon',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_longlands_devon_operator_2026_09',
  address = 'Longlands Farm, Coulsworthy',
  city = 'Combe Martin',
  state = 'Devon',
  zip_code = 'EX34 0PD',
  country = 'United Kingdom',
  lat = 51.186965,
  lon = -3.975794,
  url = 'https://longlandsdevon.co.uk/',
  phone_number = '+44-1271-882004',
  property_total_sites = 6,
  year_site_opened = 2013,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'Yes',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Private 18-acre North Devon valley. Exclusive-use estate (up to 50) or book farmhouse / five Safari Lodge Treehouses separately. Self-catering; Long Barn not yet bookable. Small dogs ≤10kg by arrangement.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP inc VAT. Self-catering; private chefs extra. Lodge from £500+VAT / 2-night midweek ≈ £300/night inc VAT. Farmhouse from £2,500+VAT / 2 nights ≈ £1,500/night. Exclusive-use typically £3,000–£4,000/night for the whole estate — not stored as unit ADR. info@longlandsdevon.co.uk / +44 1271 882004.',
  description = $$Private estate at Longlands Farm, Coulsworthy, Combe Martin, Devon EX34 0PD (51.186965, -3.975794), in the North Devon Coast National Landscape near Exmoor. Five Safari Lodge Treehouses (sleep 30) plus Lakeview Farmhouse (sleep 20) — 21 bedrooms / up to 50 on exclusive use. Spring-fed lake, hot tub, firepit. Self-catering. Not a public campground.$$,
  activities_raw = 'On-site: wild swimming, rowboat, hot tub, firepit/BBQ, woodland walks, stargazing (dark sky), games field. Nearby: Combe Martin, Woolacombe, Exmoor.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11274
  AND property_id = 'c4d0437c-787d-4563-bdd4-f037d29d3c79';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Lodge Treehouse',
  unit_type = 'Treehouse',
  quantity_of_units = 5,
  unit_capacity = '6',
  unit_bed = 'Sleeps 6',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Five identical Safari Lodge Treehouses; also bookable as exclusive-use with the farmhouse. Quiet hours 10pm–8am. One small dog ≤10kg per lodge by arrangement.',
  minimum_nights = '2',
  unit_description = $$Safari Lodge Treehouse (qty 5): Furnished safari-lodge treehouses sleeping 6 with full kitchen, wood stove, shower room + ensuite, private deck. Shared estate hot tub / lake. Operator from ~£300/night inc VAT (£500+VAT / 2-night midweek). Do not invent a 6th lodge. Long Barn is not bookable.$$,
  amenities_raw = 'Safari lodge treehouse; full kitchen; wood stove; ensuite + shower room; deck; linen. Small dog by arrangement. Estate hot tub and lake.',
  rate_winter_weekday = '300',
  rate_winter_weekend = '300',
  rate_spring_weekday = '300',
  rate_spring_weekend = '300',
  rate_summer_weekday = '300',
  rate_summer_weekend = '300',
  rate_fall_weekday = '300',
  rate_fall_weekend = '300',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 300, 'weekend', 300),
      'spring', jsonb_build_object('weekday', 300, 'weekend', 300),
      'summer', jsonb_build_object('weekday', 300, 'weekend', 300),
      'fall', jsonb_build_object('weekday', 300, 'weekend', 300),
      'note', 'GBP inc VAT room_only. From £500+VAT / 2-night midweek lodge (longlandsdevon.co.uk/corporate-retreats-devon). Exclusive-use estate £3k–£4k/night not stored as unit ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent qty 5 stub. Unit type → Treehouse (operator Safari Lodge Treehouses). Farmhouse split out. total 6.'
WHERE id = 11274
  AND property_id = 'c4d0437c-787d-4563-bdd4-f037d29d3c79';

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
  operating_season_months, minimum_nights,
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
  'published', 'Yes', 'Yes', 'Sage', 'Longlands', v.site_name,
  'web_research_longlands_devon_operator_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  6, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', 'No', 'Yes',
  'No', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'Yes', 'No',
  'No', 'Yes', 'Yes', 'No',
  2013::numeric, NULL::smallint, NULL::smallint,
  v.season, '2',
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
  '1500', '1500', '1500', '1500', '1500', '1500', '1500', '1500',
  jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 1500, 'weekend', 1500), 'spring', jsonb_build_object('weekday', 1500, 'weekend', 1500), 'summer', jsonb_build_object('weekday', 1500, 'weekend', 1500), 'fall', jsonb_build_object('weekday', 1500, 'weekend', 1500), 'note', 'GBP inc VAT room_only. From £2,500+VAT / 2-night midweek farmhouse. Exclusive-use estate rate is not this row.')),
  g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Lakeview Farmhouse', 1::numeric, 'Cabin', '20', 'Multiple (sleeps 20)',
      'Year-round. One farmhouse; heart of exclusive-use stays. One small dog ≤10kg by arrangement.',
      $$Lakeview Farmhouse (qty 1): Self-catering farmhouse sleeping 20. Bookable alone or with the five lodges for exclusive use (50 guests). Do not invent a second farmhouse. Long Barn is not bookable.$$,
      'Farmhouse; full kitchen; bedrooms for 20; estate hot tub and lake. Small dog by arrangement.',
      E'[2026-09-04] Added Lakeview Farmhouse qty 1 from longlandsdevon.co.uk.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed, season, unit_desc, amenities, note
)
WHERE g.id = 11274
  AND g.property_id = 'c4d0437c-787d-4563-bdd4-f037d29d3c79'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'c4d0437c-787d-4563-bdd4-f037d29d3c79'
      AND x.site_name = v.site_name
  );

COMMIT;
