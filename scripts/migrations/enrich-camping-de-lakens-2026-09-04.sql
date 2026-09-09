-- ============================================================================
-- Camping de Lakens (Bloemendaal aan Zee): publish tourist pitches.
-- NOT 100 Airstreams. Kennemer Duincampings beach campground with glamping
-- rentals (Dunelodge, safari, bell, De Waard, retro trailer) — 63 rentals
-- on PiNCAMP without a published per-SKU split, so not invented.
--
-- Sources (retrieved 2026-09-04):
--   https://www.campingdelakens.nl/ (+ /overnachten/kamperen /accommodaties)
--   PiNCAMP: 482 tourist pitches, 282 permanent, 63 rentals
--   Campercontact: Zeeweg 60, 2051 EC; 52.40826, 4.55376
--
-- Operating inventory:
--   Tourist Pitch qty 482 — Campsite (Dunespot / Lounge / Comfort / tent spots
--     lumped). 282 permanent pitches noted only.
--   property_total_sites = 482 (tourist). Do not add 63 rental SKUs.
--
-- Rates EUR, room_only. Dynamic — no static ADR stored.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Camping de Lakens',
  slug = 'camping-de-lakens-bloemendaal-nl',
  property_type = 'Campground',
  source = 'Sage',
  discovery_source = 'web_research_camping_de_lakens_operator_pincamp_2026_09',
  address = 'Zeeweg 60',
  city = 'Bloemendaal',
  state = 'North Holland',
  zip_code = '2051 EC',
  country = 'Netherlands',
  lat = 52.40826,
  lon = 4.55376,
  url = 'https://www.campingdelakens.nl/',
  phone_number = '+31-23-541-1570',
  property_total_sites = 482,
  year_site_opened = 1950,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'Yes',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'Yes',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Kennemer Duincampings beach campground in Zuid-Kennemerland dunes. PiNCAMP: 482 tourist + 282 permanent pitches + 63 rental units (Dunelodge, safari tents, De Waard, bell tents, retro trailer, beachshack/dome). Per-SKU rental counts unpublished — not stored. Pets not allowed on standard pitches. Season from 27 Mar 2026.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic pitch pricing — no static ADR. Tourist tax €4.23/person/night (age 4+). Preference fee €25. Extra guest €17.20. Sauna/gym included on pitches. SPAR + Restaurant Gestrand. +31 23 541 1570.',
  description = $$Beach campground at Zeeweg 60, 2051 EC Bloemendaal aan Zee (52.40826, 4.55376), one dune from the North Sea in Zuid-Kennemerland National Park. 482 tourist pitches (PiNCAMP) plus 282 permanent pitches and 63 unpublished-split rentals (glamping tents, Dunelodge, retro trailer). Restaurant Gestrand, SPAR, gym and sauna. Not 100 Airstreams.$$,
  activities_raw = 'On-site: beach (100 steps), sauna, gym/bootcamp, yoga, wellness dome, playground, restaurant, SPAR, bike hire, surf. Nearby: Zuid-Kennemerland, Haarlem, Zandvoort.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'No',
  rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11085
  AND property_id = '87d70e87-41c0-4808-a7d9-6781e83955f6';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch',
  unit_type = 'Campsite',
  quantity_of_units = 482,
  unit_capacity = '6',
  unit_bed = NULL,
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'No',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 3,
  season_close_month = 10,
  operating_season_months = 'Seasonal (2026 from 27 March). Dunespot, Loungespot, Comfort, Playtown, Helmspot, Beachspot lumped. 282 permanent pitches not in this qty. 63 rental units unpublished split — not stored.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 482): PiNCAMP tourist pitches in the dunes (caravan, tent, motorhome). Electricity typically 16A; Comfort has water/sewer. Pets not allowed on standard pitches. Do not invent 100 Airstreams or per-SKU rental counts.$$,
  amenities_raw = 'Pitch; 16A electricity; shared sanitary; sauna/gym included; SPAR; restaurant. Pets no on standard pitches.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_fall_weekday = NULL,
  rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic operator pricing — no static ADR stored. Tourist tax €4.23. Do not keep stub 150 as pitch ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Airstream qty 100 stub. This row is Tourist Pitch / Campsite qty 482 (PiNCAMP). 63 rentals + 282 permanent noted only. is_glamping_property Yes (rental glamping exists). rate_basis unknown → room_only. Cleared invented 150 ADR.'
WHERE id = 11085
  AND property_id = '87d70e87-41c0-4808-a7d9-6781e83955f6';

COMMIT;
