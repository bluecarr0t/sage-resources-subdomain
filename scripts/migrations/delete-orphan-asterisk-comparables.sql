-- Delete duplicate comparables with trailing asterisk that have no meaningful data.
-- These are typically footnote/alternate rows (e.g. "Ranch at Rock Creek*", "Paws Up Resort*")
-- that duplicate the main comp but lack units, quality_score, and total_sites.
--
-- Run in Supabase SQL Editor. Safe to run multiple times.

DELETE FROM feasibility_comparables
WHERE comp_name LIKE '%*'
  AND quality_score IS NULL
  AND total_sites IS NULL
  AND overview IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM feasibility_comp_units fcu
    WHERE fcu.comparable_id = feasibility_comparables.id
  );
