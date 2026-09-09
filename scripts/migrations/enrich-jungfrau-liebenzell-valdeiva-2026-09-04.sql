-- Three campgrounds mis-stored as safari-tent glamping.

BEGIN;

-- ============================================================================
-- Camping Jungfrau (Sage: Glamping Jungfrau). 216 tourist pitches.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Jungfrau', slug = 'camping-jungfrau-lauterbrunnen',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_jungfrau_2026_09',
  address = 'Weid 406', city = 'Lauterbrunnen', state = 'Bern',
  zip_code = '3822', country = 'Switzerland',
  lat = 46.588032, lon = 7.90925,
  url = 'https://www.campingjungfrau.swiss/', phone_number = '+41-33-856-2010',
  property_total_sites = 216, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Year-round Lauterbrunnen campground (Camping Jungfrau AG). PiNCAMP 216 tourist + 63 permanent pitches + 42 rentals without a published per-SKU split (bungalow, huts, mobile homes, hostel). Not 20 safari tents. Winter: Classic pitches only.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. Operator pitch from CHF 31.60 Basic Tent / 42.80 Classic / 51.75 Comfort / 58.20 Prestige. Cabins from CHF 108.10. Stored tourist-pitch from-rate 31.60. +41 33 856 20 10.',
  description = $$Camping Jungfrau at Weid 406, 3822 Lauterbrunnen (46.588032, 7.90925). 216 tourist pitches (PiNCAMP). Not Glamping Jungfrau and not 20 safari tents. Restaurant Weidstübli. Year-round.$$,
  activities_raw = 'On-site: restaurant, shop, playground. Nearby: Lauterbrunnen valley, Staubbach, Jungfrau railways, Freibad ~800 m.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11223 AND property_id = 'ab890bce-e56e-4dbd-bd9c-e6690b98f853';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 216,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. 216 tourist pitches (PiNCAMP). Basic/Classic/Comfort/Prestige lumped. 63 permanent + 42 rentals unpublished split — not stored. Winter Classic only.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 216): PiNCAMP tourist pitches. Do not invent 20 safari tents or a 42-rental SKU split.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; Weidstübli; shop. Pets yes.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 31.6, 'weekend', 31.6),
      'spring', jsonb_build_object('weekday', 31.6, 'weekend', 31.6),
      'summer', jsonb_build_object('weekday', 31.6, 'weekend', 31.6),
      'fall', jsonb_build_object('weekday', 31.6, 'weekend', 31.6),
      'note', 'CHF room_only. Operator Basic Tent from CHF 31.60. Cleared stub 150 safari ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Glamping Jungfrau / Safari Tent qty 20 stub. This row is Tourist Pitch 216. Type → Campground. is_glamping_property No. Year 1995 cleared.'
WHERE id = 11223 AND property_id = 'ab890bce-e56e-4dbd-bd9c-e6690b98f853';

-- ============================================================================
-- Campingpark Bad Liebenzell. Not Im Monbachtal 1. Pitches + published rentals.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Campingpark Bad Liebenzell', slug = 'campingpark-bad-liebenzell',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_campingpark_bad_liebenzell_2026_09',
  address = 'Pforzheimer Str. 34', city = 'Bad Liebenzell', state = 'Baden-Württemberg',
  zip_code = '75378', country = 'Germany',
  lat = 48.7779333, lon = 8.7320496,
  url = 'https://www.campingpark-bad-liebenzell.com/', phone_number = '+49-7052-934060',
  property_total_sites = 120, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Kleinenzhof Harter KG. Official .com (Sage .de has no DNS). Address Pforzheimer Str. 34 — not Im Monbachtal 1 (Christliche Gästehäuser). PiNCAMP 112 tourist + 45 permanent. Published rentals: 4 safari lodge tents + 4 Océane bungalows. Finkota / Lappland Kota / Elevated Tent Lodge quantities unpublished — not stored.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Operator pitch from €28.80 off / €37.00 high (1 person). Safari lodge €165 off / €210 high (5p). Kurtaxe €3/adult. +49 7052 934060 (not stub 4088).',
  description = $$Campground at Pforzheimer Str. 34, 75378 Bad Liebenzell (48.7779333, 8.7320496). 112 tourist pitches plus 4 safari lodges and 4 bungalows. Adjacent Freibad. Not the Monbachtal guest houses.$$,
  activities_raw = 'On-site: pitches, playground, shop. Adjacent Freibad. Nearby: Monbachtal gorge, Paracelsus Therme, Nordschwarzwald.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11013 AND property_id = 'c59ad160-9761-4f17-bb06-bc46a13e4821';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 112,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. 112 tourist pitches (PiNCAMP). 45 permanent not in this qty. Safari lodges and bungalows split out.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 112): PiNCAMP tourist pitches. Pets yes on pitches. Do not invent Finkota/Kota/elevated-tent counts.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; adjacent Freibad. Pets yes on pitches.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 28.8, 'weekend', 28.8),
      'spring', jsonb_build_object('weekday', 28.8, 'weekend', 28.8),
      'summer', jsonb_build_object('weekday', 37, 'weekend', 37),
      'fall', jsonb_build_object('weekday', 28.8, 'weekend', 28.8),
      'note', 'EUR room_only. Operator 1-person pitch from €28.80 off / €37 high.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. Address Pforzheimer Str. 34. URL .com. Phone +49 7052 934060. This row is Tourist Pitch 112.'
WHERE id = 11013 AND property_id = 'c59ad160-9761-4f17-bb06-bc46a13e4821';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
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
  setting_ranch, setting_field, setting_mountainous, rv_parking,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Campingpark Bad Liebenzell', v.site_name,
  'web_research_campingpark_bad_liebenzell_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  120, v.qty, v.unit_type, v.capacity, v.bed,
  v.bath, v.shower, 'No', v.full_k,
  'No', 'Yes', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'Yes', 'No', 'No', 'No',
  v.season, '1',
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
  g.setting_ranch, g.setting_field, g.setting_mountainous, g.rv_parking,
  v.rates, g.rate_basis, g.rate_basis_notes, g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Safari Lodge', 4::numeric, 'Safari Tent', '5', 'Lodge beds',
     'Yes', 'Yes', 'No',
     'Year-round typical. Operator: unsere vier Zelte. Pets no in rentals.',
     $$Safari Lodge (qty 4): Furnished safari lodge tents. Pets no. Do not invent a 5th lodge.$$,
     'Safari lodge; ensuite; pets no.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 165, 'weekend', 165),
       'spring', jsonb_build_object('weekday', 165, 'weekend', 165),
       'summer', jsonb_build_object('weekday', 210, 'weekend', 210),
       'fall', jsonb_build_object('weekday', 165, 'weekend', 165),
       'note', 'EUR room_only. Operator safari lodge €165 off / €210 high (5p).'
     )),
     E'[2026-09-04] Added Safari Lodge qty 4 from campingpark-bad-liebenzell.com.'),
    ('Bungalow Océane', 4::numeric, 'Cabin', '6', 'Mobile-home beds',
     'Yes', 'Yes', 'Yes',
     'Year-round typical. Four Océane bungalow / mobile homes. Pets no in rentals.',
     $$Bungalow Océane (qty 4): Mobile-home bungalows. Pets no. Do not invent a 5th bungalow.$$,
     'Bungalow; kitchen; bath; pets no.',
     jsonb_build_object('2026', jsonb_build_object('note', 'EUR room_only. No bungalow-specific from-rate stored.')),
     E'[2026-09-04] Added Bungalow Océane qty 4 from campingpark-bad-liebenzell.com.')
) AS v(site_name, qty, unit_type, capacity, bed, bath, shower, full_k, season, unit_desc, amenities, rates, note)
WHERE g.id = 11013 AND g.property_id = 'c59ad160-9761-4f17-bb06-bc46a13e4821'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'c59ad160-9761-4f17-bb06-bc46a13e4821' AND x.site_name = v.site_name
  );

-- ============================================================================
-- Camping Valdeiva. Official valdeiva.com. 26 tourist pitches.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Valdeiva', slug = 'camping-valdeiva-deiva-marina',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_valdeiva_2026_09',
  address = 'Località Ronco 18', city = 'Deiva Marina', state = 'Liguria',
  zip_code = '19013', country = 'Italy',
  lat = 44.224701, lon = 9.55168,
  url = 'http://www.valdeiva.com/', phone_number = '+39-0187-824174',
  property_total_sites = 26, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Villaggio Camping Valdeiva, CIN 011014-PAR-0003. Official valdeiva.com (Sage campingvaldeiva.com is not the operator). PiNCAMP 26 tourist + 124 permanent pitches + 20 rentals unpublished split (bungalow/chalet types only). Not safari-tent glamping.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Operator 2020 weekly table is stale — not stored. PiNCAMP ADAC Campcard 2026 couple from €27 low / €38 high. Stored 27 as from-rate. +39 0187 824174 (not stub 816525).',
  description = $$Villaggio Camping Valdeiva at Località Ronco 18, 19013 Deiva Marina (44.224701, 9.55168). 26 tourist pitches (PiNCAMP). Pool, restaurant, Ligurian coast shuttle. Not safari-tent glamping.$$,
  activities_raw = 'On-site: pool, restaurant, playground. Nearby: Deiva Marina beach, Cinque Terre trains, Ligurian trails.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11053 AND property_id = '9a094873-f713-4696-aac2-7114c573f671';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 26,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal-leaning (directory 10 Feb–5 Nov 2026). 26 tourist pitches (PiNCAMP). 124 permanent + 20 rentals unpublished — not stored.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 26): PiNCAMP tourist pitches. Do not invent safari tents or a 20-rental SKU split.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; pool; restaurant. Pets yes with restrictions.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 27, 'weekend', 27),
      'spring', jsonb_build_object('weekday', 27, 'weekend', 27),
      'summer', jsonb_build_object('weekday', 38, 'weekend', 38),
      'fall', jsonb_build_object('weekday', 27, 'weekend', 27),
      'note', 'EUR room_only. PiNCAMP ADAC Campcard 2026 couple from €27 low / €38 high. Operator 2020 weekly PDF not stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. URL valdeiva.com. Phone +39 0187 824174. This row is Tourist Pitch 26. is_glamping_property No.'
WHERE id = 11053 AND property_id = '9a094873-f713-4696-aac2-7114c573f671';

COMMIT;
