-- ============================================================================
-- Yellowstone Tipis (Gardiner, MT): split sparse shell id 13210 into 3 SKU rows.
--
-- Sources (retrieved 2026-09-03):
--   https://www.yellowstonetipis.com/ (+ /booking /about /faq /groups)
--   ResNexus booking engine:
--     https://resnexus.com/resnexus/reservations/book/9C0F44F0-E5B7-4BD7-89DD-0A62BB9C860B/?NewSearch=1
--   TripAdvisor listing (not stored; no ota_url_tripadvisor column):
--     https://www.tripadvisor.com/Hotel_Review-g45184-d20867806-Reviews-Yellowstone_Tipis-Gardiner_Montana.html
--
-- Inventory (groups page — authoritative count):
--   5 King Tipis
--   5 Double Queen Tipis
--   1 Hawkeye Suite (top floor of Tipi Lodge)
--   9 assigned private baths in the bathhouse
--   property_total_sites = 11 (10 tipis + suite). Tipi Lodge is shared amenity
--   space, not a guest SKU. ResNexus lists room classes, not uniquely named tipis.
--
-- Rates (USD, Standard Rate, 2 adults):
--   Operator lodging "from": King $310 / Double Queen $339 / Hawkeye $1,100
--   ResNexus Fri Sep 4 2026 (weekend-adjacent): King $359 / DQ $409 / Hawkeye $899
--   Friday treated as weekend. Weekday = operator published "from" for tipis.
--   Hawkeye fall = ResNexus $899 sample; operator $1,100 noted in jsonb.
--   Tipis historically seasonal May 15–Sep 30 (2023 press); winter closed.
--   Summer 2027 not yet sampled — proxied from Sep 2026 Standard Rate.
--
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger on all_sage_data.
-- ============================================================================

BEGIN;

-- 13210: King Tipi (anchor)
UPDATE public.all_sage_data
SET
  property_name = 'Yellowstone Tipis',
  slug = 'yellowstone-tipis-gardiner-mt',
  site_name = 'King Tipi',
  unit_type = 'Tipi',
  quantity_of_units = 5,
  property_total_sites = 11,
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_yellowstone_tipis_resnexus_2026_09',
  address = '50 Jardine Road',
  city = 'Gardiner',
  state = 'MT',
  zip_code = '59030',
  country = 'United States',
  lat = 45.037904,
  lon = -110.699113,
  url = 'https://www.yellowstonetipis.com/',
  phone_number = '+1-406-224-8450',
  year_site_opened = 2022,
  season_open_month = 5,
  season_close_month = 9,
  operating_season_months = 'May 15–Sep 30 historically (2023 published season; verify annually). Hawkeye Suite may book off-season.',
  minimum_nights = '1',
  unit_capacity = '2',
  unit_sq_ft = 360,
  unit_bed = '1 King',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_gas_fireplace = 'No',
  unit_cable = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_mini_fridge = 'No',
  unit_ada_accessibility = NULL,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Assigned private spa bathhouse (not ensuite in canvas tipis); complimentary breakfast; tipi ADR ~$310–$409. Hawkeye Suite is a 10-guest lodge SKU (~$899 ResNexus / $1,100 operator from) that would auto-classify luxury via max ARDR ≥ $800 — overridden to upscale for the canvas glamping product.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'Complimentary continental breakfast + coffee bar. ResNexus Standard Rate samples 2026-09-03 (subscriber 9C0F44F0-E5B7-4BD7-89DD-0A62BB9C860B). FAQ: no pets; tipi guests ages 5+; extra child bedshare $25; cancel free until 30 days prior. Check-in 4–9 PM, check-out 10 AM.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '310',
  rate_spring_weekend = '359',
  rate_summer_weekday = '310',
  rate_summer_weekend = '359',
  rate_fall_weekday = '310',
  rate_fall_weekend = '359',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 310, 'weekend', 359),
      'summer', jsonb_build_object('weekday', 310, 'weekend', 359),
      'fall', jsonb_build_object('weekday', 310, 'weekend', 359),
      'note', 'King Tipi. Operator from $310 (yellowstonetipis.com/booking). ResNexus Standard Rate Fri Sep 4 2026 $359/night treated as weekend. Weekday = operator from. Spring/summer proxied from Sep 2026 sample (summer 2027 not yet bookable). Winter closed for canvas tipis (May 15–Sep 30 historically).'
    )
  ),
  description = $$Family-owned glamping at 50 Jardine Road in Gardiner, Montana — about 1 mile / 3–4 minutes from Yellowstone’s North Entrance (Roosevelt Arch). Ten 360 sq ft Nomadics canvas tipis (5 King, 5 Double Queen) in an enclosed fenced yard with assigned private spa bathhouse bathrooms, plus the Hawkeye Suite (2,412 sq ft, sleeps 10) on the top floor of Tipi Lodge. Complimentary continental breakfast, lodge lounge, gas fire pit, and free WiFi. Distinctly Montana Best of Montana 2023: Best Glamping and Best Rustic Hotel. Owner Sarah Ondrus. Tipi season historically May 15–Sep 30; no pets; tipi guests ages 5+.$$,
  unit_description = $$King Tipi: 360 sq ft canvas tipi with 1 King bed, sleeps 2 (ages 5+). Cooling fan, heated mattress covers, space heater, sitting area, lighting & electricity, dresser, luggage rack, Adirondack chairs. Assigned private bathroom in the adjacent bathhouse (shower, toilet, sink). Includes Yellowstone Tipi Lodge amenities (continental breakfast, lounge, coffee bar). One tipi + bath on property is ADA accessible.$$,
  amenities_raw = '360 sq ft Nomadics canvas tipi; 1 King; sleeps 2 (ages 5+); cooling fan; heated mattress covers; sitting area; lighting & electricity; space heater; dresser; luggage rack; Adirondack chairs; assigned private bathhouse bathroom (shower/toilet/sink); complimentary continental breakfast & coffee bar; lodge lounge; free WiFi; gas fire pit; enclosed fenced tipi yard. No AC in tipi. No food in tipi/yard (wildlife). No pets.',
  activities_raw = 'Yellowstone NP (North Entrance ~1 mile); wildlife watching; stargazing; hiking; horseback riding; whitewater rafting / scenic floats / kayaking on the Yellowstone River (~10-min walk); cowboy cookout nearby (Sun–Tue); historic Roosevelt Arch.',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_horseback_riding = 'Yes',
  activities_whitewater_paddling = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_paddling = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_stargazing = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_fishing = 'Yes',
  setting_mountainous = 'Yes',
  setting_forest = 'Yes',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Site/rate enrichment from yellowstonetipis.com + ResNexus 9C0F44F0-E5B7-4BD7-89DD-0A62BB9C860B. Split shell into 3 SKUs (King qty 5, Double Queen qty 5, Hawkeye qty 1; total 11). King from $310 / ResNexus Fri Sep 4 2026 $359. Assigned private baths (not ensuite). FAQ overrides ResNexus “Pet Friendly” badge — no pets. Original discovery: Google News RSS.',
  date_updated = '2026-09-03'
WHERE id = 13210
  AND property_id = '4d3c298a-facb-458a-9cf5-1bf929ad836a';

-- Remaining SKUs cloned from the King geo/property shell
INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_wildlife_watching, activities_horseback_riding,
  activities_whitewater_paddling, activities_canoeing_kayaking, activities_paddling,
  activities_scenic_drives, activities_stargazing, activities_historic_sightseeing,
  activities_fishing, setting_mountainous, setting_forest,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', COALESCE(g.is_glamping_property, 'Yes'), 'Sage', 'Yellowstone Tipis', v.site_name,
  'web_research_yellowstone_tipis_resnexus_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, COALESCE(g.country, 'United States'),
  g.slug, g.property_type,
  11, v.qty, v.unit_type, v.capacity, v.bed, v.sq_ft,
  v.private_bath, v.shower, v.kitchenette, v.full_kitchen,
  v.ac, 'Yes', 'No', 'Yes', v.water,
  'Yes', 'Yes', v.gas_fp, v.cable, 'No', 'No',
  'No', g.year_site_opened, v.open_mo, v.close_mo,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_wildlife_watching, g.activities_horseback_riding,
  g.activities_whitewater_paddling, g.activities_canoeing_kayaking, g.activities_paddling,
  g.activities_scenic_drives, g.activities_stargazing, g.activities_historic_sightseeing,
  g.activities_fishing, g.setting_mountainous, g.setting_forest,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, 'breakfast', g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Double Queen Tipi', 5, 'Tipi', '4', '2 Queen', 360::numeric,
      'Yes', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No',
      5::smallint, 9::smallint,
      'May 15–Sep 30 historically (2023 published season; verify annually). Hawkeye Suite may book off-season.',
      $$Double Queen Tipi: 360 sq ft canvas tipi with 2 Queen beds, sleeps 4 (ages 5+; parents may bedshare with children for $25/child). Cooling fan, heated mattress covers, space heater, sitting area, lighting & electricity, dresser, luggage rack, Adirondack chairs. Assigned private bathroom in the adjacent bathhouse (shower, toilet, sink). Includes Yellowstone Tipi Lodge amenities.$$,
      '360 sq ft Nomadics canvas tipi; 2 Queen; sleeps 4 (ages 5+); cooling fan; heated mattress covers; sitting area; lighting & electricity; space heater; dresser; luggage rack; Adirondack chairs; assigned private bathhouse bathroom (shower/toilet/sink); complimentary continental breakfast & coffee bar; lodge lounge; free WiFi; gas fire pit; enclosed fenced tipi yard. No AC in tipi. No food in tipi/yard (wildlife). No pets.',
      NULL::text, NULL::text,
      '339', '409',
      '339', '409',
      '339', '409',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 339, 'weekend', 409),
          'summer', jsonb_build_object('weekday', 339, 'weekend', 409),
          'fall', jsonb_build_object('weekday', 339, 'weekend', 409),
          'note', 'Double Queen Tipi. Operator from $339. ResNexus Standard Rate Fri Sep 4 2026 $409/night treated as weekend. Weekday = operator from. Spring/summer proxied from Sep 2026 sample. Winter closed for canvas tipis. Booking photos sometimes say “Double King Tipi” — ResNexus + lodging copy are Double Queen.'
        )
      ),
      E'[2026-09-03] Added from yellowstonetipis.com/groups + ResNexus: Double Queen Tipi; qty 5; from $339 / Fri Sep 4 2026 $409.'
    ),
    (
      'Hawkeye Suite', 1, 'Lodge', '10', '3 King / 4 Full bunks', 2412::numeric,
      'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      NULL::smallint, NULL::smallint,
      'Hawkeye Suite: verify year-round on ResNexus; canvas tipis historically May 15–Sep 30.',
      $$Hawkeye Suite: 2,412 sq ft four-bedroom lodge suite on the top floor of Tipi Lodge, sleeps 10. 3 King beds + 4 Full bunks; 3.5 bathrooms; full kitchen; laundry; dining and living areas; three decks (~400 sq ft plus two king-bedroom decks); A/C; BBQ; gas fireplace; DirectTV smart TVs; unlimited WiFi; reserved parking. No pets. Tipi Lodge amenities available for an additional fee.$$,
      '2,412 sq ft lodge suite (top floor of Tipi Lodge); 4 bedrooms / 7 beds (3 King + 4 Full bunks); 3.5 baths; sleeps 10; full kitchen; laundry; 3 decks; A/C; BBQ; gas fireplace; DirectTV smart TVs; unlimited WiFi; reserved parking. No pets. Tipi Lodge amenities available for additional fee.',
      NULL::text, NULL::text,
      '899', '899',
      '899', '1100',
      '899', '899',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 899, 'weekend', 899),
          'summer', jsonb_build_object('weekday', 899, 'weekend', 1100),
          'fall', jsonb_build_object('weekday', 899, 'weekend', 899),
          'note', 'Hawkeye Suite. ResNexus Standard Rate Fri Sep 4 2026 $899/night (2 adults). Operator lodging page from $1,100 used as summer weekend proxy. Spring/fall = ResNexus sample (no WD/WE split observed). Winter not sampled.'
        )
      ),
      E'[2026-09-03] Added from yellowstonetipis.com/booking + ResNexus unit details: Hawkeye Suite; qty 1; 2,412 sq ft; sleeps 10; ResNexus $899 / operator from $1,100.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed, sq_ft,
  private_bath, shower, kitchenette, full_kitchen, ac, water, gas_fp, cable,
  open_mo, close_mo, season,
  unit_desc, amenities,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, note
)
WHERE g.id = 13210
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

UPDATE public.all_sage_data
SET property_total_sites = 11, date_updated = '2026-09-03'
WHERE property_id = '4d3c298a-facb-458a-9cf5-1bf929ad836a';

COMMIT;
