-- Rice Ranch RV Park — Quartzsite, AZ (May 2026 web research).
-- Sources: riceranchrvpark.com, bookingsus.newbook.cloud/online/rice_ranch
-- Property type: RV Park (new canonical type).
-- Safe to re-run (NOT EXISTS on slug).

INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, notes)
VALUES (
  'rice-ranch-rv-park',
  'Rice Ranch RV Park',
  'standalone',
  'rice ranch rv park',
  'https://www.riceranchrvpark.com/',
  'Full-hookup RV park in Quartzsite, AZ with pickleball, dog park, Boondockers General Store, and seasonal desert basecamp stays.'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = COALESCE(EXCLUDED.website_url, glamping_brands.website_url),
  notes = EXCLUDED.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Site inventory (5 Newbook categories)
-- ---------------------------------------------------------------------------
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, phone_number,
  brand_id, unit_capacity, unit_pets,
  rv_water_hookup, rv_sewer_hook_up, rv_electrical_hook_up,
  rv_vehicles_class_a_rvs, rv_vehicles_class_c_rvs, rv_vehicles_fifth_wheels,
  rv_vehicles_toy_hauler, rv_accommodates_slideout, rv_surface_level,
  property_dog_park, property_general_store,
  setting_desert, activities_hiking,
  land_operator_category,
  unit_description, amenities_raw,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_winter_weekday,
  rate_unit_rates_by_year,
  date_added, date_updated, notes
)
SELECT
  'a8f3c2e1-4b5d-4a9e-8f1c-2d6e7b9a0c3d'::uuid,
  'published', 'No', 'Yes',
  'Rice Ranch RV Park', v.site_name, v.slug, 'RV Park', 'RV Site',
  'Sage', 'web_research_rice_ranch_rv_park_2026_05_29',
  'United States', 'AZ', 'Quartzsite',
  '55 Kuehn St, Quartzsite, AZ 85346', '85346',
  33.6583357::numeric, -114.2154644::numeric,
  'https://bookingsus.newbook.cloud/online/rice_ranch', '+1-928-916-0271',
  b.id, v.capacity, 'Yes',
  'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes',
  'Yes', 'Yes',
  'private_commercial',
  v.unit_desc, v.amenities,
  v.rate::numeric, v.rate::numeric, 59::numeric,
  v.rate_json::jsonb,
  '2026-05-29', '2026-05-29',
  'May 2026: Site row from Newbook / riceranchrvpark.com sites & pricing.'
FROM (VALUES
  (
    'XXL Pull-Through RV Site', 'rice-ranch-rv-park-az',
    '8',
    '100x50 pull-through; 50/20/20A electric; water and sewer (FHU). Largest rig sites; call park for XXL availability.',
    'XXL pull-through; 50/20/20A; water; sewer; level pad; up to 8 guests; 3 pets max.',
    35,
    '{"2026":{"source":"riceranchrvpark.com_and_newbook_may_2026","currency":"USD","newbook_standard_nightly":35,"newbook_weekly_nightly":30,"daily_starting_peak_oct_apr":35,"daily_starting_january":59,"xxl_note":"Phone booking per Newbook for XXL category"}}'
  ),
  (
    'XL Pull-Through RV Site', 'rice-ranch-rv-park-az-xl-pull-through',
    '8',
    'Spacious pull-through full-hookup site for large rigs; easy access and outdoor seating area.',
    'XL pull-through FHU; water; sewer; electric; pickleball and dog park on property.',
    35,
    '{"2026":{"source":"riceranchrvpark.com_and_newbook_may_2026","currency":"USD","newbook_standard_nightly":35,"newbook_weekly_nightly":30,"daily_starting_peak_oct_apr":35,"daily_starting_january":59}}'
  ),
  (
    'Large Back-In RV Site', 'rice-ranch-rv-park-az-large-back-in',
    '8',
    'Large back-in FHU site with level ground and room for outdoor seating; fits most rig sizes.',
    'Large back-in FHU; water; sewer; electric; communal amenities.',
    35,
    '{"2026":{"source":"riceranchrvpark.com_and_newbook_may_2026","currency":"USD","newbook_standard_nightly":35,"newbook_weekly_nightly":30,"daily_starting_peak_oct_apr":35,"daily_starting_january":59}}'
  ),
  (
    '30 AMP Pull-Through', 'rice-ranch-rv-park-az-30amp-pull-through',
    '8',
    'Full-hookup pull-through suited to truck campers, vans, and smaller rigs (30A service).',
    '30A pull-through FHU; truck camper and van friendly.',
    35,
    '{"2026":{"source":"riceranchrvpark.com_and_newbook_may_2026","currency":"USD","newbook_standard_nightly":35,"newbook_weekly_nightly":30,"daily_starting_peak_oct_apr":35,"daily_starting_january":59}}'
  ),
  (
    'Slim Back-In RV Site', 'rice-ranch-rv-park-az-slim-back-in',
    '8',
    'Compact back-in FHU site for smaller RVs and truck campers.',
    'Slim back-in FHU; ideal for smaller rigs and vans.',
    35,
    '{"2026":{"source":"riceranchrvpark.com_and_newbook_may_2026","currency":"USD","newbook_standard_nightly":35,"newbook_weekly_nightly":30,"daily_starting_peak_oct_apr":35,"daily_starting_january":59}}'
  )
) AS v(site_name, slug, capacity, unit_desc, amenities, rate, rate_json)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'rice-ranch-rv-park'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug
  );

UPDATE public.all_glamping_properties SET
  description = 'Rice Ranch RV Park in Quartzsite, Arizona is a full-hookup desert basecamp with pull-through and back-in sites, pickleball, a dog park, on-site Boondockers General Store, and RV storage. Under new management (Todd and Dawn Turner). Gateway to Quartzsite markets and desert recreation.',
  url = 'https://www.riceranchrvpark.com/'
WHERE property_id = 'a8f3c2e1-4b5d-4a9e-8f1c-2d6e7b9a0c3d'::uuid;
