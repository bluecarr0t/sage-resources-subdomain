-- CCE Modifier tables (wall height, perimeter multipliers)
-- Run in Supabase SQL Editor
--
-- Stores AVERAGE WALL HEIGHT and PERIMETER multiplier data from the PDF

CREATE TABLE IF NOT EXISTS cce_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_type TEXT NOT NULL,  -- 'wall_height' | 'perimeter'
  section_name TEXT,
  height_m NUMERIC,
  height_ft NUMERIC,
  sq_ft_multiplier NUMERIC,
  sq_m_multiplier NUMERIC,
  cu_ft_multiplier NUMERIC,
  notes TEXT,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cce_modifiers_type ON cce_modifiers(modifier_type);
CREATE INDEX IF NOT EXISTS idx_cce_modifiers_section ON cce_modifiers(section_name);
