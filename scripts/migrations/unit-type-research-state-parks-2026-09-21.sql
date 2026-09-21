-- Unit-type research (review before apply). Does not write by itself.
-- Properties: 15

-- Black Rock State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://portal.ct.gov/DEEP/State-Parks/Parks/Black-Rock-State-Park — "The Black Rock State Park Campground offers 78 campsites—some wooded, some open—and four rustic cabins within walking distance to the beach, fishing pond, recreation field, and hiking trails."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11774;

-- DeSoto State Park (Lodge & Chalets): add Cabin
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cabin',
  'site_name', 'Cabin',
  'quantity_of_units', 4,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin x 4 — https://www.alapark.com/parks/desoto-state-park — "DeSoto State Park has four (4) comfortable CCC rustic cabins surrounded by Northeast Alabama''s beautiful woodlands and mountainous terrain."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11696;

-- DeSoto State Park (Lodge & Chalets): add Chalet
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Chalet',
  'site_name', 'Chalet',
  'quantity_of_units', NULL,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Chalet — https://www.alapark.com/parks/desoto-state-park — "Escape to the mountains and unwind in one of our cozy A-Frame Chalets, nestled among the beautiful woodlands and scenic mountain views of Northeast Alabama."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11696;

-- Fall Creek Falls State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://tnstateparks.com/parks/fall-creek-falls — "Fall Creek Falls has thirty cabins located directly on Fall Creek Lake, which are known as the “Fishermen Cabins.”"'
))).*
FROM public.all_sage_data src
WHERE src.id = 11738;

-- Hammonasset Beach State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://portal.ct.gov/DEEP/State-Parks/Parks/Hammonasset-Beach-State-Park — "With 40% of all the campsites in the state, camping has a long and storied history at Hammonasset Beach State Park. Situated a stone’s throw from the beach, 558 grassy open campsites (including eight rustic cabins) dot the meandering loops of the campground."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11773;

-- Hocking Hills State Park Lodge: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.greatohiolodges.com/lodges/hocking-hills/ — "Aerial view of rustic cabins nestled among dense green trees, with winding paths and rolling forested hills in the background under a hazy sky."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11717;

-- Hontoon Island State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.floridastateparks.org/parks-and-trails/hontoon-island-state-park — "Join us on island time by camping in one of our primitive cabins!"'
))).*
FROM public.all_sage_data src
WHERE src.id = 11699;

-- Hunting Island State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://southcarolinaparks.com/hunting-island — "Hunting Island offers one rental cabin."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11702;

-- Joe Wheeler State Park Resort: add Cottage
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cottage',
  'site_name', 'Cottage',
  'quantity_of_units', NULL,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cottage — https://www.alapark.com/parks/joe-wheeler-state-park — "In addition to the resort lodge, Joe Wheeler features lakeside cottages and cabins."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11695;

-- Joe Wheeler State Park Resort: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://www.alapark.com/parks/joe-wheeler-state-park — "In addition to the resort lodge, Joe Wheeler features lakeside cottages and cabins."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11695;

-- Lakepoint Resort State Park: add Cabin
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cabin',
  'site_name', 'Cabin',
  'quantity_of_units', 29,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin x 29 — https://www.alapark.com/parks/lakepoint-state-park — "In addition to the lodge rooms, Lakepoint offers 29 cabins and 10 lakeside cottages."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11697;

-- Lakepoint Resort State Park: add Cottage
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cottage',
  'site_name', 'Cottage',
  'quantity_of_units', 10,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cottage x 10 — https://www.alapark.com/parks/lakepoint-state-park — "In addition to the lodge rooms, Lakepoint offers 29 cabins and 10 lakeside cottages."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11697;

-- Montgomery Bell State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://tnstateparks.com/parks/montgomery-bell — "Montgomery Bell Cabins"'
))).*
FROM public.all_sage_data src
WHERE src.id = 11739;

-- Pickwick Landing State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://tnstateparks.com/parks/pickwick-landing — "Pickwick Landing State Park, nestled in Counce, Tennessee, offers a diverse range of outdoor activities across its 1,407 acres. Situated on the shores of Pickwick Lake, the park is a haven for water enthusiasts, anglers, and nature lovers alike. With a lodge, cabins, camping facilities, a golf course, and a unique aviary, Pickwick Landing State Park provides a memorable experience for every visitor."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11740;

-- Roman Nose State Park Lodge: add Cabin
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cabin',
  'site_name', 'Cabin',
  'quantity_of_units', 11,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin x 11 — https://travelok.com/state-parks/roman-nose-state-park — "Roman Nose State Park also offers 11 cabins."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11678;

-- The Lodge at Sequoyah State Park: add Cottage
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cottage',
  'site_name', 'Cottage',
  'quantity_of_units', 45,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cottage x 45 — https://travelok.com/state-parks/sequoyah-state-park — "The Lodge at Sequoyah State Park is Oklahoma''s largest set of state park lodges, with 104 rooms and 45 cottages."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11679;

-- The Lodge at Sequoyah State Park: add Cabin
INSERT INTO public.all_sage_data
SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(
  'id', nextval('all_glamping_properties_new_id_seq1'),
  'unit_type', 'Cabin',
  'site_name', 'Cabin',
  'quantity_of_units', 10,
  'slug', NULL,
  'date_updated', '2026-09-21',
  'discovery_source', CASE
    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN 'web_research_unit_type_2026_09'
    WHEN src.discovery_source ILIKE '%web_research_unit_type_2026_09%' THEN src.discovery_source
    ELSE src.discovery_source || '; web_research_unit_type_2026_09'
  END,
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin x 10 — https://travelok.com/state-parks/sequoyah-state-park — "The Sequoyah Group Camp has a dining hall with full kitchen and 10 A-frame cabins which can sleep a total of 98 people."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11679;

-- Three Island Crossing State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://parksandrecreation.idaho.gov/parks/three-island-crossing — "Located just two miles off Interstate 84 at the Glenn’s Ferry exit, the park offers campground with water and electrical service, eight cabins, picnic areas, historical interpretive programs and a fascinating admission-free interpretive center."'
))).*
FROM public.all_sage_data src
WHERE src.id = 11733;

-- Watkins Glen State Park: add Cabin
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
  'notes', COALESCE(src.notes, '') || E'\n\n' || 'Unit type research (2026-09-21): Cabin — https://parks.ny.gov/parks/watkinsglen/ — "Cabins: Rustic Cabins (3 night minimum) Base Rate: $58.00 per night Out of State Fee: $7.00 per night"'
))).*
FROM public.all_sage_data src
WHERE src.id = 11751;
