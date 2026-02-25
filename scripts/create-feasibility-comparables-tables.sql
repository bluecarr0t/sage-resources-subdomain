-- Feasibility Study Comparables Tables
-- Run this in Supabase SQL Editor
-- Idempotent: safe to run multiple times (uses DROP POLICY IF EXISTS)

-- ============================================================
-- 1. feasibility_comparables — property-level comparable data
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_comparables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  comp_name TEXT NOT NULL,
  overview TEXT,
  amenities TEXT,
  amenity_keywords TEXT[],
  distance_miles NUMERIC(8,1),
  total_sites INTEGER,
  quality_score NUMERIC(3,1),
  property_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_comparables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_comparables" ON feasibility_comparables;
CREATE POLICY "Users can manage own feasibility_comparables"
  ON feasibility_comparables
  FOR ALL
  USING (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  )
  WITH CHECK (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  );

CREATE INDEX IF NOT EXISTS idx_feas_comps_report_id ON feasibility_comparables(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_comps_study_id ON feasibility_comparables(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_comps_amenity_kw ON feasibility_comparables USING GIN (amenity_keywords);
CREATE INDEX IF NOT EXISTS idx_feas_comps_quality ON feasibility_comparables(quality_score);

-- ============================================================
-- 2. feasibility_comp_units — unit-level rate/occupancy data
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_comp_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  comparable_id UUID REFERENCES feasibility_comparables(id) ON DELETE CASCADE,
  study_id TEXT,
  property_name TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  unit_category TEXT,
  num_units INTEGER,
  low_adr NUMERIC(10,2),
  peak_adr NUMERIC(10,2),
  avg_annual_adr NUMERIC(10,2),
  low_monthly_rate NUMERIC(10,2),
  peak_monthly_rate NUMERIC(10,2),
  low_occupancy NUMERIC(5,2),
  peak_occupancy NUMERIC(5,2),
  quality_score NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_comp_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_comp_units" ON feasibility_comp_units;
CREATE POLICY "Users can manage own feasibility_comp_units"
  ON feasibility_comp_units
  FOR ALL
  USING (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  )
  WITH CHECK (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  );

CREATE INDEX IF NOT EXISTS idx_feas_units_report_id ON feasibility_comp_units(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_units_comparable_id ON feasibility_comp_units(comparable_id);
CREATE INDEX IF NOT EXISTS idx_feas_units_study_id ON feasibility_comp_units(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_units_category ON feasibility_comp_units(unit_category);
CREATE INDEX IF NOT EXISTS idx_feas_units_low_adr ON feasibility_comp_units(low_adr);
CREATE INDEX IF NOT EXISTS idx_feas_units_peak_adr ON feasibility_comp_units(peak_adr);

-- ============================================================
-- 3. feasibility_study_summaries — aggregated stats per study
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_study_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  summary_type TEXT NOT NULL,
  label TEXT,
  num_units INTEGER,
  low_adr NUMERIC(10,2),
  peak_adr NUMERIC(10,2),
  low_monthly_rate NUMERIC(10,2),
  peak_monthly_rate NUMERIC(10,2),
  low_occupancy NUMERIC(5,2),
  peak_occupancy NUMERIC(5,2),
  quality_score NUMERIC(3,1),
  stat_min JSONB,
  stat_avg JSONB,
  stat_max JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_study_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_study_summaries" ON feasibility_study_summaries;
CREATE POLICY "Users can manage own feasibility_study_summaries"
  ON feasibility_study_summaries
  FOR ALL
  USING (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  )
  WITH CHECK (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  );

CREATE INDEX IF NOT EXISTS idx_feas_summ_report_id ON feasibility_study_summaries(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_summ_study_id ON feasibility_study_summaries(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_summ_type ON feasibility_study_summaries(summary_type);

-- ============================================================
-- 4. feasibility_property_scores — 6-dimension qualitative
--    scoring from Best Comps / occupancy call worksheets
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_property_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  property_name TEXT NOT NULL,
  overall_score NUMERIC(3,2),
  is_subject BOOLEAN DEFAULT FALSE,
  unit_types_score NUMERIC(3,2),
  unit_types_description TEXT,
  unit_amenities_score NUMERIC(3,2),
  unit_amenities_description TEXT,
  property_score NUMERIC(3,2),
  property_description TEXT,
  property_amenities_score NUMERIC(3,2),
  property_amenities_description TEXT,
  location_score NUMERIC(3,2),
  location_description TEXT,
  brand_strength_score NUMERIC(3,2),
  brand_strength_description TEXT,
  occupancy_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_property_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_property_scores" ON feasibility_property_scores;
CREATE POLICY "Users can manage own feasibility_property_scores"
  ON feasibility_property_scores
  FOR ALL
  USING (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  )
  WITH CHECK (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  );

CREATE INDEX IF NOT EXISTS idx_feas_scores_report_id ON feasibility_property_scores(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_scores_study_id ON feasibility_property_scores(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_scores_overall ON feasibility_property_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_feas_scores_subject ON feasibility_property_scores(is_subject) WHERE is_subject = TRUE;

-- ============================================================
-- 5. feasibility_pro_forma_units — per-unit-type multi-year
--    projections from 10-Year Pro Forma files
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_pro_forma_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  unit_type TEXT NOT NULL,
  unit_category TEXT,
  unit_count INTEGER,
  adr_growth_rate NUMERIC(5,2),
  yearly_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_pro_forma_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_pro_forma_units" ON feasibility_pro_forma_units;
CREATE POLICY "Users can manage own feasibility_pro_forma_units"
  ON feasibility_pro_forma_units
  FOR ALL
  USING (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  )
  WITH CHECK (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  );

CREATE INDEX IF NOT EXISTS idx_feas_pf_units_report_id ON feasibility_pro_forma_units(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_pf_units_study_id ON feasibility_pro_forma_units(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_pf_units_category ON feasibility_pro_forma_units(unit_category);

-- ============================================================
-- 6. feasibility_valuations — Direct Cap and Pro Forma
--    financial summary and valuation data
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  valuation_type TEXT NOT NULL,
  total_units INTEGER,
  occupancy_rate NUMERIC(5,2),
  average_daily_rate NUMERIC(10,2),
  annual_lodging_revenue NUMERIC(14,2),
  total_revenue NUMERIC(14,2),
  total_expenses NUMERIC(14,2),
  total_expenses_with_reserves NUMERIC(14,2),
  noi NUMERIC(14,2),
  noi_margin NUMERIC(5,2),
  cap_rate NUMERIC(5,2),
  indicated_value NUMERIC(14,2),
  value_per_unit NUMERIC(14,2),
  stabilization_months INTEGER,
  stabilization_cost NUMERIC(14,2),
  as_is_value NUMERIC(14,2),
  discount_rate NUMERIC(5,2),
  terminal_cap_rate NUMERIC(5,2),
  projected_sale_price NUMERIC(14,2),
  market_rental_rates JSONB,
  expense_breakdown JSONB,
  yearly_projections JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_valuations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_valuations" ON feasibility_valuations;
CREATE POLICY "Users can manage own feasibility_valuations"
  ON feasibility_valuations
  FOR ALL
  USING (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  )
  WITH CHECK (
    report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text)
  );

CREATE INDEX IF NOT EXISTS idx_feas_val_report_id ON feasibility_valuations(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_val_study_id ON feasibility_valuations(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_val_type ON feasibility_valuations(valuation_type);
CREATE INDEX IF NOT EXISTS idx_feas_val_noi ON feasibility_valuations(noi);
CREATE INDEX IF NOT EXISTS idx_feas_val_cap_rate ON feasibility_valuations(cap_rate);

-- ============================================================
-- 7. Extend reports table with comparables metadata
-- ============================================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS study_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS has_comparables BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS comp_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS comp_unit_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS csv_file_path TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS csv_file_types TEXT[];

CREATE INDEX IF NOT EXISTS idx_reports_study_id ON reports(study_id);
CREATE INDEX IF NOT EXISTS idx_reports_has_comps ON reports(has_comparables) WHERE has_comparables = TRUE;
CREATE INDEX IF NOT EXISTS idx_reports_csv_types ON reports USING GIN (csv_file_types);

-- ============================================================
-- 8. feasibility_financing — loan structure, IRR, yearly returns
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_financing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  interest_rate NUMERIC(5,4),
  loan_term_years INTEGER,
  ltc_ratio NUMERIC(5,4),
  equity_pct NUMERIC(5,4),
  mortgage_amount NUMERIC(14,2),
  annual_debt_service NUMERIC(14,2),
  total_development_cost NUMERIC(14,2),
  land_cost NUMERIC(14,2),
  total_project_cost NUMERIC(14,2),
  payback_period_years INTEGER,
  irr_on_equity NUMERIC(8,6),
  yearly_returns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_financing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_financing" ON feasibility_financing;
CREATE POLICY "Users can manage own feasibility_financing"
  ON feasibility_financing FOR ALL
  USING (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text))
  WITH CHECK (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_feas_fin_report_id ON feasibility_financing(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_fin_study_id ON feasibility_financing(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_fin_irr ON feasibility_financing(irr_on_equity);

-- ============================================================
-- 9. feasibility_development_costs — project cost line items
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_development_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  line_item TEXT NOT NULL,
  category TEXT NOT NULL,
  per_unit_cost NUMERIC(14,2),
  total_cost NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_development_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_development_costs" ON feasibility_development_costs;
CREATE POLICY "Users can manage own feasibility_development_costs"
  ON feasibility_development_costs FOR ALL
  USING (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text))
  WITH CHECK (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_feas_devcost_report_id ON feasibility_development_costs(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_devcost_study_id ON feasibility_development_costs(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_devcost_category ON feasibility_development_costs(category);

-- ============================================================
-- 10. feasibility_rate_projections — daily rate indicators
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_rate_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  unit_type TEXT NOT NULL,
  is_subject BOOLEAN DEFAULT FALSE,
  low_rate NUMERIC(10,2),
  peak_rate NUMERIC(10,2),
  avg_rate NUMERIC(10,2),
  quality_score NUMERIC(3,1),
  source TEXT,
  rate_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_rate_projections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_rate_projections" ON feasibility_rate_projections;
CREATE POLICY "Users can manage own feasibility_rate_projections"
  ON feasibility_rate_projections FOR ALL
  USING (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text))
  WITH CHECK (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_feas_rateproj_report_id ON feasibility_rate_projections(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_rateproj_study_id ON feasibility_rate_projections(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_rateproj_subject ON feasibility_rate_projections(is_subject) WHERE is_subject = TRUE;

-- ============================================================
-- 11. feasibility_occupancy_projections — stabilized occ + ramp-up
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_occupancy_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  unit_type TEXT NOT NULL,
  stabilized_low_occ NUMERIC(5,4),
  stabilized_peak_occ NUMERIC(5,4),
  weighted_annual_occ NUMERIC(5,4),
  low_months INTEGER,
  peak_months INTEGER,
  ramp_up JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_occupancy_projections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_occupancy_projections" ON feasibility_occupancy_projections;
CREATE POLICY "Users can manage own feasibility_occupancy_projections"
  ON feasibility_occupancy_projections FOR ALL
  USING (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text))
  WITH CHECK (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_feas_occproj_report_id ON feasibility_occupancy_projections(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_occproj_study_id ON feasibility_occupancy_projections(study_id);

-- ============================================================
-- 12. feasibility_market_data — demographics by radius
-- ============================================================
CREATE TABLE IF NOT EXISTS feasibility_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  study_id TEXT,
  radius TEXT NOT NULL,
  population_2020 INTEGER,
  population_projected INTEGER,
  population_growth_rate NUMERIC(8,6),
  households_2020 INTEGER,
  avg_household_size NUMERIC(4,2),
  median_household_income NUMERIC(10,2),
  per_capita_income NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feasibility_market_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feasibility_market_data" ON feasibility_market_data;
CREATE POLICY "Users can manage own feasibility_market_data"
  ON feasibility_market_data FOR ALL
  USING (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text))
  WITH CHECK (report_id IN (SELECT id FROM reports WHERE user_id = auth.uid()::text));

CREATE INDEX IF NOT EXISTS idx_feas_market_report_id ON feasibility_market_data(report_id);
CREATE INDEX IF NOT EXISTS idx_feas_market_study_id ON feasibility_market_data(study_id);
CREATE INDEX IF NOT EXISTS idx_feas_market_radius ON feasibility_market_data(radius);

-- ============================================================
-- 13. Extend reports table with ToT / project info fields
-- ============================================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resort_name TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resort_type TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS lot_size_acres NUMERIC(10,2);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS parcel_number TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_purpose TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS unit_descriptions JSONB;
