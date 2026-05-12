-- ============================================================================
-- Sage data: remove Under Canvas Columbia River Gorge duplicate aggregate row.
--
-- Id 10409 is site_name "Tents" with quantity_of_units=50 at the same property
-- as seven SKU-level rows (10628-10634, 5 units each = 35). Keeping both
-- double-counts physical inventory and distorts unit-weighted chain ADR.
-- Same pattern as the removed West Yellowstone "Canvas Tent" aggregate.
--
-- Apply: psql $DATABASE_URL -f this file
-- ============================================================================

DELETE FROM all_glamping_properties WHERE id = 10409;
