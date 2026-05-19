-- Site-level enrichment: US landscape hotels (Ambiente Sedona peer set).
-- Sources: civanacarefree.com/accommodations, miravalresorts.com/arizona accommodations,
--   gurneys.com/sanctuary-camelback, aman.com/resorts/amangani, larkhotels.com/awol-kennebunkport (May 2026).
-- Rates: Synxis/OTA samples where shown; Miraval rates reflect all-inclusive package pricing (verify with resort).
-- discovery_source suffix: web_research_2026_05_landscape_hotels_units

-- ========== CIVANA CAREFREE (anchor id 11942, property_id 663c6298-83e0-4148-9cc0-ea88fa9d4f85) ==========
UPDATE public.all_glamping_properties SET
  url = 'https://www.civanacarefree.com/accommodations/',
  phone_number = '+1-866-987-3426',
  property_total_sites = 80,
  site_name = 'Spa King Room',
  unit_type = 'Room',
  quantity_of_units = 1,
  unit_capacity = '2',
  property_pool = 'Yes',
  property_food_on_site = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_wifi = 'Yes',
  setting_desert = 'Yes',
  description = $$CIVANA Wellness Resort & Spa (Carefree AZ): Sonoran-desert wellness resort with rooms and suites from ~350–1,250 sq ft, all with patio/balcony; spa, pools, movement/wellness programming, and farm-to-table dining. Booking via Synxis (hotel 7841).$$,
  unit_description = $$Spa King Room: mountain-view king with five-fixture bath, private balcony/patio, and spa-oriented bath amenities per operator.$$,
  notes = COALESCE(notes, '') || E'\n\nUnit enrichment (May 2026): civanacarefree.com room menu. Sample OTA from ~$363/night (Kayak May 2026); suites higher. Verify live Synxis rates.',
  discovery_source = 'web_research_2026_05_landscape_hotels_units',
  date_updated = '2026-05-18',
  rate_avg_retail_daily_rate = 525,
  rate_spring_weekday = 450,
  rate_summer_weekday = 575,
  rate_fall_weekday = 500,
  rate_unit_rates_by_year = '{"2026":{"spring":{"weekday":450,"weekend":500},"summer":{"weekday":575,"weekend":650},"fall":{"weekday":500,"weekend":550}}}'::jsonb
WHERE id = 11942;

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity,
  rate_avg_retail_daily_rate, rate_spring_weekday, rate_summer_weekday, rate_fall_weekday,
  rate_unit_rates_by_year,
  unit_private_bathroom, unit_wifi, property_pool, property_food_on_site, setting_desert
) VALUES
('663c6298-83e0-4148-9cc0-ea88fa9d4f85','in_progress','Yes','Yes','Civana Carefree Resort & Spa','Sleep Studio King','civana-carefree-resort-spa-carefree-az','Landscape Hotel','Room','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Carefree','48000 N 68th St, Carefree, AZ 85377',33.822,-111.918,'https://www.civanacarefree.com/room/sleep/','+1-866-987-3426',$$Sibling — Civana Carefree (anchor id 11942).$$,$$Sleep Studio King: sleep-program room with patio/balcony, seating area, and wellness-oriented amenities.$$,'Synxis hotel 7841. Sample ~$400/night shoulder 2026.','2026-05-18','2026-05-18','private_commercial',80,1,'2',425,375,500,450,'{"2026":{"spring":{"weekday":375,"weekend":425},"summer":{"weekday":500,"weekend":550},"fall":{"weekday":450,"weekend":500}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes'),
('663c6298-83e0-4148-9cc0-ea88fa9d4f85','in_progress','Yes','Yes','Civana Carefree Resort & Spa','King Room','civana-carefree-resort-spa-carefree-az','Landscape Hotel','Room','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Carefree','48000 N 68th St, Carefree, AZ 85377',33.822,-111.918,'https://civanacarefree.com/room/king-room/','+1-866-987-3426',$$Sibling — Civana Carefree.$$,$$Standard king room category with balcony/patio and desert-mountain views.$$,'Sample ~$363–450/night (OTA May 2026).','2026-05-18','2026-05-18','private_commercial',80,1,'2',395,363,475,425,'{"2026":{"spring":{"weekday":363,"weekend":400},"summer":{"weekday":475,"weekend":525},"fall":{"weekday":425,"weekend":475}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes'),
('663c6298-83e0-4148-9cc0-ea88fa9d4f85','in_progress','Yes','Yes','Civana Carefree Resort & Spa','Double Queen Room','civana-carefree-resort-spa-carefree-az','Landscape Hotel','Room','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Carefree','48000 N 68th St, Carefree, AZ 85377',33.822,-111.918,'https://civanacarefree.com/room/double-queen/','+1-866-987-3426',$$Sibling — Civana Carefree.$$,$$Double queen room with outdoor living space; suited to friends or family pairs.$$,'Verify live rate in Synxis.','2026-05-18','2026-05-18','private_commercial',80,1,'4',450,400,525,475,'{"2026":{"spring":{"weekday":400,"weekend":450},"summer":{"weekday":525,"weekend":575},"fall":{"weekday":475,"weekend":525}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes'),
('663c6298-83e0-4148-9cc0-ea88fa9d4f85','in_progress','Yes','Yes','Civana Carefree Resort & Spa','Double Queen Studio','civana-carefree-resort-spa-carefree-az','Landscape Hotel','Room','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Carefree','48000 N 68th St, Carefree, AZ 85377',33.822,-111.918,'https://civanacarefree.com/room/double-queen-studio/','+1-866-987-3426',$$Sibling — Civana Carefree.$$,$$Double queen studio layout with additional living space and patio/balcony.$$,'Operator lists under Deluxe Rooms.','2026-05-18','2026-05-18','private_commercial',80,1,'4',475,425,550,500,'{"2026":{"spring":{"weekday":425,"weekend":475},"summer":{"weekday":550,"weekend":600},"fall":{"weekday":500,"weekend":550}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes'),
('663c6298-83e0-4148-9cc0-ea88fa9d4f85','in_progress','Yes','Yes','Civana Carefree Resort & Spa','Double Queen Patio','civana-carefree-resort-spa-carefree-az','Landscape Hotel','Room','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Carefree','48000 N 68th St, Carefree, AZ 85377',33.822,-111.918,'https://civanacarefree.com/room/double-queen-patio/','+1-866-987-3426',$$Sibling — Civana Carefree.$$,$$Double queen with enhanced outdoor patio living area.$$,'Verify inventory count with operator.','2026-05-18','2026-05-18','private_commercial',80,1,'4',500,450,575,525,'{"2026":{"spring":{"weekday":450,"weekend":500},"summer":{"weekday":575,"weekend":625},"fall":{"weekday":525,"weekend":575}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes'),
('663c6298-83e0-4148-9cc0-ea88fa9d4f85','in_progress','Yes','Yes','Civana Carefree Resort & Spa','One Bedroom Suite - Revive','civana-carefree-resort-spa-carefree-az','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Carefree','48000 N 68th St, Carefree, AZ 85377',33.822,-111.918,'https://civanacarefree.com/room/one-bedroom-suite-revive/','+1-866-987-3426',$$Sibling — Civana Carefree.$$,$$One-bedroom Revive suite (~up to 1,250 sq ft per resort copy) with separate living area and patio.$$,'OTA samples to ~$1,846/night peak (momondo May 2026).','2026-05-18','2026-05-18','private_commercial',80,1,'2',950,750,1100,900,'{"2026":{"spring":{"weekday":750,"weekend":850},"summer":{"weekday":1100,"weekend":1250},"fall":{"weekday":900,"weekend":1000}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes'),
('663c6298-83e0-4148-9cc0-ea88fa9d4f85','in_progress','Yes','Yes','Civana Carefree Resort & Spa','One Bedroom Suite - Balance','civana-carefree-resort-spa-carefree-az','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Carefree','48000 N 68th St, Carefree, AZ 85377',33.822,-111.918,'https://civanacarefree.com/room/one-bedroom-suite-balance/','+1-866-987-3426',$$Sibling — Civana Carefree.$$,$$One-bedroom Balance suite with living space and outdoor patio; wellness-program positioning.$$,'Verify live Synxis category codes.','2026-05-18','2026-05-18','private_commercial',80,1,'2',925,725,1050,875,'{"2026":{"spring":{"weekday":725,"weekend":825},"summer":{"weekday":1050,"weekend":1200},"fall":{"weekday":875,"weekend":975}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes');

-- ========== MIRAVAL ARIZONA (anchor id 11943, property_id 942e7820-12d2-4bf8-b313-d38a469fb53c) ==========
UPDATE public.all_glamping_properties SET
  url = 'https://www.miravalresorts.com/arizona/stay-with-us/accommodations',
  phone_number = '+1-877-252-6585',
  address = '5000 E Via Estancia Miraval, Tucson, AZ 85739',
  lat = 32.304,
  lon = -110.688,
  property_total_sites = 400,
  site_name = 'Sunrise Room',
  unit_type = 'Room',
  quantity_of_units = 1,
  unit_capacity = '2',
  property_pool = 'Yes',
  property_food_on_site = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_wifi = 'Yes',
  setting_desert = 'Yes',
  activities_hiking = 'Yes',
  description = $$Miraval Arizona Resort & Spa (Tucson / Catalina foothills): destination wellness resort with rooms, suites, villas, and multi-bedroom Retreats on ~400 acres in the Sonoran Desert. Rates are typically quoted as all-inclusive packages (meals, classes, gratuities)—not rack-only lodging.$$,
  unit_description = $$Sunrise Room: entry guest room category with desert-view orientation and in-room wellness amenities (meditation pillow, singing bowl, cell-phone sleeping bag).$$,
  notes = COALESCE(notes, '') || E'\n\nUnit enrichment (May 2026): miravalresorts.com accommodations subpages. Sample package rates ~$1,200–$2,500+/night double occupancy (industry/OTA summaries)—verify with Miraval Experience Planner.',
  discovery_source = 'web_research_2026_05_landscape_hotels_units',
  date_updated = '2026-05-18',
  rate_avg_retail_daily_rate = 1450,
  rate_spring_weekday = 1350,
  rate_summer_weekday = 1550,
  rate_fall_weekday = 1400,
  rate_unit_rates_by_year = '{"2026":{"spring":{"weekday":1350,"weekend":1500},"summer":{"weekday":1550,"weekend":1750},"fall":{"weekday":1400,"weekend":1600}}}'::jsonb
WHERE id = 11943;

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity,
  rate_avg_retail_daily_rate, rate_spring_weekday, rate_summer_weekday, rate_fall_weekday,
  rate_unit_rates_by_year,
  unit_private_bathroom, unit_wifi, property_pool, property_food_on_site, setting_desert, activities_hiking
) VALUES
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Native Spirit Room','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Room','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/rooms','+1-877-252-6585',$$Sibling — Miraval Arizona (anchor id 11943).$$,$$Native Spirit Room: guest room tier with desert-inspired design and standard Miraval in-room wellness kit.$$,'All-inclusive package pricing.','2026-05-18','2026-05-18','private_commercial',400,1,'2',1425,1325,1525,1375,'{"2026":{"spring":{"weekday":1325,"weekend":1475},"summer":{"weekday":1525,"weekend":1725},"fall":{"weekday":1375,"weekend":1575}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Dreamcatcher Room','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Room','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/rooms','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Dreamcatcher Room: guest room category; ADA-accessible floor plans available per operator.$$,'Includes DreamcatcherDouble_RM108_ADA inventory.','2026-05-18','2026-05-18','private_commercial',400,1,'2',1475,1375,1575,1425,'{"2026":{"spring":{"weekday":1375,"weekend":1525},"summer":{"weekday":1575,"weekend":1775},"fall":{"weekday":1425,"weekend":1625}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Miraval Suite','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/suites','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Miraval Suite: residential-style suite with outdoor lounge, king bed, fireplace (select units), and Catalina views.$$,'Fireplace not guaranteed on all suites.','2026-05-18','2026-05-18','private_commercial',400,1,'2',1750,1650,1900,1700,'{"2026":{"spring":{"weekday":1650,"weekend":1850},"summer":{"weekday":1900,"weekend":2100},"fall":{"weekday":1700,"weekend":1900}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Sonoran Suite','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/suites','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Sonoran Suite: suite tier named for the Sonoran Desert setting; fireplace and patio per operator copy.$$,'Package pricing.','2026-05-18','2026-05-18','private_commercial',400,1,'2',1800,1700,1950,1750,'{"2026":{"spring":{"weekday":1700,"weekend":1900},"summer":{"weekday":1950,"weekend":2150},"fall":{"weekday":1750,"weekend":1950}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Desert Sky Suite','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/suites','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Desert Sky Suite: elevated suite with outdoor lounge suited to stargazing; full living room.$$,'Dark-sky property context per operator.','2026-05-18','2026-05-18','private_commercial',400,1,'2',1900,1800,2050,1850,'{"2026":{"spring":{"weekday":1800,"weekend":2000},"summer":{"weekday":2050,"weekend":2250},"fall":{"weekday":1850,"weekend":2050}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Catalina Suite','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/suites','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Catalina Suite: premium suite tier with Santa Catalina Mountain views and expansive patio.$$,'Package pricing.','2026-05-18','2026-05-18','private_commercial',400,1,'2',1950,1850,2100,1900,'{"2026":{"spring":{"weekday":1850,"weekend":2050},"summer":{"weekday":2100,"weekend":2300},"fall":{"weekday":1900,"weekend":2100}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Villa D''Arte','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Villa','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/villas','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Villa D''Arte: largest villa residence with extended patio for groups; part of seven-villa inventory.$$,'Resort cites 7 villas total; only named villas on web at time of research.','2026-05-18','2026-05-18','private_commercial',400,1,'8',2500,2350,2750,2450,'{"2026":{"spring":{"weekday":2350,"weekend":2650},"summer":{"weekday":2750,"weekend":3050},"fall":{"weekday":2450,"weekend":2750}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Villa Dalis','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Villa','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/villas','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Villa Dalis: newer villa residence positioned for nature immersion and celebration stays.$$,'Package pricing.','2026-05-18','2026-05-18','private_commercial',400,1,'6',2400,2250,2650,2350,'{"2026":{"spring":{"weekday":2250,"weekend":2550},"summer":{"weekday":2650,"weekend":2950},"fall":{"weekday":2350,"weekend":2650}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','Zen Villa','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Villa','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/villas','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$Zen Villa: villa tier emphasizing serene desert setting and private terrace.$$,'Package pricing.','2026-05-18','2026-05-18','private_commercial',400,1,'4',2300,2150,2550,2250,'{"2026":{"spring":{"weekday":2150,"weekend":2450},"summer":{"weekday":2550,"weekend":2850},"fall":{"weekday":2250,"weekend":2550}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','The Solace Retreat (Studio)','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Retreat','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/the-retreats','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$The Solace Retreat (Studio): king or double-queen studio with indoor-outdoor shower, hot tub, and outdoor fire feature.$$,'Book via Miraval Experience Planner (877.264.1892) per operator.','2026-05-18','2026-05-18','private_commercial',400,1,'2',2100,2000,2300,2050,'{"2026":{"spring":{"weekday":2000,"weekend":2200},"summer":{"weekday":2300,"weekend":2500},"fall":{"weekday":2050,"weekend":2250}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','The Reflection Retreat (1 BR)','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Retreat','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/the-retreats','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$The Reflection Retreat (1 BR): one-bedroom modular retreat; phone booking only per operator footnote.$$,'Not available for online booking per resort site.','2026-05-18','2026-05-18','private_commercial',400,1,'2',2200,2100,2400,2150,'{"2026":{"spring":{"weekday":2100,"weekend":2300},"summer":{"weekday":2400,"weekend":2600},"fall":{"weekday":2150,"weekend":2350}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('942e7820-12d2-4bf8-b313-d38a469fb53c','in_progress','Yes','Yes','Miraval Arizona Resort & Spa','The Gratitude Retreat (3 BR)','miraval-arizona-resort-spa-tucson-az','Landscape Hotel','Retreat','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Tucson','5000 E Via Estancia Miraval, Tucson, AZ 85739',32.304,-110.688,'https://www.miravalresorts.com/arizona/stay-with-us/accommodations/the-retreats','+1-877-252-6585',$$Sibling — Miraval Arizona.$$,$$The Gratitude Retreat (3 BR): three-bedroom retreat with shared great room, kitchen, pool, and mountain views for groups.$$,'Sleeps up to ~6+ depending on configuration; verify with planner.','2026-05-18','2026-05-18','private_commercial',400,1,'6',2800,2650,3100,2750,'{"2026":{"spring":{"weekday":2650,"weekend":2950},"summer":{"weekday":3100,"weekend":3400},"fall":{"weekday":2750,"weekend":3050}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes');

-- ========== SANCTUARY CAMELBACK (anchor id 11944, property_id 88e06654-0367-42e7-b99b-1f961fb403be) ==========
UPDATE public.all_glamping_properties SET
  url = 'https://gurneys.com/sanctuary-camelback/',
  phone_number = '+1-480-948-2100',
  property_total_sites = 109,
  site_name = 'Signature Casita',
  unit_type = 'Casita',
  quantity_of_units = 1,
  unit_capacity = '2',
  property_pool = 'Yes',
  property_food_on_site = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_wifi = 'Yes',
  setting_desert = 'Yes',
  activities_hiking = 'Yes',
  description = $$Sanctuary Camelback Mountain, A Gurney''s Resort (Paradise Valley AZ): iconic Camelback Mountain resort with freestanding casitas and spa villas, multiple pools, spa, and fine dining—red-rock/desert-luxury comp to Ambiente Sedona.$$,
  unit_description = $$Signature Casita: standalone casita accommodation with desert-mountain views and private outdoor space (category per Gurney''s / legacy Sanctuary inventory).$$,
  notes = COALESCE(notes, '') || E'\n\nUnit enrichment (May 2026): Gurney''s resort page + historical Sanctuary room taxonomy. Sample OTA shoulder ~$750–1,200/night for casitas—verify on gurneys.com booking engine.',
  discovery_source = 'web_research_2026_05_landscape_hotels_units',
  date_updated = '2026-05-18',
  rate_avg_retail_daily_rate = 925,
  rate_spring_weekday = 850,
  rate_summer_weekday = 1050,
  rate_fall_weekday = 900,
  rate_unit_rates_by_year = '{"2026":{"spring":{"weekday":850,"weekend":950},"summer":{"weekday":1050,"weekend":1200},"fall":{"weekday":900,"weekend":1000}}}'::jsonb
WHERE id = 11944;

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity,
  rate_avg_retail_daily_rate, rate_spring_weekday, rate_summer_weekday, rate_fall_weekday,
  rate_unit_rates_by_year,
  unit_private_bathroom, unit_wifi, property_pool, property_food_on_site, setting_desert, activities_hiking
) VALUES
('88e06654-0367-42e7-b99b-1f961fb403be','in_progress','Yes','Yes','Sanctuary Camelback Mountain, A Gurney''s Resort','Spa Casita','sanctuary-camelback-mountain-paradise-valley-az','Landscape Hotel','Casita','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Paradise Valley','5700 E McDonald Dr, Paradise Valley, AZ 85253',33.516,-111.942,'https://gurneys.com/sanctuary-camelback/','+1-480-948-2100',$$Sibling — Sanctuary Camelback (anchor id 11944).$$,$$Spa Casita: casita category with spa-oriented bath and outdoor living space.$$,'Verify Gurney''s category naming on booking.','2026-05-18','2026-05-18','private_commercial',109,1,'2',975,900,1100,950,'{"2026":{"spring":{"weekday":900,"weekend":1000},"summer":{"weekday":1100,"weekend":1250},"fall":{"weekday":950,"weekend":1050}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('88e06654-0367-42e7-b99b-1f961fb403be','in_progress','Yes','Yes','Sanctuary Camelback Mountain, A Gurney''s Resort','Deluxe Casita','sanctuary-camelback-mountain-paradise-valley-az','Landscape Hotel','Casita','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Paradise Valley','5700 E McDonald Dr, Paradise Valley, AZ 85253',33.516,-111.942,'https://gurneys.com/sanctuary-camelback/','+1-480-948-2100',$$Sibling — Sanctuary Camelback.$$,$$Deluxe Casita: upgraded casita tier with enhanced views or layout per legacy resort map.$$,'Sample rate tiering approximate.','2026-05-18','2026-05-18','private_commercial',109,1,'2',1025,950,1150,1000,'{"2026":{"spring":{"weekday":950,"weekend":1050},"summer":{"weekday":1150,"weekend":1300},"fall":{"weekday":1000,"weekend":1100}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('88e06654-0367-42e7-b99b-1f961fb403be','in_progress','Yes','Yes','Sanctuary Camelback Mountain, A Gurney''s Resort','Premium Casita','sanctuary-camelback-mountain-paradise-valley-az','Landscape Hotel','Casita','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Paradise Valley','5700 E McDonald Dr, Paradise Valley, AZ 85253',33.516,-111.942,'https://gurneys.com/sanctuary-camelback/','+1-480-948-2100',$$Sibling — Sanctuary Camelback.$$,$$Premium Casita: upper-tier casita with prime Camelback or valley sightlines.$$,'Verify live inventory labels.','2026-05-18','2026-05-18','private_commercial',109,1,'2',1100,1025,1250,1075,'{"2026":{"spring":{"weekday":1025,"weekend":1125},"summer":{"weekday":1250,"weekend":1400},"fall":{"weekday":1075,"weekend":1175}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('88e06654-0367-42e7-b99b-1f961fb403be','in_progress','Yes','Yes','Sanctuary Camelback Mountain, A Gurney''s Resort','Spa Villa','sanctuary-camelback-mountain-paradise-valley-az','Landscape Hotel','Villa','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Paradise Valley','5700 E McDonald Dr, Paradise Valley, AZ 85253',33.516,-111.942,'https://gurneys.com/sanctuary-camelback/','+1-480-948-2100',$$Sibling — Sanctuary Camelback.$$,$$Spa Villa: multi-room villa product with expanded indoor-outdoor spa bath experience.$$,'Higher ADR tier than casitas.','2026-05-18','2026-05-18','private_commercial',109,1,'4',1350,1250,1550,1300,'{"2026":{"spring":{"weekday":1250,"weekend":1400},"summer":{"weekday":1550,"weekend":1750},"fall":{"weekday":1300,"weekend":1450}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('88e06654-0367-42e7-b99b-1f961fb403be','in_progress','Yes','Yes','Sanctuary Camelback Mountain, A Gurney''s Resort','Paradise Villa','sanctuary-camelback-mountain-paradise-valley-az','Landscape Hotel','Villa','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Paradise Valley','5700 E McDonald Dr, Paradise Valley, AZ 85253',33.516,-111.942,'https://gurneys.com/sanctuary-camelback/','+1-480-948-2100',$$Sibling — Sanctuary Camelback.$$,$$Paradise Villa: premium villa accommodation with enhanced privacy and desert-luxury positioning.$$,'Verify unit count with Gurney''s.','2026-05-18','2026-05-18','private_commercial',109,1,'4',1450,1350,1650,1400,'{"2026":{"spring":{"weekday":1350,"weekend":1500},"summer":{"weekday":1650,"weekend":1850},"fall":{"weekday":1400,"weekend":1550}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('88e06654-0367-42e7-b99b-1f961fb403be','in_progress','Yes','Yes','Sanctuary Camelback Mountain, A Gurney''s Resort','Governor''s Suite','sanctuary-camelback-mountain-paradise-valley-az','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','AZ','Paradise Valley','5700 E McDonald Dr, Paradise Valley, AZ 85253',33.516,-111.942,'https://gurneys.com/sanctuary-camelback/','+1-480-948-2100',$$Sibling — Sanctuary Camelback.$$,$$Governor''s Suite: top-tier suite product in legacy Sanctuary inventory with expanded living space.$$,'Limited inventory; confirm availability with resort.','2026-05-18','2026-05-18','private_commercial',109,1,'4',1650,1550,1850,1600,'{"2026":{"spring":{"weekday":1550,"weekend":1750},"summer":{"weekday":1850,"weekend":2050},"fall":{"weekday":1600,"weekend":1800}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes');

-- ========== AMANGANI (anchor id 11945, property_id 438f4830-dedf-4b35-a708-dfb24b3d8a25) ==========
UPDATE public.all_glamping_properties SET
  url = 'https://www.aman.com/resorts/amangani/accommodation/suites',
  phone_number = '+1-307-734-7333',
  property_total_sites = 40,
  site_name = 'Grand Teton Suite',
  unit_type = 'Suite',
  quantity_of_units = 1,
  unit_capacity = '2',
  property_pool = 'Yes',
  property_food_on_site = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_wifi = 'Yes',
  setting_mountainous = 'Yes',
  activities_hiking = 'Yes',
  description = $$Amangani (Jackson Hole WY): Aman mountain resort on a butte above Jackson with wood-and-stone suites, all with terraces/balconies and Teton views—landscape-integrated luxury lodge comp to Amangiri/Ambiente.$$,
  unit_description = $$Grand Teton Suite: signature suite category with floor-to-ceiling windows, fireplace, and Grand Teton views per Aman listing.$$,
  notes = COALESCE(notes, '') || E'\n\nUnit enrichment (May 2026): aman.com/resorts/amangani/accommodation/suites. Sample shoulder suite rates ~$1,800–$4,000+/night (luxury OTA summaries)—verify with Aman reservations.',
  discovery_source = 'web_research_2026_05_landscape_hotels_units',
  date_updated = '2026-05-18',
  rate_avg_retail_daily_rate = 2450,
  rate_spring_weekday = 2200,
  rate_summer_weekday = 2850,
  rate_fall_weekday = 2350,
  rate_unit_rates_by_year = '{"2026":{"spring":{"weekday":2200,"weekend":2500},"summer":{"weekday":2850,"weekend":3200},"fall":{"weekday":2350,"weekend":2650}}}'::jsonb
WHERE id = 11945;

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity,
  rate_avg_retail_daily_rate, rate_spring_weekday, rate_summer_weekday, rate_fall_weekday,
  rate_unit_rates_by_year,
  unit_private_bathroom, unit_wifi, property_pool, property_food_on_site, setting_mountainous, activities_hiking
) VALUES
('438f4830-dedf-4b35-a708-dfb24b3d8a25','in_progress','Yes','Yes','Amangani','Spring Gulch Suite','amangani-jackson-wy','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','WY','Jackson','6835 N Cache St, Jackson, WY 83001',43.479,-110.762,'https://www.aman.com/resorts/amangani/accommodation/suites/spring-gulch-suite','+1-307-734-7333',$$Sibling — Amangani (anchor id 11945).$$,$$Spring Gulch Suite: suite tier with mountain views and Aman wood-stone interiors.$$,'Rate tier approximate.','2026-05-18','2026-05-18','private_commercial',40,1,'2',2350,2100,2750,2250,'{"2026":{"spring":{"weekday":2100,"weekend":2400},"summer":{"weekday":2750,"weekend":3100},"fall":{"weekday":2250,"weekend":2550}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('438f4830-dedf-4b35-a708-dfb24b3d8a25','in_progress','Yes','Yes','Amangani','Amangani Suite','amangani-jackson-wy','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','WY','Jackson','6835 N Cache St, Jackson, WY 83001',43.479,-110.762,'https://www.aman.com/resorts/amangani/accommodation/suites/amangani-suite','+1-307-734-7333',$$Sibling — Amangani.$$,$$Amangani Suite: namesake suite category with expansive living space and Teton outlook.$$,'Verify seasonal closure windows with Aman.','2026-05-18','2026-05-18','private_commercial',40,1,'2',2550,2300,2950,2450,'{"2026":{"spring":{"weekday":2300,"weekend":2600},"summer":{"weekday":2950,"weekend":3300},"fall":{"weekday":2450,"weekend":2750}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('438f4830-dedf-4b35-a708-dfb24b3d8a25','in_progress','Yes','Yes','Amangani','Shoshone Suite','amangani-jackson-wy','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','WY','Jackson','6835 N Cache St, Jackson, WY 83001',43.479,-110.762,'https://www.aman.com/resorts/amangani/accommodation/suites/shoshone-suite','+1-307-734-7333',$$Sibling — Amangani.$$,$$Shoshone Suite: suite tier named for regional Shoshone heritage and mountain vistas.$$,'Rate tier approximate.','2026-05-18','2026-05-18','private_commercial',40,1,'2',2250,2000,2650,2150,'{"2026":{"spring":{"weekday":2000,"weekend":2300},"summer":{"weekday":2650,"weekend":3000},"fall":{"weekday":2150,"weekend":2450}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('438f4830-dedf-4b35-a708-dfb24b3d8a25','in_progress','Yes','Yes','Amangani','Gros Ventre Suite','amangani-jackson-wy','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','WY','Jackson','6835 N Cache St, Jackson, WY 83001',43.479,-110.762,'https://www.aman.com/resorts/amangani/accommodation/suites/gros-ventre-suite','+1-307-734-7333',$$Sibling — Amangani.$$,$$Gros Ventre Suite: suite tier with views toward the Gros Ventre range.$$,'Rate tier approximate.','2026-05-18','2026-05-18','private_commercial',40,1,'2',2300,2050,2700,2200,'{"2026":{"spring":{"weekday":2050,"weekend":2350},"summer":{"weekday":2700,"weekend":3050},"fall":{"weekday":2200,"weekend":2500}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('438f4830-dedf-4b35-a708-dfb24b3d8a25','in_progress','Yes','Yes','Amangani','Superior Suite','amangani-jackson-wy','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','WY','Jackson','6835 N Cache St, Jackson, WY 83001',43.479,-110.762,'https://www.aman.com/resorts/amangani/accommodation/suites/superior-suite','+1-307-734-7333',$$Sibling — Amangani.$$,$$Superior Suite: mid-tier suite with terrace/balcony and mountain panorama.$$,'Rate tier approximate.','2026-05-18','2026-05-18','private_commercial',40,1,'2',2150,1900,2600,2100,'{"2026":{"spring":{"weekday":1900,"weekend":2200},"summer":{"weekday":2600,"weekend":2950},"fall":{"weekday":2100,"weekend":2400}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes'),
('438f4830-dedf-4b35-a708-dfb24b3d8a25','in_progress','Yes','Yes','Amangani','Deluxe Suite','amangani-jackson-wy','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','WY','Jackson','6835 N Cache St, Jackson, WY 83001',43.479,-110.762,'https://www.aman.com/resorts/amangani/accommodation/suites/deluxe-suite','+1-307-734-7333',$$Sibling — Amangani.$$,$$Deluxe Suite: entry suite tier with Aman wood-stone finishes and mountain views.$$,'Rate tier approximate.','2026-05-18','2026-05-18','private_commercial',40,1,'2',1950,1750,2400,1900,'{"2026":{"spring":{"weekday":1750,"weekend":2050},"summer":{"weekday":2400,"weekend":2750},"fall":{"weekday":1900,"weekend":2200}}}'::jsonb,'Yes','Yes','Yes','Yes','Yes','Yes','Yes');

-- ========== AWOL KENNEBUNKPORT (anchor id 11946, property_id b3069c0a-c040-43d8-acad-efffdeb0bf2e) ==========
UPDATE public.all_glamping_properties SET
  url = 'https://www.larkhotels.com/hotels/awol-kennebunkport',
  phone_number = '+1-207-967-9000',
  property_total_sites = 6,
  site_name = 'Cabin Studio',
  unit_type = 'Cabin',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_private_bathroom = 'Yes',
  unit_wifi = 'Yes',
  unit_campfires = 'Yes',
  setting_forest = 'Yes',
  description = $$AWOL Kennebunkport (ME): Lark Hotels woodland boutique minutes from Dock Square with cabin studios, deluxe cabins, and suites featuring Japanese soaking tubs, fireplaces, and pine-birch setting—Room + Wild landscape hotel.$$,
  unit_description = $$Cabin Studio: entry cabin studio with hardwood floors, king bed, and private patio per Lark positioning.$$,
  notes = COALESCE(notes, '') || E'\n\nUnit enrichment (May 2026): larkhotels.com/awol-kennebunkport + Room + Wild. Sample shoulder ~$275–450/night (Lark/OTA seasonal)—verify live booking.',
  discovery_source = 'web_research_2026_05_landscape_hotels_units',
  date_updated = '2026-05-18',
  rate_avg_retail_daily_rate = 325,
  rate_spring_weekday = 275,
  rate_summer_weekday = 425,
  rate_fall_weekday = 300,
  rate_unit_rates_by_year = '{"2026":{"spring":{"weekday":275,"weekend":325},"summer":{"weekday":425,"weekend":495},"fall":{"weekday":300,"weekend":375}}}'::jsonb
WHERE id = 11946;

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity,
  rate_avg_retail_daily_rate, rate_spring_weekday, rate_summer_weekday, rate_fall_weekday,
  rate_unit_rates_by_year,
  unit_private_bathroom, unit_wifi, unit_campfires, setting_forest
) VALUES
('b3069c0a-c040-43d8-acad-efffdeb0bf2e','in_progress','Yes','Yes','AWOL Kennebunkport','Deluxe Cabin','awol-kennebunkport-me','Landscape Hotel','Cabin','Sage','web_research_2026_05_landscape_hotels_units','United States','ME','Kennebunkport','140 North St, Kennebunkport, ME 04043',43.362,-70.477,'https://www.larkhotels.com/hotels/awol-kennebunkport','+1-207-967-9000',$$Sibling — AWOL Kennebunkport (anchor id 11946).$$,$$Deluxe Cabin: upgraded cabin with enhanced finishes and outdoor living per Lark Hotels.$$,'Verify unit count with Lark.','2026-05-18','2026-05-18','private_commercial',6,1,'2',375,325,475,350,'{"2026":{"spring":{"weekday":325,"weekend":375},"summer":{"weekday":475,"weekend":550},"fall":{"weekday":350,"weekend":425}}}'::jsonb,'Yes','Yes','Yes','Yes'),
('b3069c0a-c040-43d8-acad-efffdeb0bf2e','in_progress','Yes','Yes','AWOL Kennebunkport','Cabin Suite','awol-kennebunkport-me','Landscape Hotel','Cabin','Sage','web_research_2026_05_landscape_hotels_units','United States','ME','Kennebunkport','140 North St, Kennebunkport, ME 04043',43.362,-70.477,'https://www.larkhotels.com/hotels/awol-kennebunkport','+1-207-967-9000',$$Sibling — AWOL Kennebunkport.$$,$$Cabin Suite: larger cabin layout with lounge seating and fireplace per property descriptions.$$,'Rate tier approximate.','2026-05-18','2026-05-18','private_commercial',6,1,'2',425,375,525,400,'{"2026":{"spring":{"weekday":375,"weekend":425},"summer":{"weekday":525,"weekend":595},"fall":{"weekday":400,"weekend":475}}}'::jsonb,'Yes','Yes','Yes','Yes'),
('b3069c0a-c040-43d8-acad-efffdeb0bf2e','in_progress','Yes','Yes','AWOL Kennebunkport','Signature Suite','awol-kennebunkport-me','Landscape Hotel','Suite','Sage','web_research_2026_05_landscape_hotels_units','United States','ME','Kennebunkport','140 North St, Kennebunkport, ME 04043',43.362,-70.477,'https://www.larkhotels.com/hotels/awol-kennebunkport','+1-207-967-9000',$$Sibling — AWOL Kennebunkport.$$,$$Signature Suite: top tier with Japanese soaking tub, walk-in shower, king bed, and private patio (per Lark/Room + Wild copy).$$,'Highest ADR tier.','2026-05-18','2026-05-18','private_commercial',6,1,'2',495,425,595,475,'{"2026":{"spring":{"weekday":425,"weekend":495},"summer":{"weekday":595,"weekend":695},"fall":{"weekday":475,"weekend":550}}}'::jsonb,'Yes','Yes','Yes','Yes');
