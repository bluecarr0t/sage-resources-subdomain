-- Unit-type research (review before apply). Does not write by itself.
-- Properties: 11

-- #1 Rock Tavern River Kamp: set blank row to Yurt
UPDATE public.all_sage_data SET
  unit_type = 'Yurt',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Yurt' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Yurt — https://www.glamping.com/destination/north-america/virginia/luray/1-rock-tavern-river-kamp/ — "#1 Rock Tavern River Kamp''s primitive, riverfront campsite settings and yurts are just perfect for groups; relax with family and friends at this beautiful, Shenandoah River retreat."'
WHERE id = 12350
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Apple Creek Whitetails: set blank row to Lodge
UPDATE public.all_sage_data SET
  unit_type = 'Lodge',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Lodge' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Lodge — https://www.glamping.com/destination/north-america/wisconsin/gillett/apple-creek-whitetails/ — "The Apple Creek main hunting lodge is surrounded by the well-stocked trout ponds and is nestled in the center of the 1,500-acre whitetail hunting ranch."'
WHERE id = 12353
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Blue Bear Mountain Camp: set blank row to Dome
UPDATE public.all_sage_data SET
  unit_type = 'Dome',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Dome' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Dome — https://www.bluebearmountain.com/ — "Blue Bear Mountain also offers luxury Stargazer Domes and Cabin rentals to provide you with more choices of how to experience your mountain getaway."'
WHERE id = 10847
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Blue Bear Mountain Camp: add Cabin
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cabin',
  'site_name', 'Cabin',
  'quantity_of_units', NULL,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.bluebearmountain.com/ — "Blue Bear Mountain also offers luxury Stargazer Domes and Cabin rentals to provide you with more choices of how to experience your mountain getaway."'
))).*
FROM public.all_sage_data src
WHERE src.id = 10847;

-- Dunton Hot Springs: set blank row to Cabin
UPDATE public.all_sage_data SET
  unit_type = 'Cabin',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Cabin' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.duntondestinations.com/hot-springs — "All of Dunton’s authentically restored log cabins are full of fascinating details."'
WHERE id = 10842
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Galt Valley Artsy Tucked Away Retreat: set blank row to Cabin
UPDATE public.all_sage_data SET
  unit_type = 'Cabin',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Cabin' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.glamping.com/destination/north-america/colorado/basalt/galt-valley-artsy-tucked-away-retreat/ — "The accommodation is an eclectic mix of log cabin spiced with a unique and colorful artsy flair."'
WHERE id = 12315
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Langley Lodging: set blank row to Airstream
UPDATE public.all_sage_data SET
  unit_type = 'Airstream',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Airstream' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Airstream — https://www.glamping.com/destination/north-america/washington/langley/langley-lodging/ — "Langley Lodging also offers a gorgeous silver Airstream Cottage rental in Langley, Whidbey Island, Washington."'
WHERE id = 12351
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Loloma Lodge: set blank row to Lodge
UPDATE public.all_sage_data SET
  unit_type = 'Lodge',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Lodge' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Lodge — https://www.lolomalodge.com/ — "The Loloma Lodge, a 1930s gem, showcases impeccable craftsmanship and cozy vibes."'
WHERE id = 11627
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Pine Mountain Camp: set blank row to Lodge
UPDATE public.all_sage_data SET
  unit_type = 'Lodge',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Lodge' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Lodge — https://www.glamping.com/destination/north-america/california/lake-arrowhead/pine-mountain-camp/ — "Pine Mountain Camp is a GROUP CAMP ( **YOU RESERVE THE ENTIRE ESTATE**) that can accommodate up to 23 people within a master lodge, two small cabins and a tepee."'
WHERE id = 12309
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Pine Mountain Camp: add Cabin
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cabin',
  'site_name', 'Cabin',
  'quantity_of_units', NULL,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.glamping.com/destination/north-america/california/lake-arrowhead/pine-mountain-camp/ — "Pine Mountain Camp is a GROUP CAMP ( **YOU RESERVE THE ENTIRE ESTATE**) that can accommodate up to 23 people within a master lodge, two small cabins and a tepee."'
))).*
FROM public.all_sage_data src
WHERE src.id = 12309;

-- Somerset Resort: set blank row to Cabin
UPDATE public.all_sage_data SET
  unit_type = 'Cabin',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Cabin' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://somersetresort.com/ — "At Somerset Resort, uncover the allure of our luxurious cabins, each designed to offer an unforgettable camping experience where elegance and nature intertwine seamlessly."'
WHERE id = 11441
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- The Hideaway Ranch: set blank row to Cabin
UPDATE public.all_sage_data SET
  unit_type = 'Cabin',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Cabin' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.thehideawayranch.com/ — "The Hideaway offers ten private cabins—each tucked away and secluded for privacy and fully equipped with everything you need to relax."'
WHERE id = 12345
  AND (unit_type IS NULL OR btrim(unit_type) = '');

-- Wylder Hope Valley: set blank row to Cabin
UPDATE public.all_sage_data SET
  unit_type = 'Cabin',
  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN 'Hope Valley House' ELSE site_name END,
  date_updated = '2026-09-21',
  discovery_source = CASE
    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN discovery_source
    ELSE discovery_source || '; web_research_unit_type_2026_09'
  END,
  notes = COALESCE(notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.desolationhotel.com/hope-valley — "Situated right at the entrance to the campground, the Hope Valley House is our largest cabin, accommodating as many as ten."'
WHERE id = 10857
  AND (unit_type IS NULL OR btrim(unit_type) = '');
