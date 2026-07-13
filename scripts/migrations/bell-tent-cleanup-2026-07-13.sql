-- Bell Tent cleanup (2026-07-13).
-- Companion: scripts/apply-bell-tent-cleanup-2026-07-13.ts

-- 1) Clear mislabels
UPDATE all_sage_data SET unit_type = 'Yurt', date_updated = '2026-07-13'
WHERE id = 10782 AND unit_type = 'Bell Tent'; -- Bridgeviews Yurts

UPDATE all_sage_data SET unit_type = 'Tipi', date_updated = '2026-07-13'
WHERE id = 10582 AND unit_type = 'Bell Tent'; -- Sundance Tipi

UPDATE all_sage_data SET unit_type = 'Tipi', date_updated = '2026-07-13'
WHERE id = 10586 AND unit_type = 'Bell Tent'; -- Sleepy Teepee

-- 2) Generic tent site_names → Canvas Tent (holding)
UPDATE all_sage_data SET unit_type = 'Canvas Tent', date_updated = '2026-07-13'
WHERE id IN (10612, 10608, 10581, 10606, 9613, 10787, 10785, 10625, 10614)
  AND unit_type = 'Bell Tent';

-- 3) Adirondack Safari: keep id 10601 qty=15; null duplicate qty
UPDATE all_sage_data SET quantity_of_units = NULL, date_updated = '2026-07-13'
WHERE id IN (10602, 10603) AND property_name = 'Adirondack Safari';
