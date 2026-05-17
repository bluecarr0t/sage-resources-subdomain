-- ============================================================================
-- Sage data: clean Postcard Cabins / AutoCamp / Wander Camp duplicates and
-- naming inconsistencies in all_glamping_properties.
--
-- Each block is independently safe to re-run.
--
-- Apply in Supabase SQL editor or:
--   psql $DATABASE_URL -f scripts/migrations/clean-autocamp-postcard-wander-duplicates.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Postcard Cabins Talladega Valley = Postcard Cabins Coosa River (same camp)
--    Confirmed via https://postcardcabins.com/talladega-valley/ (current
--    canonical brand name is "Talladega Valley"; "Coosa River" was the prior
--    Getaway House name before the Marriott acquisition).
--
--    Sage state before: 2 SKU rows for "Coosa River" with city-only fallback
--    dedupe (23 + 22 units = 45 cabins) AND 1 aggregate row for "Talladega
--    Valley" at 2175 Cosper Bend Rd with quantity_of_units=45.
-- ----------------------------------------------------------------------------

-- Promote the Coosa River SKU breakdown to canonical Talladega Valley naming +
-- canonical address so the rows roll up correctly.
UPDATE all_glamping_properties
SET property_name = 'Postcard Cabins Talladega Valley',
    slug = 'postcard-cabins-talladega-valley',
    address = '2175 Cosper Bend Rd',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id IN (9929, 9930);

-- Delete the aggregate Talladega Valley row (qty 45) that double-counts the
-- same physical inventory the SKU breakdown rows above (23+22 = 45) represent.
DELETE FROM all_glamping_properties WHERE id = 10414;

-- ----------------------------------------------------------------------------
-- 2. AutoCamp Sonoma = AutoCamp Russian River (same camp; Sonoma is the
--    pre-rebrand name). Same address (14120 Old Cazadero Rd, Guerneville, CA).
--
--    Four "AutoCamp Sonoma" SKU rows were added 2026-05-05 (Manual Research)
--    on the assumption Sonoma was a missing site; they conflict with the
--    canonical Russian River SKU breakdown (5 rows, 35 units) loaded earlier.
--    Removing the Sonoma duplicates leaves Russian River as the single record.
-- ----------------------------------------------------------------------------
DELETE FROM all_glamping_properties WHERE id IN (11553, 11554, 11555, 11556);

-- ----------------------------------------------------------------------------
-- 3. AutoCamp casing: brand uses "AutoCamp" (camel-cased), not "Autocamp".
-- ----------------------------------------------------------------------------
UPDATE all_glamping_properties
SET property_name = 'AutoCamp Sequoia',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10635;

UPDATE all_glamping_properties
SET property_name = 'AutoCamp Zion',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10661;

-- ----------------------------------------------------------------------------
-- 4. Wander Camp Olympic naming normalization.
--    "Wander Camp - Olympic (WA)" -> "Wander Camp Olympic" so it follows the
--    same naming convention as every other Wander Camp outpost.
-- ----------------------------------------------------------------------------
UPDATE all_glamping_properties
SET property_name = 'Wander Camp Olympic',
    slug = 'wander-camp-olympic',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10561;

-- ----------------------------------------------------------------------------
-- 5. Wander Camp Canyonlands [CLOSED]: name carries [CLOSED] flag but
--    is_open was still 'Yes'. Mark closed so it stops counting as active
--    inventory in chain analytics that filter on is_open.
-- ----------------------------------------------------------------------------
UPDATE all_glamping_properties
SET is_open = 'Closed',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id IN (10620, 10621, 10622, 10623);
