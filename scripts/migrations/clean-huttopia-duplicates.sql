-- ============================================================================
-- Sage data: clean Huttopia duplicates / mislabeled rows in
-- all_glamping_properties so chain-level analytics align with the brand's
-- real Americas footprint (~9 destinations across USA + Canada).
--
-- Each block is independently safe to re-run.
--
-- Apply in Supabase SQL editor or:
--   psql $DATABASE_URL -f scripts/migrations/clean-huttopia-duplicates.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Delete legacy / placeholder stub rows
-- ----------------------------------------------------------------------------

-- Huttopia Adirondacks: stub with NULL address (no qty), real SKU breakdown
-- lives at "1571 Lake Ave, Lake Luzerne, NY" (ids 10213-10218, 108 units).
DELETE FROM all_glamping_properties WHERE id = 9730;

-- Huttopia Paradise Springs: stub at alt-address spelling "18101 Paradise Dr"
-- with NULL qty; real SKU breakdown is at "18101 Paradise Drive".
DELETE FROM all_glamping_properties WHERE id = 9556;

-- Huttopia White Mountains: four placeholder SKU rows at the partial address
-- "Pine Knoll Road" (qty 1/1/2/1, single bedroom counts), duplicating the real
-- SKU breakdown at "57 Pine Knoll Rd" (ids 10193, 10194, 10195, 10494; 96 units).
DELETE FROM all_glamping_properties WHERE id IN (10191, 10192, 10493, 10600);

-- ----------------------------------------------------------------------------
-- 2. Naming + address normalization
-- ----------------------------------------------------------------------------

-- Huttopia Wine Country: doubled "Huttopia Huttopia" prefix in property_name.
UPDATE all_glamping_properties
SET property_name = 'Huttopia Wine Country',
    slug = 'huttopia-wine-country',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id IN (10096, 10097, 10098);

-- Huttopia Paradise Springs: weird "Huttopia - Paradise Springs - Valyermo"
-- name + alt-address spelling (uses "Dr" instead of "Drive"); rolls into the
-- canonical SKU group at "18101 Paradise Drive".
UPDATE all_glamping_properties
SET property_name = 'Huttopia Paradise Springs',
    slug = 'huttopia-paradise-springs',
    address = '18101 Paradise Drive',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10424;

-- Huttopia Berkshires: row had NULL address (only Hancock, MA city), so it
-- created its own dedupe key and never rolled up to a real property. Fill in
-- the canonical street address from americas.huttopia.com/en/site/berkshires/
-- so the property is identifiable; unit-level inventory is intentionally left
-- NULL until a real SKU breakdown is loaded.
UPDATE all_glamping_properties
SET address = '312 Kittle Rd',
    date_updated = to_char(current_date, 'YYYY-MM-DD')
WHERE id = 10859;
