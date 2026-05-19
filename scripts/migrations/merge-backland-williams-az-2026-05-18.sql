-- Merge duplicate Backland records (Williams, AZ) into one property with four named site rows.
-- Removes aggregate row id 10086 (Backland Glamping) and orphan id 11440 (Backland Luxury Camping).
-- Canonical property_id: a58938ca-5f23-4953-8074-aac8133c23f6 (site rows 9932–9935).
-- Source: travelbackland.com (May 2026).

UPDATE public.all_glamping_properties SET
  property_name = 'Backland',
  slug = 'backland-williams-az',
  url = 'https://www.travelbackland.com/',
  city = 'Williams',
  state = 'AZ',
  country = 'United States',
  zip_code = '86046',
  is_open = 'Yes',
  research_status = 'published',
  is_glamping_property = 'Yes',
  property_type = 'Glamping Resort',
  unit_type = 'Safari Tent',
  property_total_sites = 4,
  quantity_of_units = 1,
  operating_season_months = 'Year-round',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_campfires = 'Yes',
  property_family_friendly = 'Yes',
  setting_forest = 'Yes',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  description = $$Backland Luxury Nature Resort — a luxury eco-resort on 160 private acres at ~7,000 ft elevation near Williams, AZ (20 minutes from town, ~1 hr 10 min to Grand Canyon South Rim). Dark-sky lodging surrounded by Kaibab National Forest with climate-controlled glamping suites (panoramic windows, king beds, en-suite baths, private patios). On-site: 8-acre pond with beach (kayak/paddleboard), farm-to-table restaurant, spa tent, stargazing, trails, nightly fire pits. Last 8 miles via scenic Forest Service road (most vehicles; not motorcycles or ultra-low clearance). Booking: travelbackland.com.$$,
  notes = COALESCE(notes, '') || E'\n\nMerge (May 2026): Consolidated duplicate rows Backland Glamping (id 10086) and Backland Luxury Camping (id 11440) into four site rows under property_id a58938ca-5f23-4953-8074-aac8133c23f6. Operator URL https://www.travelbackland.com/ (not backland.com).',
  discovery_source = 'web_research_travelbackland_2026_05',
  date_updated = '2026-05-18',
  land_operator_category = 'private_commercial'
WHERE id IN (9932, 9933, 9934, 9935);

UPDATE public.all_glamping_properties SET
  site_name = 'Backland Suite'
WHERE id = 9935 AND site_name ILIKE 'backland suite';

UPDATE public.all_glamping_properties SET
  unit_description = 'Grand Sky Suite ADA: climate-controlled glamping suite with panoramic windows, king bed, en-suite bath, private patio; ADA-accessible. 6930 E Rosilda Springs Rd.'
WHERE id = 9932;

UPDATE public.all_glamping_properties SET
  unit_description = 'Sky Suite: climate-controlled glamping suite with 16-foot window above the king bed, en-suite bath, private patio. 6932 E Rosilda Springs Rd.'
WHERE id = 9933;

UPDATE public.all_glamping_properties SET
  unit_description = 'Grand Suite: climate-controlled glamping suite sleeps 4-6 (king, queen sofa bed, twin bunks), en-suite bath, private patio. 6931 E Rosilda Springs Rd.'
WHERE id = 9934;

UPDATE public.all_glamping_properties SET
  unit_description = 'Backland Suite: climate-controlled glamping suite with king bed, en-suite bath, private patio. 6929 E Rosilda Springs Rd.'
WHERE id = 9935;

DELETE FROM public.all_glamping_properties WHERE id IN (10086, 11440);

REFRESH MATERIALIZED VIEW public.unified_comps;
