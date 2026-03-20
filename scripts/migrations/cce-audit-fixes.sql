-- CCE Audit Fixes: RLS, unique constraint, updated_at
-- Run in Supabase SQL Editor or via migration script
--
-- Fixes:
-- 1. Add unique constraint on cce_cost_percentages (section_name, occupancy, category)
-- 2. Add updated_at to cce_cost_rows and cce_cost_percentages
-- 3. Enable RLS and add admin-only policies

-- 1. Add updated_at to cce_cost_rows (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cce_cost_rows' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE cce_cost_rows ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. Add updated_at to cce_cost_percentages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cce_cost_percentages' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE cce_cost_percentages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 3. Unique constraint on cce_cost_percentages
-- First remove duplicates (keep one row per section_name, occupancy, category)
ALTER TABLE cce_cost_percentages DROP CONSTRAINT IF EXISTS cce_cost_pct_unique;

DELETE FROM cce_cost_percentages a
USING cce_cost_percentages b
WHERE a.id > b.id
  AND a.section_name = b.section_name
  AND a.occupancy = b.occupancy
  AND a.category = b.category;

ALTER TABLE cce_cost_percentages
  ADD CONSTRAINT cce_cost_pct_unique UNIQUE (section_name, occupancy, category);

-- 4. Enable RLS on CCE tables (service role bypasses; anon/authenticated denied by default)
ALTER TABLE cce_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cce_cost_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cce_cost_percentages ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cce_component_costs') THEN
    ALTER TABLE cce_component_costs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
