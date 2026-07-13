-- Rustic amenity backfill (2026-07-13)
-- unit_private_bathroom / property_hot_tub / property_food_on_site / property_restaurant

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_rustic_amenities_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Rustic amenities: unit_private_bathroom:null→No; property_food_on_site:null→Yes; property_restaurant:null→Yes. Downata Conestoga wagons — no inside bathroom; poolside restaurant & snack bar on site (downatahotsprings.com / Top Hot Springs).'
WHERE id = 9597;

UPDATE public.all_sage_data SET
  property_food_on_site = 'No',
  property_restaurant = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_rustic_amenities_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Rustic amenities: property_food_on_site:null→No; property_restaurant:null→No. Arcady Ridge canvas tents — no on-site restaurant/food service evidence; property hot tub already Yes (lodge swim spa). Bath left blank (running water / facilities unclear for tent SKU).'
WHERE id = 9633;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  property_hot_tub = 'No',
  property_restaurant = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_rustic_amenities_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Rustic amenities: unit_private_bathroom:null→No; property_hot_tub:null→No; property_restaurant:null→No. Turner Falls Park covered wagons — shared park bathhouses; no restaurant. Food left blank pending concession confirmation.'
WHERE id = 9638;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  property_hot_tub = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_rustic_amenities_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Rustic amenities: unit_private_bathroom:null→No; property_hot_tub:null→No; property_food_on_site:null→No; property_restaurant:null→No. Arizona Nordic Village yurts — typical shared bathhouse rustic inventory; no restaurant/hot tub evidence.'
WHERE id = 9651;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  property_hot_tub = 'No',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_rustic_amenities_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Rustic amenities: unit_private_bathroom:null→No; property_hot_tub:null→No; property_food_on_site:null→Yes; property_restaurant:null→No. Wolfe’s Neck cabins — community shower houses / outhouses; onsite farm store food; no restaurant (freeportcamping.com).'
WHERE id = 9748;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  property_hot_tub = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'market_report_coverage_gap_bozeman_250mi; manual_rustic_amenities_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Rustic amenities: unit_private_bathroom:null→Yes; property_hot_tub:null→No; property_food_on_site:null→No; property_restaurant:null→No. Pitch Yellowstone domes — large private modern bathroom + kitchenette; no on-site restaurant/hot tub (pitchyellowstone.com).'
WHERE id = 11611;

UPDATE public.all_sage_data SET
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'market_report_coverage_gap_seattle_250mi; web_research_hot_tub_2026_05_28; manual_rustic_amenities_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Rustic amenities: property_food_on_site:null→Yes; property_restaurant:null→No. Sou’wester — Front Porch Market snacks/provisions; no full-service restaurant (souwesterlodge.com). Bath mixed across trailers — left blank.'
WHERE id = 11622;

