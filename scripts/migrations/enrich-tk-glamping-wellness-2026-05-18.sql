-- TK Glamping and Wellness (Vernon BC): property enrichment + 5 named tent site rows.
-- Sources: whale-goose-jny9.squarespace.com, /glampingtentrates (May 2026).

UPDATE public.all_glamping_properties SET
  property_name = 'TK Glamping and Wellness',
  site_name = 'Bears Den',
  url = 'https://whale-goose-jny9.squarespace.com/glampingtentrates',
  city = 'Vernon',
  state = 'BC',
  country = 'Canada',
  lat = 50.267,
  lon = -119.272,
  is_open = 'Yes',
  research_status = 'published',
  property_type = 'Glamping Resort',
  unit_type = 'Bell Tent',
  property_total_sites = 5,
  quantity_of_units = 1,
  minimum_nights = '2',
  operating_season_months = 'Spring–fall (weather-dependent spring; summer from July 1; fall through mid-Oct; no winter 2026–27)',
  season_open_month = 4,
  season_close_month = 10,
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  property_food_on_site = 'Yes',
  setting_forest = 'Yes',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  description = $$TK Glamping & Wellness — adults-oriented North Okanagan glamping on unceded Okanagan Indian Band (Syilx) territory near Vernon BC. Five individually priced hard-wall bell tents (Bears Den, Muskrat Lodge, Weasel Burrow, Coyote Den, Beaver Lodge) with private vanity suites, shared shower facilities, European breakfast included, wellness programming, and optional regional activity booking/shuttle services.$$,
  unit_description = $$Bears Den: named glamping bell tent with private vanity bathroom, bed linens/towels supplied, minimum 2-night stay; website seasonal rates (Spring/Summer/Fall).$$,
  notes = COALESCE(notes, '') || E'\n\nSite enrichment (May 2026): 5 tent SKUs + website rate sheet at /glampingtentrates. Contact: info@tkglamping.com. 2-night min; weekdays Mon–Thu / weekends Fri–Sun; summer rates from July 1; spring weather-dependent; winter not offered 2026–27. Breakfast included (allergies not accommodated per site).',
  amenities_raw = 'Per operator site: private vanity suite per tent, shared + seasonal outdoor shower, linens/towels, European breakfast (8–10am), common dining option, picnic lunches on request, activity booking concierge, shuttle services (extra fee). Cultural programming on OKIB lands.',
  discovery_source = 'web_research_tk_site_2026_05',
  date_updated = '2026-05-18',
  land_operator_category = 'private_commercial',
  rate_spring_weekday = 380,
  rate_summer_weekday = 395,
  rate_fall_weekday = 380,
  rate_avg_retail_daily_rate = 385,
  rate_unit_rates_by_year = '{"2026":{"spring":{"weekday":380,"weekend":380},"summer":{"weekday":395,"weekend":395},"fall":{"weekday":380,"weekend":380}}}'::jsonb
WHERE id = 11840;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  lat, lon, url,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, minimum_nights,
  operating_season_months, season_open_month, season_close_month,
  unit_private_bathroom, unit_shower, property_food_on_site,
  setting_forest, activities_hiking, activities_wildlife_watching,
  amenities_raw,
  rate_spring_weekday, rate_summer_weekday, rate_fall_weekday,
  rate_avg_retail_daily_rate, rate_unit_rates_by_year
) VALUES
(
  'published', 'Yes', 'Yes',
  'TK Glamping and Wellness', 'Muskrat Lodge',
  'tk-glamping-wellness-vernon', 'Glamping Resort', 'Bell Tent',
  'Sage', 'web_research_tk_site_2026_05', 'Canada', 'BC', 'Vernon',
  50.267, -119.272, 'https://whale-goose-jny9.squarespace.com/glampingtentrates',
  $$Sibling site — TK Glamping & Wellness (Vernon BC). See anchor row id 11840.$$,
  $$Muskrat Lodge: glamping bell tent with private vanity bathroom; website seasonal rates Spring $380 / Summer $395 / Fall $380 CAD per night.$$,
  $$Website rate sheet (May 2026). Book via inquiry form on glampingtentrates.$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  5, 1, '2', 'Spring–fall (see property row)', 4, 10,
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Private vanity suite; breakfast included.',
  380, 395, 380, 385,
  '{"2026":{"spring":{"weekday":380,"weekend":380},"summer":{"weekday":395,"weekend":395},"fall":{"weekday":380,"weekend":380}}}'::jsonb
),
(
  'published', 'Yes', 'Yes',
  'TK Glamping and Wellness', 'Weasel Burrow',
  'tk-glamping-wellness-vernon', 'Glamping Resort', 'Bell Tent',
  'Sage', 'web_research_tk_site_2026_05', 'Canada', 'BC', 'Vernon',
  50.267, -119.272, 'https://whale-goose-jny9.squarespace.com/glampingtentrates',
  $$Sibling site — TK Glamping & Wellness (Vernon BC).$$,
  $$Weasel Burrow: glamping bell tent with private vanity bathroom; website seasonal rates Spring $325 / Summer $365 / Fall $325 CAD per night.$$,
  $$Lower-priced tent tier on 2026 website rate sheet.$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  5, 1, '2', 'Spring–fall (see property row)', 4, 10,
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Private vanity suite; breakfast included.',
  325, 365, 325, 338,
  '{"2026":{"spring":{"weekday":325,"weekend":325},"summer":{"weekday":365,"weekend":365},"fall":{"weekday":325,"weekend":325}}}'::jsonb
),
(
  'published', 'Yes', 'Yes',
  'TK Glamping and Wellness', 'Coyote Den',
  'tk-glamping-wellness-vernon', 'Glamping Resort', 'Bell Tent',
  'Sage', 'web_research_tk_site_2026_05', 'Canada', 'BC', 'Vernon',
  50.267, -119.272, 'https://whale-goose-jny9.squarespace.com/glampingtentrates',
  $$Sibling site — TK Glamping & Wellness (Vernon BC).$$,
  $$Coyote Den: glamping bell tent with private vanity bathroom; website seasonal rates Spring $380 / Summer $395 / Fall $380 CAD per night.$$,
  $$Website rate sheet (May 2026).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  5, 1, '2', 'Spring–fall (see property row)', 4, 10,
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Private vanity suite; breakfast included.',
  380, 395, 380, 385,
  '{"2026":{"spring":{"weekday":380,"weekend":380},"summer":{"weekday":395,"weekend":395},"fall":{"weekday":380,"weekend":380}}}'::jsonb
),
(
  'published', 'Yes', 'Yes',
  'TK Glamping and Wellness', 'Beaver Lodge',
  'tk-glamping-wellness-vernon', 'Glamping Resort', 'Bell Tent',
  'Sage', 'web_research_tk_site_2026_05', 'Canada', 'BC', 'Vernon',
  50.267, -119.272, 'https://whale-goose-jny9.squarespace.com/glampingtentrates',
  $$Sibling site — TK Glamping & Wellness (Vernon BC).$$,
  $$Beaver Lodge: glamping bell tent with private vanity bathroom; website seasonal rates Spring $395 / Summer $425 / Fall $395 CAD per night (premium tier).$$,
  $$Highest website rate tier (May 2026).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  5, 1, '2', 'Spring–fall (see property row)', 4, 10,
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Private vanity suite; breakfast included.',
  395, 425, 395, 405,
  '{"2026":{"spring":{"weekday":395,"weekend":395},"summer":{"weekday":425,"weekend":425},"fall":{"weekday":395,"weekend":395}}}'::jsonb
);

-- Ensure sibling rate_avg persisted (INSERT trigger quirk on some rows).
UPDATE public.all_glamping_properties SET
  rate_avg_retail_daily_rate = 385,
  rate_spring_weekday = 380, rate_summer_weekday = 395, rate_fall_weekday = 380
WHERE slug = 'tk-glamping-wellness-vernon' AND site_name = 'Muskrat Lodge';

UPDATE public.all_glamping_properties SET
  rate_avg_retail_daily_rate = 338,
  rate_spring_weekday = 325, rate_summer_weekday = 365, rate_fall_weekday = 325
WHERE slug = 'tk-glamping-wellness-vernon' AND site_name = 'Weasel Burrow';

UPDATE public.all_glamping_properties SET
  rate_avg_retail_daily_rate = 385,
  rate_spring_weekday = 380, rate_summer_weekday = 395, rate_fall_weekday = 380
WHERE slug = 'tk-glamping-wellness-vernon' AND site_name = 'Coyote Den';

UPDATE public.all_glamping_properties SET
  rate_avg_retail_daily_rate = 405,
  rate_spring_weekday = 395, rate_summer_weekday = 425, rate_fall_weekday = 395
WHERE slug = 'tk-glamping-wellness-vernon' AND site_name = 'Beaver Lodge';
