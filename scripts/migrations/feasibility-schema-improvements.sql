-- Feasibility Schema Improvements
-- Run in Supabase SQL Editor
-- Addresses: composite indexes, CHECK constraints, unique constraint,
-- updated_at columns, occupancy precision, comp_count triggers

-- ============================================================
-- 19. Composite indexes for (report_id, study_id)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_feas_comps_report_study
  ON feasibility_comparables(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_units_report_study
  ON feasibility_comp_units(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_summ_report_study
  ON feasibility_study_summaries(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_scores_report_study
  ON feasibility_property_scores(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_pf_units_report_study
  ON feasibility_pro_forma_units(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_val_report_study
  ON feasibility_valuations(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_fin_report_study
  ON feasibility_financing(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_devcost_report_study
  ON feasibility_development_costs(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_rateproj_report_study
  ON feasibility_rate_projections(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_occproj_report_study
  ON feasibility_occupancy_projections(report_id, study_id);
CREATE INDEX IF NOT EXISTS idx_feas_market_report_study
  ON feasibility_market_data(report_id, study_id);

-- ============================================================
-- 20. CHECK constraints on numerics (quality_score 0-10, etc.)
-- ============================================================
-- feasibility_comparables.quality_score
ALTER TABLE feasibility_comparables
  DROP CONSTRAINT IF EXISTS chk_feas_comps_quality;
ALTER TABLE feasibility_comparables
  ADD CONSTRAINT chk_feas_comps_quality
  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 10));

-- feasibility_comp_units
ALTER TABLE feasibility_comp_units
  DROP CONSTRAINT IF EXISTS chk_feas_units_quality;
ALTER TABLE feasibility_comp_units
  ADD CONSTRAINT chk_feas_units_quality
  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 10));
ALTER TABLE feasibility_comp_units
  DROP CONSTRAINT IF EXISTS chk_feas_units_low_occ;
ALTER TABLE feasibility_comp_units
  ADD CONSTRAINT chk_feas_units_low_occ
  CHECK (low_occupancy IS NULL OR (low_occupancy >= 0 AND low_occupancy <= 100));
ALTER TABLE feasibility_comp_units
  DROP CONSTRAINT IF EXISTS chk_feas_units_peak_occ;
ALTER TABLE feasibility_comp_units
  ADD CONSTRAINT chk_feas_units_peak_occ
  CHECK (peak_occupancy IS NULL OR (peak_occupancy >= 0 AND peak_occupancy <= 100));

-- feasibility_valuations (cap_rate, occupancy_rate 0-100)
ALTER TABLE feasibility_valuations
  DROP CONSTRAINT IF EXISTS chk_feas_val_cap_rate;
ALTER TABLE feasibility_valuations
  ADD CONSTRAINT chk_feas_val_cap_rate
  CHECK (cap_rate IS NULL OR (cap_rate >= 0 AND cap_rate <= 100));
ALTER TABLE feasibility_valuations
  DROP CONSTRAINT IF EXISTS chk_feas_val_occ;
ALTER TABLE feasibility_valuations
  ADD CONSTRAINT chk_feas_val_occ
  CHECK (occupancy_rate IS NULL OR (occupancy_rate >= 0 AND occupancy_rate <= 100));

-- feasibility_property_scores (overall_score 0-10)
ALTER TABLE feasibility_property_scores
  DROP CONSTRAINT IF EXISTS chk_feas_scores_overall;
ALTER TABLE feasibility_property_scores
  ADD CONSTRAINT chk_feas_scores_overall
  CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 10));

-- ============================================================
-- 21. Occupancy precision: Document convention.
--     comp_units: NUMERIC(5,2) stores 0-100 (e.g. 75.50 = 75.5%)
--     occupancy_projections: NUMERIC(5,4) stores 0-1 (e.g. 0.7550 = 75.5%)
--     Display: use formatOccupancyPercent(val) - if val>1 treat as 0-100, else as 0-1
--     To standardize: run data migration and ALTER when ready.
-- ============================================================

-- ============================================================
-- 22. Triggers to keep comp_count / comp_unit_count in sync
-- ============================================================
CREATE OR REPLACE FUNCTION update_report_comp_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'feasibility_comparables' THEN
      UPDATE reports SET comp_count = GREATEST(0, comp_count - 1) WHERE id = OLD.report_id;
    ELSIF TG_TABLE_NAME = 'feasibility_comp_units' THEN
      UPDATE reports SET comp_unit_count = GREATEST(0, comp_unit_count - 1) WHERE id = OLD.report_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'feasibility_comparables' THEN
      UPDATE reports SET comp_count = comp_count + 1 WHERE id = NEW.report_id;
    ELSIF TG_TABLE_NAME = 'feasibility_comp_units' THEN
      UPDATE reports SET comp_unit_count = comp_unit_count + 1 WHERE id = NEW.report_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feas_comps_count ON feasibility_comparables;
CREATE TRIGGER trg_feas_comps_count
  AFTER INSERT OR DELETE ON feasibility_comparables
  FOR EACH ROW EXECUTE FUNCTION update_report_comp_counts();

DROP TRIGGER IF EXISTS trg_feas_units_count ON feasibility_comp_units;
CREATE TRIGGER trg_feas_units_count
  AFTER INSERT OR DELETE ON feasibility_comp_units
  FOR EACH ROW EXECUTE FUNCTION update_report_comp_counts();

-- Backfill current counts (one-time)
UPDATE reports r SET
  comp_count = (SELECT COUNT(*) FROM feasibility_comparables c WHERE c.report_id = r.id),
  comp_unit_count = (SELECT COUNT(*) FROM feasibility_comp_units u WHERE u.report_id = r.id)
WHERE r.has_comparables = TRUE;

-- ============================================================
-- 23. Unique constraint on (report_id, comp_name)
-- ============================================================
-- First remove duplicates if any (keep one per report_id+comp_name)
DELETE FROM feasibility_comparables a
USING feasibility_comparables b
WHERE a.report_id = b.report_id
  AND LOWER(TRIM(a.comp_name)) = LOWER(TRIM(b.comp_name))
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feas_comps_report_comp_name
  ON feasibility_comparables(report_id, LOWER(TRIM(comp_name)));

-- ============================================================
-- 24. Add updated_at columns
-- ============================================================
ALTER TABLE feasibility_comparables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_comp_units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_study_summaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_property_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_pro_forma_units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_valuations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_financing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_development_costs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_rate_projections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_occupancy_projections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE feasibility_market_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger to auto-update updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'feasibility_comparables','feasibility_comp_units','feasibility_study_summaries',
    'feasibility_property_scores','feasibility_pro_forma_units','feasibility_valuations',
    'feasibility_financing','feasibility_development_costs','feasibility_rate_projections',
    'feasibility_occupancy_projections','feasibility_market_data'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END;
$$;
