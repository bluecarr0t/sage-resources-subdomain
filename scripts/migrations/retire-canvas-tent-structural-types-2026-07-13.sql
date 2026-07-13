-- Retire Canvas Tent catch-all + rename Canvas Cabin → Cabin Tent (2026-07-13).
-- Companion: scripts/apply-retire-canvas-tent-structural-types-2026-07-13.ts
-- Prefer the TypeScript apply script (notes + high-confidence site_name cues + CSV queue).
-- This SQL covers the bulk renames only.

-- 1) Canvas Cabin → Cabin Tent
UPDATE all_sage_data
SET
  unit_type = 'Cabin Tent',
  date_updated = '2026-07-13',
  notes = CASE
    WHEN coalesce(notes, '') LIKE '%[2026-07-13] retire Canvas Tent structural remap%' THEN notes
    WHEN coalesce(notes, '') = '' THEN '[2026-07-13] retire Canvas Tent structural remap: Canvas Cabin → Cabin Tent (rename Canvas Cabin → Cabin Tent; retire_canvas_tent_structural_2026_07_13).'
    ELSE notes || E'\n\n' || '[2026-07-13] retire Canvas Tent structural remap: Canvas Cabin → Cabin Tent (rename Canvas Cabin → Cabin Tent; retire_canvas_tent_structural_2026_07_13).'
  END
WHERE unit_type = 'Canvas Cabin';

-- 2) Wall Tent → Safari Tent
UPDATE all_sage_data
SET
  unit_type = 'Safari Tent',
  date_updated = '2026-07-13',
  notes = CASE
    WHEN coalesce(notes, '') LIKE '%[2026-07-13] retire Canvas Tent structural remap%' THEN notes
    WHEN coalesce(notes, '') = '' THEN '[2026-07-13] retire Canvas Tent structural remap: Wall Tent → Safari Tent (Wall Tent alias → Safari Tent; retire_canvas_tent_structural_2026_07_13).'
    ELSE notes || E'\n\n' || '[2026-07-13] retire Canvas Tent structural remap: Wall Tent → Safari Tent (Wall Tent alias → Safari Tent; retire_canvas_tent_structural_2026_07_13).'
  END
WHERE unit_type = 'Wall Tent';

-- High-confidence Canvas Tent remaps + ambiguous queue: use the TypeScript script.
