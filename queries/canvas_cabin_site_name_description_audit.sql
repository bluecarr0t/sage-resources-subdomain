-- Properties with "canvas cabin" / "canvas cottage" signals in Sage
-- Canonical types: Canvas Cabin (2026-07-13), Canvas Cottage; related: Canvas Tent, Cabin, Safari Tent

-- A) Explicit site_name OR unit_type Canvas Cabin / Canvas Cottage
SELECT
  id,
  property_name,
  state,
  country,
  site_name,
  unit_type,
  is_open,
  quantity_of_units,
  rate_avg_retail_daily_rate
FROM all_sage_data
WHERE site_name ~* 'canvas\s*cabin|canvas\s*cottage|classic\s+canvas\s+cabin|family\s+canvas\s+cabin|tent.?cabin|cabin\s+tent|tentalow'
   OR unit_type IN ('Canvas Cabin', 'Canvas Cottage')
ORDER BY country, state, property_name, site_name;

-- B) Description mentions canvas cabin(s) but site_name does not (property-level copy on wrong row)
SELECT
  id,
  property_name,
  state,
  site_name,
  unit_type,
  substring(description FROM '(.{0,80}canvas\s+cabin.{0,80})') AS excerpt
FROM all_sage_data
WHERE description ~* '\bcanvas\s+cabin|\bcanvas\s+cabins\b'
  AND NOT (site_name ~* 'canvas\s*cabin|canvas\s*cottage|classic\s+canvas|family\s+canvas')
ORDER BY property_name, id;

-- C) Related site names (tent-cabin hybrids — review before mapping to Canvas Cabin)
SELECT id, property_name, state, site_name, unit_type
FROM all_sage_data
WHERE site_name ~* 'tent\s*cabin|cabin\s*tent|deluxe\s+tent\s+cabin|glamping\s+cabin'
  AND NOT (site_name ~* 'canvas')
ORDER BY property_name, site_name;
