-- Normalize operating_season_months to numeric (number of months operating)
-- Run: psql or Supabase SQL editor

-- Text values to convert:
-- Year-round → 12
-- April-October → 7 (Apr, May, Jun, Jul, Aug, Sep, Oct)
-- May-September → 5 (May, Jun, Jul, Aug, Sep)
-- May-October → 6 (May, Jun, Jul, Aug, Sep, Oct)
-- Seasonal → 6 (typical seasonal)
-- 5-10 → 6 (May through October)
-- 5-11 → 7 (May through November)
-- 4-10 → 7 (April through October)
-- 4-6 → 3 (April through June)
-- 2025 → 12 (assume year-round; likely data entry error)

UPDATE all_glamping_properties
SET operating_season_months = CASE
  WHEN trim(operating_season_months::text) = 'Year-round' THEN '12'
  WHEN trim(operating_season_months::text) = 'April-October' THEN '7'
  WHEN trim(operating_season_months::text) = 'May-September' THEN '5'
  WHEN trim(operating_season_months::text) = 'May-October' THEN '6'
  WHEN trim(operating_season_months::text) = 'Seasonal' THEN '6'
  WHEN trim(operating_season_months::text) = '5-10' THEN '6'
  WHEN trim(operating_season_months::text) = '5-11' THEN '7'
  WHEN trim(operating_season_months::text) = '4-10' THEN '7'
  WHEN trim(operating_season_months::text) = '4-6' THEN '3'
  WHEN trim(operating_season_months::text) = '2025' THEN '12'
  ELSE operating_season_months::text
END
WHERE operating_season_months IS NOT NULL
  AND trim(operating_season_months::text) != ''
  AND trim(operating_season_months::text) IN (
    'Year-round', 'April-October', 'May-September', 'May-October',
    'Seasonal', '5-10', '5-11', '4-10', '4-6', '2025'
  );
