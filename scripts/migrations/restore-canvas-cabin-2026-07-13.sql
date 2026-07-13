-- Restore Canvas Cabin distinct from Cabin Tent (2026-07-13).
-- Companion: scripts/apply-restore-canvas-cabin-2026-07-13.ts

UPDATE all_sage_data
SET unit_type = 'Canvas Cabin', date_updated = '2026-07-13'
WHERE id IN (10171, 10172, 10303, 10224, 10751)
  AND unit_type = 'Cabin Tent';

UPDATE all_sage_data
SET unit_type = 'Canvas Cabin', date_updated = '2026-07-13'
WHERE unit_type = 'Cabin Tent'
  AND (
    site_name ILIKE 'Canvas Cabin'
    OR site_name ILIKE 'Classic Canvas Cabin'
    OR site_name ILIKE 'Family Canvas Cabin'
  );
