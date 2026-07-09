-- Round 3 Safari Tent unit-mix corrections (Jul 2026 tier-16 audit)
-- Companion: scripts/apply-safari-tent-unit-mix-corrections-round3-2026-07-08.ts

-- Yellowstone Dreamin Camp duplicate
DELETE FROM all_sage_data WHERE id = 10184;

-- UC Great Smoky Mountains 41 → 40
UPDATE all_sage_data SET quantity_of_units = '4', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10248;
UPDATE all_sage_data SET quantity_of_units = '18', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10249;
UPDATE all_sage_data SET quantity_of_units = '6', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10250;
UPDATE all_sage_data SET quantity_of_units = '12', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10251;

-- UC Moab 41 → 40
UPDATE all_sage_data SET quantity_of_units = '5', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10293;
UPDATE all_sage_data SET quantity_of_units = '2', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10294;
UPDATE all_sage_data SET quantity_of_units = '18', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10295;
UPDATE all_sage_data SET quantity_of_units = '15', property_total_sites = '40', date_updated = '2026-07-08' WHERE id = 10296;

-- Rustic Rook Resort 30 → 28
UPDATE all_sage_data SET quantity_of_units = '23', property_total_sites = '28', date_updated = '2026-07-08' WHERE id = 10119;
UPDATE all_sage_data SET property_total_sites = '28', date_updated = '2026-07-08' WHERE id = 10118;

-- Camp Aramoni 12 → 11
DELETE FROM all_sage_data WHERE id = 9693;
UPDATE all_sage_data SET quantity_of_units = '11', property_total_sites = '11', date_updated = '2026-07-08' WHERE id = 10140;

-- Stub / duplicate cleanup
DELETE FROM all_sage_data WHERE id = 9718;
DELETE FROM all_sage_data WHERE id = 9551;
