-- ============================================================================
-- West Lexham (West Lexham Manor, Norfolk): publish treehouses, bell tents
-- and cabins. Do not invent Barn / Village Hall Cottage quantities.
--
-- Sources (retrieved 2026-09-04):
--   https://www.westlexham.org/ (+ /stay/tree-houses/ /properties/group-glamping/)
--   Coolstays / ToWanderUK: 6 cabins
--   Treehousemap: 52.72035, 0.72889; PE32 2QN
--
-- Operating inventory:
--   Treehouse qty 6 — Tilia, Quercus, Tinker, Sunrise, Ash Temple, Owl Temple
--   Bell Tent qty 7 — Apr–Oct; garden washhouse
--   Cabin qty 6 — 4 ensuite / 2 shared washhouse
--   property_total_sites = 19. Barn + Village Hall Cottages exist for groups
--     but no published unit count — not stored.
--
-- Rates GBP, room_only. From £100/night (love-glamping). Treehouse listings
--   also from £250 — stored 100 as operator-adjacent from-rate.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'West Lexham',
  slug = 'west-lexham-kings-lynn-norfolk',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_west_lexham_operator_2026_09',
  address = 'West Lexham Manor',
  city = 'King''s Lynn',
  state = 'Norfolk',
  zip_code = 'PE32 2QN',
  country = 'United Kingdom',
  lat = 52.72035,
  lon = 0.72889,
  url = 'https://www.westlexham.org/',
  phone_number = '+44-1760-755602',
  property_total_sites = 19,
  year_site_opened = 2010,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'Yes',
  property_hot_tub = 'No',
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
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '21–22 acre biodynamic healing retreat: 6 treehouses, 7 bell tents, 6 cabins, plus Barn and Village Hall gathering cottages (unpublished counts — not stored). Garden Kitchen café. Natural swimming. First UK treehouse-stay operator per westlexham.org.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Self-cater / café extra (Garden Kitchen breakfast, lunch, dinner). From £100/night (love-glamping.co.uk). Some treehouse OTAs from £250 — not stored as weekend ADR. Dogs welcome on treehouses/cabins. Bell tents Apr–Oct. +44 1760 755602.',
  description = $$Countryside healing retreat at West Lexham Manor, PE32 2QN, Norfolk (52.72035, 0.72889). 19 published glamping units across 6 treehouses, 7 seasonal bell tents and 6 woodland cabins on ~22 biodynamic acres with lakes, a natural pool and the Garden Kitchen café. Barn and Village Hall cottages are group spaces without a published unit count. Not 20 treehouses.$$,
  activities_raw = 'On-site: woodland walks, wild / natural swimming, café, yoga and hosted retreats, kitchen garden. Nearby: Swaffham, North Norfolk coast.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'No',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11282
  AND property_id = '6bb2069d-9001-4c73-a963-4acfea5ed39e';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse',
  unit_type = 'Treehouse',
  quantity_of_units = 6,
  unit_capacity = '2-6',
  unit_bed = 'King or twin (varies)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round (Tinker closed Dec–Feb). Six named treehouses: Tilia, Quercus, Tinker, Sunrise, Ash Tree Temple, Owl Tree Temple. Lumped — do not invent per-name quantities.',
  minimum_nights = '2',
  unit_description = $$Treehouse (qty 6): Tilia, Quercus, Tinker, Sunrise, Ash Tree Temple and Owl Tree Temple. Sleep 2–6. Mix of ensuite and garden-washhouse. Dog-friendly. Renewable heat. Do not invent a 7th treehouse.$$,
  amenities_raw = 'Treehouse; linen; log stove / heating; dog-friendly; Garden Kitchen; some ensuite / some washhouse.',
  rate_winter_weekday = '100',
  rate_winter_weekend = '100',
  rate_spring_weekday = '100',
  rate_spring_weekend = '100',
  rate_summer_weekday = '100',
  rate_summer_weekend = '100',
  rate_fall_weekday = '100',
  rate_fall_weekend = '100',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 100, 'weekend', 100),
      'spring', jsonb_build_object('weekday', 100, 'weekend', 100),
      'summer', jsonb_build_object('weekday', 100, 'weekend', 100),
      'fall', jsonb_build_object('weekday', 100, 'weekend', 100),
      'note', 'GBP room_only from-rate £100 (love-glamping). Some treehouse OTAs from £250 — not stored as weekend ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Treehouse qty 20 / total 21 stub. This row is Treehouse qty 6. Bell Tent 7 + Cabin 6 added. Barn/Village Hall unpublished — not stored.'
WHERE id = 11282
  AND property_id = '6bb2069d-9001-4c73-a963-4acfea5ed39e';

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
  'published', 'Yes', 'Yes', 'Sage', 'West Lexham', v.site_name,
  'web_research_west_lexham_operator_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  19, v.qty, v.unit_type, v.capacity, v.bed,
  v.bath, 'Yes', v.kitchenette, 'No',
  'No', 'Yes', v.pets, 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'No', 'Yes', 'No', 'No',
  2010::numeric, v.open_m, v.close_m,
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
  '100', '100', '100', '100', '100', '100', '100', '100',
  jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 100, 'weekend', 100), 'spring', jsonb_build_object('weekday', 100, 'weekend', 100), 'summer', jsonb_build_object('weekday', 100, 'weekend', 100), 'fall', jsonb_build_object('weekday', 100, 'weekend', 100), 'note', 'GBP room_only from-rate £100 (love-glamping).')),
  g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Bell Tent', 7::numeric, 'Bell Tent', '4', '1 Double + day bed',
      'No', 'No', 'Yes', 4::smallint, 10::smallint,
      'April–October. Seven lakeside bell tents; garden washhouse. Extra mattress £50.',
      $$Bell Tent (qty 7): Lakeside / garden bell tents sleeping up to 4 (double + day bed + optional mattress). Shared garden washhouse. Open Apr–Oct only. Do not invent an 8th tent.$$,
      'Bell tent; fairy lights; washhouse; linen. Seasonal.',
      E'[2026-09-04] Added Bell Tent qty 7 from westlexham.org/properties/group-glamping/.'
    ),
    (
      'Cabin', 6::numeric, 'Cabin', '2-3', 'Double (child extra)',
      'Yes', 'Yes', 'Yes', NULL::smallint, NULL::smallint,
      'Year-round. Six woodland cabins; four ensuite, two (Gaggle, Roost) share a washhouse.',
      $$Cabin (qty 6): Bespoke woodland cabins for two adults + one child. Four ensuite; Gaggle and Roost share a garden washhouse. Electricity and heating. Do not invent a 7th cabin or Barn/Village Hall quantities.$$,
      'Cabin; heating; electricity; mix ensuite / washhouse; dog-friendly.',
      E'[2026-09-04] Added Cabin qty 6 from Coolstays / ToWanderUK (operator cabins page).'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  bath, kitchenette, pets, open_m, close_m,
  season, unit_desc, amenities, note
)
WHERE g.id = 11282
  AND g.property_id = '6bb2069d-9001-4c73-a963-4acfea5ed39e'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '6bb2069d-9001-4c73-a963-4acfea5ed39e'
      AND x.site_name = v.site_name
  );

COMMIT;
