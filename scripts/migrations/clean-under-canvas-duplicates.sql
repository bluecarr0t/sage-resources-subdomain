-- ============================================================================
-- Sage data: clean Under Canvas duplicates / mislabeled rows in
-- all_glamping_properties so chain-level analytics align with the brand's
-- real footprint (~13 camps + ULUM as a separate brand).
--
-- Each block is independently safe to re-run (deletes target specific ids,
-- updates set the same canonical values regardless of starting state).
--
-- Apply in Supabase SQL editor or:
--   psql $DATABASE_URL -f scripts/migrations/clean-under-canvas-duplicates.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Delete legacy stub rows (alt-address duplicates, placeholder addresses)
-- ----------------------------------------------------------------------------

-- Under Canvas Lake Powell - Grand Staircase: alt-address single-row stub
-- (full unit-type breakdown lives at "555 South Jacob Tank Road" ids 10290-10292).
DELETE FROM all_glamping_properties WHERE id = 9607;

-- Under Canvas Grand Canyon: legacy "Valle Airport Road" single-row stub
-- (real camp address is "979 Airpark Lane" ids 10089-10092).
DELETE FROM all_glamping_properties WHERE id = 9644;

-- Under Canvas White Mountains: placeholder address text "White Mountains"
-- (real address kept on id 9751 = "700 Blakslee Rd, Dalton, NH").
DELETE FROM all_glamping_properties WHERE id = 9515;

-- ----------------------------------------------------------------------------
-- 2. ULUM by Under Canvas: rename so it stops rolling up to "Under Canvas"
--    chain. Pairs with the prefix update in
--    scripts/migrations/sage-ai-top-multi-location-chains-rpc.sql which
--    adds 'ulum' to sage_chain_label_from_property_name.
-- ----------------------------------------------------------------------------
UPDATE all_glamping_properties
SET property_name = 'ULUM Moab',
    slug = 'ulum-moab',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10615;

-- ----------------------------------------------------------------------------
-- 3. West Yellowstone naming + duplicate cleanup
--    Real camp: Under Canvas West Yellowstone, 890 Buttermilk Creek Rd,
--    West Yellowstone, MT.  (North Yellowstone is a separate camp on
--    139 Pine Creek Rd, Livingston, MT.)
-- ----------------------------------------------------------------------------

-- 3a. SKU breakdown rows: rename "Under Canvas Yellowstone" -> West Yellowstone
UPDATE all_glamping_properties
SET property_name = 'Under Canvas West Yellowstone',
    slug = 'under-canvas-west-yellowstone',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id IN (10179, 10180, 10181, 10182, 10183);

-- 3b. Aggregate row at same address: city "Yellowstone" -> West Yellowstone
UPDATE all_glamping_properties
SET city = 'West Yellowstone',
    slug = 'under-canvas-west-yellowstone',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10406;

-- 3c. Delete the Feb-2026 OpenAI Research stub at the same address
--     (null qty, state typo "ID" instead of "MT"; same camp as 10179-10183).
DELETE FROM all_glamping_properties WHERE id = 11311;

-- 3d. Delete the older aggregate "Canvas Tent" row (qty 102) that
--     double-counts the same physical inventory the SKU breakdown rows
--     (10179-10183, sum = 103) already represent at the same address.
DELETE FROM all_glamping_properties WHERE id = 10406;
