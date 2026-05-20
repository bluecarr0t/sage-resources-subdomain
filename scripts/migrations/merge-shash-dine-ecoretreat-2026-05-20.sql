-- Merge duplicate Shash Dine + Shash Dine' EcoRetreat into one logical property.
-- Canonical property_id: 3f8fb0d0-a949-401e-8b08-096e6f1a1a17
-- Canonical slug: shash-dine-ecoretreat
-- Orphan property_id removed: 960f0bba-d7ed-4f91-9eea-3557bd0d62e4 (four site rows re-parented)
-- Source: https://www.shashdine.com/ — Navajo-owned eco retreat near Page, AZ (Hwy 89 / Navajo Route 6211)

-- Re-parent Shash Dine site rows onto EcoRetreat property_id
UPDATE public.all_glamping_properties SET
  property_name = 'Shash Dine'' EcoRetreat',
  slug = 'shash-dine-ecoretreat',
  property_id = '3f8fb0d0-a949-401e-8b08-096e6f1a1a17'::uuid,
  city = 'Page',
  state = 'AZ',
  country = 'United States',
  url = 'https://www.shashdine.com/',
  address = 'Hwy 89 Navajo Route 6211',
  is_glamping_property = 'Yes',
  is_open = 'Yes',
  research_status = 'published',
  property_type = 'Glamping',
  land_operator_category = 'private_commercial',
  date_updated = '2026-05-20',
  notes = COALESCE(notes, '') || E'\n\nMerge (May 2026): Combined duplicate list entry "Shash Dine" (property_id 960f0bba-d7ed-4f91-9eea-3557bd0d62e4) into Shash Dine'' EcoRetreat.'
WHERE id IN (9936, 10308, 10378, 10557);

-- Normalize all sibling site rows (EcoRetreat + merged Shash Dine units)
UPDATE public.all_glamping_properties SET
  property_name = 'Shash Dine'' EcoRetreat',
  slug = 'shash-dine-ecoretreat',
  property_id = '3f8fb0d0-a949-401e-8b08-096e6f1a1a17'::uuid,
  city = 'Page',
  url = 'https://www.shashdine.com/',
  address = 'Hwy 89 Navajo Route 6211',
  property_type = 'Glamping',
  land_operator_category = 'private_commercial',
  date_updated = '2026-05-20'
WHERE id IN (9645, 9646, 9647, 10309, 10379, 10415, 10558);

REFRESH MATERIALIZED VIEW public.unified_comps;
