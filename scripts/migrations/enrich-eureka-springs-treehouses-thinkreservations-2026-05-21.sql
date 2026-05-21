-- Eureka Springs Treehouses: ThinkReservations enrichment (24 site rows)
-- Source: https://secure.thinkreservations.com/estreehouses/reservations/availability (May 2026)
-- Sample ADR quotes: 2026-05-21→22 (1 night, 2 adults); 2026-06-15→17 (2 nights) where noted.

UPDATE public.all_glamping_properties SET
  property_id = '1eed22fc-916f-4748-8fee-f9f0716ede7b'::uuid,
  site_name = '1) Sequoia Treehouse',
  slug = 'eureka-springs-treehouses-ar',
  property_type = 'Glamping Resort',
  unit_type = 'Treehouse',
  url = 'https://secure.thinkreservations.com/estreehouses/reservations/availability',
  phone_number = '+1-479-253-9493',
  country = 'United States',
  state = 'AR',
  city = 'Eureka Springs',
  address = '3018 E Van Buren, Eureka Springs, AR 72632',
  zip_code = '72632',
  lat = 36.3964,
  lon = -93.737,
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = 'Yes',
  property_total_sites = 24,
  quantity_of_units = 1,
  unit_capacity = '2',
  minimum_nights = '2',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_campfires = 'No',
  unit_air_conditioning = 'Yes',
  property_family_friendly = 'Yes',
  setting_forest = 'Yes',
  activities_wildlife_watching = 'Yes',
  land_operator_category = 'private_commercial',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05',
  description = $$Eureka Springs Treehouses, Caves, Castles & Hobbits — themed elevated treehouses, hobbit caves, castle units, and caverns on 3018 E Van Buren near Eureka Springs AR (estreehouses.com / ThinkReservations). Typical unit: jacuzzi for 2, fireplace, seasonal A/C, kitchenette, king bed, cable/DVD, deck or patio; extensive walkways/stairs. Sister property Hogsveil offers Mystic Cottages next door (hogsveil.com).$$,
  unit_description = $$Sequoia Treehouse: jacuzzi for 2, fireplace, seasonal A/C, 40" flat panel TV with cable & DVD, kitchenette (fridge, microwave, coffeemaker), king bed, cable TV/DVD in bedroom, stall shower, deck with glider and bistro set. Room number subject to change.$$,
  notes = COALESCE(notes, '') || E'\n\nThinkReservations (May 2026): ADR $269/night sample 2026-05-21→22 (2 guests); many units enforce 2-night minimum on select dates.',
  amenities_raw = 'Jacuzzi for 2; fireplace; seasonal A/C; 40" flat panel TV; cable & DVD; kitchenette; king bed; stall shower; private deck.',
  rate_avg_retail_daily_rate = 269,
  rate_summer_weekday = 269,
  rate_summer_weekend = 269,
  rate_unit_rates_by_year = '{"2026":{"standard":{"base_nightly":269,"included_guests":2,"note":"ThinkReservations ADR 2026-05-21; taxes/fees additional"}}}'::jsonb
WHERE id = 32;

UPDATE public.all_glamping_properties SET
  property_id = '1eed22fc-916f-4748-8fee-f9f0716ede7b'::uuid,
  unit_type = 'Treehouse',
  unit_description = $$Second Sequoia Treehouse inventory slot (ThinkReservations #7); same feature set as unit 1.$$,
  notes = COALESCE(notes, '') || E'\n\nThinkReservations (May 2026): ADR $269/night sample 2026-05-21→22.',
  amenities_raw = 'Jacuzzi for 2; fireplace; seasonal A/C; 40" flat panel TV; cable & DVD; kitchenette; king bed; stall shower; private deck.',
  rate_avg_retail_daily_rate = 269,
  rate_summer_weekday = 269,
  rate_summer_weekend = 269,
  rate_unit_rates_by_year = '{"2026":{"standard":{"base_nightly":269,"included_guests":2,"note":"ThinkReservations ADR 2026-05-21"}}}'::jsonb,
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE id = 64;

-- Standard treehouse tier ($269 ADR sample May 2026)
UPDATE public.all_glamping_properties SET
  unit_type = 'Treehouse',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 269,
  rate_summer_weekday = 269,
  rate_summer_weekend = 269,
  rate_unit_rates_by_year = '{"2026":{"standard":{"base_nightly":269,"included_guests":2,"note":"ThinkReservations standard treehouse ADR 2026-05-21"}}}'::jsonb,
  amenities_raw = 'Jacuzzi for 2; fireplace; seasonal A/C; flat panel TV; cable & DVD; kitchenette; king bed; stall shower; deck with glider.',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses'
  AND site_name IN (
    '2) Central Park Treehouse',
    '3) Santa Fe Sunset Treehouse',
    '4) Venice Treehouse',
    '5) Central Park Treehouse',
    '6) Santa Fe Sunset Treehouse',
    '8) Big Sur Treehouse'
  );

UPDATE public.all_glamping_properties SET
  unit_description = 'Central Park Treehouse: remodeled March 2019; jacuzzi, fireplace, seasonal A/C, 40" flat screen TV, kitchenette, king bed, stall shower, deck.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Central Park line; ADR $269/night (2026-05-21 sample).'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name IN ('2) Central Park Treehouse', '5) Central Park Treehouse');

UPDATE public.all_glamping_properties SET
  unit_description = 'Santa Fe Sunset Treehouse: Santa Fe themed; jacuzzi, fireplace, seasonal A/C, 40" TV/DVD, kitchenette, king bed, stall shower, deck.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Santa Fe line; ADR $269/night (2026-05-21 sample).'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name IN ('3) Santa Fe Sunset Treehouse', '6) Santa Fe Sunset Treehouse');

UPDATE public.all_glamping_properties SET
  unit_description = 'Venice Treehouse: Venice themed; jacuzzi, fireplace, seasonal A/C, 40" TV/DVD, kitchenette, king bed, stall shower, deck.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Venice line; ADR $269/night (2026-05-21 sample).'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = '4) Venice Treehouse';

UPDATE public.all_glamping_properties SET
  unit_description = 'Big Sur Treehouse: Big Sur themed; jacuzzi, fireplace, seasonal A/C, flat panel TV, kitchenette, king bed, stall shower, deck.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Big Sur line; ADR $269/night tier (confirm calendar).'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = '8) Big Sur Treehouse';

-- Ultimate treehouse tier ($279 ADR)
UPDATE public.all_glamping_properties SET
  unit_type = 'Treehouse',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 279,
  rate_summer_weekday = 279,
  rate_summer_weekend = 279,
  rate_unit_rates_by_year = '{"2026":{"ultimate":{"base_nightly":279,"included_guests":2,"note":"ThinkReservations Ultimate line ADR 2026-05-21"}}}'::jsonb,
  amenities_raw = 'Jacuzzi for 2; fireplace; seasonal A/C; 46" flat panel TV & DVD; kitchenette; king bed; stall shower; deck.',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses'
  AND site_name IN ('9) Ultimate Santa Fe Treehouse', '10) Ultimate Venice Treehouse');

UPDATE public.all_glamping_properties SET
  unit_description = 'Ultimate Santa Fe Treehouse: upgraded Santa Fe line with premium finishes; jacuzzi, fireplace, seasonal A/C, 46" TV, kitchenette, king bed, deck.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Ultimate Santa Fe; ADR $279/night tier (2026-05-21 sample on Ultimate Venice).'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = '9) Ultimate Santa Fe Treehouse';

UPDATE public.all_glamping_properties SET
  unit_description = 'Ultimate Venice Treehouse: jacuzzi for 2, fireplace, seasonal A/C, 46" flat panel TV with DVD, kitchenette, king bed, stall shower, deck with glider.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: ADR $279/night sample 2026-05-21→22.'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = '10) Ultimate Venice Treehouse';

-- Magical Castle tier ($299 ADR)
UPDATE public.all_glamping_properties SET
  unit_type = 'Treehouse',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 299,
  rate_summer_weekday = 299,
  rate_summer_weekend = 299,
  rate_unit_rates_by_year = '{"2026":{"castle":{"base_nightly":299,"included_guests":2,"note":"ThinkReservations Magical Castle ADR 2026-05-21"}}}'::jsonb,
  amenities_raw = 'Tower jacuzzi for 2 with fireplace & TV; secret passage shower for 2; two fireplaces; 50" flat panel TV; kitchenette; king bed; private deck ~12 ft up.',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses'
  AND site_name IN ('20) Magical Castle Treehouse', '21) Magical Castle Treehouse', '22) Magical Castle Treehouse');

UPDATE public.all_glamping_properties SET
  unit_description = 'Magical Castle Treehouse: tower jacuzzi with fireplace & flat panel TV, secret passage shower for 2, living room 50" TV, two fireplaces, kitchenette, king bed, private elevated deck.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: ADR $299/night sample 2026-05-21→22 (unit 20).'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = '20) Magical Castle Treehouse';

UPDATE public.all_glamping_properties SET
  unit_description = 'Magical Castle Treehouse (second inventory slot): same castle feature set as unit 20.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Magical Castle tier $299/night ADR.'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name IN ('21) Magical Castle Treehouse', '22) Magical Castle Treehouse');

-- Hobbit Cave tier ($379 ADR)
UPDATE public.all_glamping_properties SET
  unit_type = 'Cave',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 379,
  rate_summer_weekday = 379,
  rate_summer_weekend = 379,
  rate_unit_rates_by_year = '{"2026":{"hobbit_cave":{"base_nightly":379,"included_guests":2,"note":"ThinkReservations Hobbit Cave ADR 2026-05-21"}}}'::jsonb,
  amenities_raw = 'Jacuzzi for 2; fireplace; seasonal A/C; 50" flat panel TV; cable & DVD; kitchenette; king bed; shower for 2; patio with glider.',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses'
  AND site_name IN ('23) Hobbit Cave', '24) Hobbit Cave', '25) Hobbit Cave');

UPDATE public.all_glamping_properties SET
  unit_description = 'Hobbit Cave: jacuzzi for 2, fireplace, seasonal A/C, 50" flat panel TV, kitchenette, king bed, shower for 2, patio with glider and bistro set.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: ADR $379/night sample 2026-05-21→22 (unit 24).'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = '24) Hobbit Cave';

UPDATE public.all_glamping_properties SET
  unit_description = 'Hobbit Cave (inventory slot): same hobbit cave feature set.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Hobbit Cave tier $379/night ADR.'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name IN ('23) Hobbit Cave', '25) Hobbit Cave');

-- Ultimate Hobbit Cave (premium cave tier)
UPDATE public.all_glamping_properties SET
  unit_type = 'Cave',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 399,
  rate_summer_weekday = 399,
  rate_summer_weekend = 399,
  rate_unit_rates_by_year = '{"2026":{"ultimate_hobbit":{"base_nightly":399,"included_guests":2,"note":"Premium hobbit tier; 3-night minimum on some dates; confirm ADR in engine"}}}'::jsonb,
  amenities_raw = 'Premium hobbit cave; jacuzzi for 2; fireplace; seasonal A/C; flat panel TV; kitchenette; king bed; shower for 2; patio.',
  unit_description = 'Ultimate Hobbit Cave: premium hobbit-line cave unit (ThinkReservations #19).',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: 3-night minimum enforced on some date ranges (2026-06-15 sample).',
  minimum_nights = '3',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = '19) Ultimate Hobbit Cave';

-- Kauai Grotto Cave tier (estimate between castle and hobbit; confirm in engine)
UPDATE public.all_glamping_properties SET
  unit_type = 'Cave',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 349,
  rate_summer_weekday = 349,
  rate_summer_weekend = 349,
  rate_unit_rates_by_year = '{"2026":{"kauai_grotto":{"base_nightly":349,"included_guests":2,"note":"Tier estimate between castle and hobbit; re-quote in ThinkReservations"}}}'::jsonb,
  amenities_raw = 'Jacuzzi for 2; fireplace; seasonal A/C; flat panel TV; kitchenette; king bed; shower; patio or grotto deck.',
  unit_description = 'Kauai Grotto Cave: tropical grotto-themed cave unit with jacuzzi, fireplace, kitchenette, king bed, and private outdoor space.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Kauai Grotto inventory slots #26–27; ADR not quoted on 2026-05-21 sample — tier estimate $349.',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses'
  AND site_name IN ('26) Kauai Grotto Cave', '27) Kauai Grotto Cave');

-- Avatar Cavern tier
UPDATE public.all_glamping_properties SET
  unit_type = 'Cave',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 299,
  rate_summer_weekday = 299,
  rate_summer_weekend = 299,
  rate_unit_rates_by_year = '{"2026":{"avatar_cavern":{"base_nightly":299,"included_guests":2,"note":"ADR $299 sample 2026-05-21; $249 on 2026-06-15→17 (2-night) — seasonal variance"}}}'::jsonb,
  amenities_raw = 'Jacuzzi for 2; fireplace; seasonal A/C; 50" flat panel TV; kitchenette; king bed; shower for 2; mystical cavern patio.',
  unit_description = 'Avatar Cavern of Mystical Trees: jacuzzi, shower for 2, 50" TV, king bed, kitchenette, patio; Avatar-themed cavern unit.',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: ADR $299/night (2026-05-21) and $249/night (2026-06-15→17 two-night sample).',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses'
  AND site_name IN ('28) Avatar Cavern of Mystical Trees', '29) Avatar Cavern of Mystical Trees');

-- Hogsveil sister-property SKUs on shared ThinkReservations calendar
UPDATE public.all_glamping_properties SET
  unit_type = 'Cabin',
  unit_hot_tub = 'Yes',
  unit_sauna = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'Yes',
  unit_air_conditioning = 'Yes',
  rate_avg_retail_daily_rate = 149,
  rate_summer_weekday = 149,
  rate_summer_weekend = 149,
  rate_unit_rates_by_year = '{"2026":{"mystic_cottage":{"base_nightly":149,"included_guests":2,"note":"ADR $149/night on 2026-06-15→17 (2-night stay); 2–3 night minimum common"}}}'::jsonb,
  amenities_raw = 'Jacuzzi for 2; private sauna; fireplace; seasonal A/C; 43" flat panel TV; bedroom TV; free WiFi; kitchenette; king bed; tiled shower; magical secret door; private deck.',
  unit_description = 'Four Mystic Cottages of Hogsveil (sister property): books 4 of 6 identical mystic cottages — jacuzzi, private sauna, WiFi, secret door, king bed, private deck. Located at adjacent Hogsveil (hogsveil.com).',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: 2-night minimum on 1-night search (2026-05-21); 3-night minimum on some 2-night searches. ADR $149/night sample 2026-06-15→17.',
  minimum_nights = '2',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses'
  AND site_name IN ('1. Four Mystic Cottages of Hogsveil', '2. Four Mystic Cottages of Hogsveil');

UPDATE public.all_glamping_properties SET
  unit_type = 'Cabin',
  unit_hot_tub = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_wifi = 'No',
  unit_air_conditioning = 'Yes',
  unit_description = 'Hogsveil Cottages: sister-property cottage inventory pool on shared ThinkReservations calendar (hogsveil.com).',
  notes = COALESCE(notes, '') || E'\n\nThinkReservations: Hogsveil cottage aggregate SKU; quote ADR per stay in booking engine.',
  date_updated = '2026-05-21',
  discovery_source = 'web_research_estreehouses_thinkreservations_2026_05'
WHERE property_name = 'Eureka Springs Treehouses' AND site_name = 'Hogsveil Cottages';

-- Sibling rows: keep concise property description pointer
UPDATE public.all_glamping_properties SET
  description = 'Sibling site — Eureka Springs Treehouses (Eureka Springs AR). See anchor row id 32.',
  url = 'https://secure.thinkreservations.com/estreehouses/reservations/availability',
  phone_number = '+1-479-253-9493',
  country = 'United States',
  state = 'AR',
  city = 'Eureka Springs',
  address = '3018 E Van Buren, Eureka Springs, AR 72632',
  zip_code = '72632',
  lat = 36.3964,
  lon = -93.737,
  property_total_sites = 24,
  quantity_of_units = 1,
  unit_capacity = '2',
  is_glamping_property = 'Yes',
  is_open = 'Yes',
  property_type = 'Glamping Resort',
  slug = 'eureka-springs-treehouses-ar',
  land_operator_category = 'private_commercial',
  property_family_friendly = 'Yes',
  setting_forest = 'Yes',
  activities_wildlife_watching = 'Yes'
WHERE property_name = 'Eureka Springs Treehouses' AND id <> 32;
