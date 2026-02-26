/**
 * TypeScript interfaces for the feasibility study comparables data pipeline.
 * Maps to the feasibility_comparables, feasibility_comp_units, and
 * feasibility_study_summaries Supabase tables.
 */

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface FeasibilityComparable {
  id: string;
  report_id: string | null;
  study_id: string | null;
  comp_name: string;
  overview: string | null;
  amenities: string | null;
  amenity_keywords: string[] | null;
  distance_miles: number | null;
  total_sites: number | null;
  quality_score: number | null;
  property_type: string | null;
  created_at: string;
}

export interface FeasibilityCompUnit {
  id: string;
  report_id: string | null;
  comparable_id: string | null;
  study_id: string | null;
  property_name: string;
  unit_type: string;
  unit_category: string | null;
  num_units: number | null;
  low_adr: number | null;
  peak_adr: number | null;
  avg_annual_adr: number | null;
  low_monthly_rate: number | null;
  peak_monthly_rate: number | null;
  low_occupancy: number | null;
  peak_occupancy: number | null;
  quality_score: number | null;
  created_at: string;
}

export interface FeasibilityStudySummary {
  id: string;
  report_id: string | null;
  study_id: string | null;
  summary_type: string;
  label: string | null;
  num_units: number | null;
  low_adr: number | null;
  peak_adr: number | null;
  low_monthly_rate: number | null;
  peak_monthly_rate: number | null;
  low_occupancy: number | null;
  peak_occupancy: number | null;
  quality_score: number | null;
  stat_min: SummaryStat | null;
  stat_avg: SummaryStat | null;
  stat_max: SummaryStat | null;
  created_at: string;
}

export interface SummaryStat {
  units?: number | null;
  low_adr?: number | null;
  peak_adr?: number | null;
  low_monthly_rate?: number | null;
  peak_monthly_rate?: number | null;
  low_occupancy?: number | null;
  peak_occupancy?: number | null;
  quality_score?: number | null;
  avg_annual_adr?: number | null;
}

// ---------------------------------------------------------------------------
// Insert types (omit server-generated fields)
// ---------------------------------------------------------------------------

export type FeasibilityComparableInsert = Omit<FeasibilityComparable, 'id' | 'created_at'>;
export type FeasibilityCompUnitInsert = Omit<FeasibilityCompUnit, 'id' | 'created_at'>;
export type FeasibilityStudySummaryInsert = Omit<FeasibilityStudySummary, 'id' | 'created_at'>;

// ---------------------------------------------------------------------------
// Parser output types (pre-database, no IDs)
// ---------------------------------------------------------------------------

export interface ParsedComparable {
  comp_name: string;
  overview: string | null;
  amenities: string | null;
  amenity_keywords: string[];
  distance_miles: number | null;
  total_sites: number | null;
  quality_score: number | null;
  property_type: string | null;
}

export interface ParsedCompUnit {
  property_name: string;
  unit_type: string;
  unit_category: string | null;
  num_units: number | null;
  low_adr: number | null;
  peak_adr: number | null;
  avg_annual_adr: number | null;
  low_monthly_rate: number | null;
  peak_monthly_rate: number | null;
  low_occupancy: number | null;
  peak_occupancy: number | null;
  quality_score: number | null;
}

export interface ParsedSummary {
  summary_type: 'market_min' | 'market_avg' | 'market_max' | 'phase';
  label: string | null;
  num_units: number | null;
  low_adr: number | null;
  peak_adr: number | null;
  low_monthly_rate: number | null;
  peak_monthly_rate: number | null;
  low_occupancy: number | null;
  peak_occupancy: number | null;
  quality_score: number | null;
}

export interface ParsedFeasibilityCSV {
  study_id: string;
  filename: string;
  file_type: CSVFileType;
  comparables: ParsedComparable[];
  comp_units: ParsedCompUnit[];
  summaries: ParsedSummary[];
  property_scores: ParsedPropertyScore[];
  pro_forma_units: ParsedProFormaUnit[];
  valuation: ParsedValuation | null;
}

// ---------------------------------------------------------------------------
// CSV file type detection
// ---------------------------------------------------------------------------

export const CSV_FILE_TYPES = [
  'comps_summary',
  'best_comps',
  'pro_forma',
  'direct_cap',
  'unknown',
] as const;

export type CSVFileType = (typeof CSV_FILE_TYPES)[number];

// ---------------------------------------------------------------------------
// Property scores (Best Comps) parser types
// ---------------------------------------------------------------------------

export interface ParsedPropertyScore {
  property_name: string;
  overall_score: number | null;
  is_subject: boolean;
  unit_types_score: number | null;
  unit_types_description: string | null;
  unit_amenities_score: number | null;
  unit_amenities_description: string | null;
  property_score: number | null;
  property_description: string | null;
  property_amenities_score: number | null;
  property_amenities_description: string | null;
  location_score: number | null;
  location_description: string | null;
  brand_strength_score: number | null;
  brand_strength_description: string | null;
  occupancy_notes: string | null;
}

// ---------------------------------------------------------------------------
// Pro Forma parser types
// ---------------------------------------------------------------------------

export interface ProFormaYearlyData {
  year: number;
  adr: number | null;
  occupancy: number | null;
  site_nights: number | null;
  revenue: number | null;
}

export interface ParsedProFormaUnit {
  unit_type: string;
  unit_category: string | null;
  unit_count: number | null;
  adr_growth_rate: number | null;
  yearly_data: ProFormaYearlyData[];
}

export interface ParsedProFormaSummary {
  yearly_totals: Array<{
    year: number;
    total_lodging_revenue: number | null;
    total_revenue: number | null;
    total_expenses: number | null;
    total_expenses_with_reserves: number | null;
    noi: number | null;
    noi_margin: number | null;
  }>;
  expense_breakdown: Array<{
    category: string;
    per_site_year1: number | null;
    pct_of_revenue: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// Valuation / Direct Cap parser types
// ---------------------------------------------------------------------------

export interface MarketRentalRate {
  unit_type: string;
  daily_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  renter_pct_daily: number | null;
  renter_pct_weekly: number | null;
  renter_pct_monthly: number | null;
}

export interface ParsedValuation {
  valuation_type: 'direct_cap' | 'pro_forma';
  total_units: number | null;
  occupancy_rate: number | null;
  average_daily_rate: number | null;
  annual_lodging_revenue: number | null;
  total_revenue: number | null;
  total_expenses: number | null;
  total_expenses_with_reserves: number | null;
  noi: number | null;
  noi_margin: number | null;
  cap_rate: number | null;
  indicated_value: number | null;
  value_per_unit: number | null;
  stabilization_months: number | null;
  stabilization_cost: number | null;
  as_is_value: number | null;
  discount_rate: number | null;
  terminal_cap_rate: number | null;
  projected_sale_price: number | null;
  market_rental_rates: MarketRentalRate[];
  expense_breakdown: Array<{
    category: string;
    amount: number | null;
    per_unit: number | null;
    pct_of_revenue: number | null;
  }>;
  yearly_projections: Array<{
    year: number;
    total_revenue: number | null;
    total_expenses: number | null;
    noi: number | null;
    noi_margin: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// Database row types — new tables
// ---------------------------------------------------------------------------

export interface FeasibilityPropertyScore {
  id: string;
  report_id: string | null;
  study_id: string | null;
  property_name: string;
  overall_score: number | null;
  is_subject: boolean;
  unit_types_score: number | null;
  unit_types_description: string | null;
  unit_amenities_score: number | null;
  unit_amenities_description: string | null;
  property_score: number | null;
  property_description: string | null;
  property_amenities_score: number | null;
  property_amenities_description: string | null;
  location_score: number | null;
  location_description: string | null;
  brand_strength_score: number | null;
  brand_strength_description: string | null;
  occupancy_notes: string | null;
  created_at: string;
}

export interface FeasibilityProFormaUnit {
  id: string;
  report_id: string | null;
  study_id: string | null;
  unit_type: string;
  unit_category: string | null;
  unit_count: number | null;
  adr_growth_rate: number | null;
  yearly_data: ProFormaYearlyData[];
  created_at: string;
}

export interface FeasibilityValuation {
  id: string;
  report_id: string | null;
  study_id: string | null;
  valuation_type: string;
  total_units: number | null;
  occupancy_rate: number | null;
  average_daily_rate: number | null;
  annual_lodging_revenue: number | null;
  total_revenue: number | null;
  total_expenses: number | null;
  total_expenses_with_reserves: number | null;
  noi: number | null;
  noi_margin: number | null;
  cap_rate: number | null;
  indicated_value: number | null;
  value_per_unit: number | null;
  stabilization_months: number | null;
  stabilization_cost: number | null;
  as_is_value: number | null;
  discount_rate: number | null;
  terminal_cap_rate: number | null;
  projected_sale_price: number | null;
  market_rental_rates: MarketRentalRate[] | null;
  expense_breakdown: Record<string, unknown>[] | null;
  yearly_projections: Record<string, unknown>[] | null;
  created_at: string;
}

export type FeasibilityPropertyScoreInsert = Omit<FeasibilityPropertyScore, 'id' | 'created_at'>;
export type FeasibilityProFormaUnitInsert = Omit<FeasibilityProFormaUnit, 'id' | 'created_at'>;
export type FeasibilityValuationInsert = Omit<FeasibilityValuation, 'id' | 'created_at'>;

// ---------------------------------------------------------------------------
// Database row types — XLSX pipeline tables
// ---------------------------------------------------------------------------

export interface FeasibilityFinancing {
  id: string;
  report_id: string | null;
  study_id: string | null;
  interest_rate: number | null;
  loan_term_years: number | null;
  ltc_ratio: number | null;
  equity_pct: number | null;
  mortgage_amount: number | null;
  annual_debt_service: number | null;
  total_development_cost: number | null;
  land_cost: number | null;
  total_project_cost: number | null;
  payback_period_years: number | null;
  irr_on_equity: number | null;
  yearly_returns: YearlyReturn[] | null;
  created_at: string;
}

export interface YearlyReturn {
  year: number;
  noi: number | null;
  net_income_to_equity: number | null;
  cash_on_cash: number | null;
  dcr: number | null;
}

export interface FeasibilityDevelopmentCost {
  id: string;
  report_id: string | null;
  study_id: string | null;
  line_item: string;
  category: string;
  per_unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
}

export interface FeasibilityRateProjection {
  id: string;
  report_id: string | null;
  study_id: string | null;
  unit_type: string;
  is_subject: boolean;
  low_rate: number | null;
  peak_rate: number | null;
  avg_rate: number | null;
  quality_score: number | null;
  source: string | null;
  rate_category: string | null;
  seasonal_rates: SeasonalRate[] | null;
  created_at: string;
}

export interface FeasibilityOccupancyProjection {
  id: string;
  report_id: string | null;
  study_id: string | null;
  unit_type: string;
  stabilized_low_occ: number | null;
  stabilized_peak_occ: number | null;
  weighted_annual_occ: number | null;
  low_months: number | null;
  peak_months: number | null;
  ramp_up: Array<{ year: number; occupancy: number | null }> | null;
  monthly_occupancy: MonthlyOccupancy[] | null;
  created_at: string;
}

export interface FeasibilityMarketData {
  id: string;
  report_id: string | null;
  study_id: string | null;
  radius: string;
  population_2020: number | null;
  population_projected: number | null;
  population_growth_rate: number | null;
  households_2020: number | null;
  avg_household_size: number | null;
  median_household_income: number | null;
  per_capita_income: number | null;
  created_at: string;
}

export type FeasibilityFinancingInsert = Omit<FeasibilityFinancing, 'id' | 'created_at'>;
export type FeasibilityDevelopmentCostInsert = Omit<FeasibilityDevelopmentCost, 'id' | 'created_at'>;
export type FeasibilityRateProjectionInsert = Omit<FeasibilityRateProjection, 'id' | 'created_at'>;
export type FeasibilityOccupancyProjectionInsert = Omit<FeasibilityOccupancyProjection, 'id' | 'created_at'>;
export type FeasibilityMarketDataInsert = Omit<FeasibilityMarketData, 'id' | 'created_at'>;

// ---------------------------------------------------------------------------
// Unit category constants
// ---------------------------------------------------------------------------

export const UNIT_CATEGORIES = [
  'treehouse',
  'dome',
  'cabin',
  'tent',
  'tiny_home',
  'a_frame',
  'safari_tent',
  'container',
  'mirror_cabin',
  'rv_site',
  'yurt',
  'other',
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export interface ComparableWithUnits extends FeasibilityComparable {
  units: FeasibilityCompUnit[];
}

export interface StudyDetail {
  report_id: string;
  study_id: string;
  property_name: string;
  location: string | null;
  comparables: ComparableWithUnits[];
  summaries: FeasibilityStudySummary[];
}

export interface ComparablesSearchParams {
  search?: string;
  state?: string;
  unit_category?: string;
  min_adr?: number;
  max_adr?: number;
  sort_by?: 'comp_name' | 'quality_score' | 'low_adr' | 'peak_adr' | 'created_at';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface AnalyticsADRByCategory {
  unit_category: string;
  avg_low_adr: number;
  avg_peak_adr: number;
  count: number;
}

export interface AnalyticsOccupancyPoint {
  avg_annual_adr: number;
  low_occupancy: number;
  peak_occupancy: number;
  quality_score: number;
  unit_category: string;
  property_name: string;
}

export interface AnalyticsUnitMix {
  unit_category: string;
  count: number;
  percentage: number;
}

export interface AnalyticsRegionalRate {
  state: string;
  avg_low_adr: number;
  avg_peak_adr: number;
  study_count: number;
}

export interface UploadResult {
  filename: string;
  study_id: string;
  report_id?: string;
  success: boolean;
  error?: string;
  warnings?: string[];
  sheets_processed?: number;
  comparables_count?: number;
  units_count?: number;
  summaries_count?: number;
  property_scores_count?: number;
  pro_forma_units_count?: number;
  has_valuation?: boolean;
  has_financing?: boolean;
  dev_costs_count?: number;
  rate_projections_count?: number;
  occ_projections_count?: number;
  market_data_count?: number;
}

// ---------------------------------------------------------------------------
// XLSX parsed workbook output
// ---------------------------------------------------------------------------

export interface ParsedProjectInfo {
  resort_name: string | null;
  resort_type: string | null;
  resort_address: string | null;
  county: string | null;
  lot_size_acres: number | null;
  parcel_number: string | null;
  report_purpose: string | null;
  unit_descriptions: Array<{ type: string; quantity: number | null; description: string | null }>;
}

export interface ParsedFinancing {
  interest_rate: number | null;
  loan_term_years: number | null;
  ltc_ratio: number | null;
  equity_pct: number | null;
  mortgage_amount: number | null;
  annual_debt_service: number | null;
  total_development_cost: number | null;
  land_cost: number | null;
  total_project_cost: number | null;
  payback_period_years: number | null;
  irr_on_equity: number | null;
  yearly_returns: YearlyReturn[];
}

export interface ParsedDevelopmentCost {
  line_item: string;
  category: string;
  per_unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
}

export interface SeasonalRate {
  season: string;
  rate: number | null;
}

export interface ParsedRateProjection {
  unit_type: string;
  is_subject: boolean;
  low_rate: number | null;
  peak_rate: number | null;
  avg_rate: number | null;
  quality_score: number | null;
  source: string | null;
  rate_category: string | null;
  seasonal_rates: SeasonalRate[] | null;
}

export interface MonthlyOccupancy {
  month: number;
  month_name: string;
  occupancy: number | null;
}

export interface ParsedOccupancyProjection {
  unit_type: string;
  stabilized_low_occ: number | null;
  stabilized_peak_occ: number | null;
  weighted_annual_occ: number | null;
  low_months: number | null;
  peak_months: number | null;
  ramp_up: Array<{ year: number; occupancy: number | null }>;
  monthly_occupancy: MonthlyOccupancy[] | null;
}

export interface ParsedMarketData {
  radius: string;
  population_2020: number | null;
  population_projected: number | null;
  population_growth_rate: number | null;
  households_2020: number | null;
  avg_household_size: number | null;
  median_household_income: number | null;
  per_capita_income: number | null;
}

export interface ParsedAssumption {
  category: string;
  label: string;
  value: string | number | null;
  notes: string | null;
}

export interface ParsedExpenseItem {
  category: string;
  label: string;
  yearly_amounts: Array<{ year: number; amount: number | null }>;
  per_unit: number | null;
  pct_of_revenue: number | null;
}

export interface ParsedWorkbook {
  study_id: string;
  filename: string;
  sheets_found: string[];
  warnings: string[];
  project_info: ParsedProjectInfo | null;
  comparables: ParsedComparable[];
  comp_units: ParsedCompUnit[];
  summaries: ParsedSummary[];
  property_scores: ParsedPropertyScore[];
  pro_forma_units: ParsedProFormaUnit[];
  valuation: ParsedValuation | null;
  financing: ParsedFinancing | null;
  development_costs: ParsedDevelopmentCost[];
  rate_projections: ParsedRateProjection[];
  occupancy_projections: ParsedOccupancyProjection[];
  market_data: ParsedMarketData[];
  assumptions: ParsedAssumption[];
  pro_forma_expenses: ParsedExpenseItem[];
}

/** Schema for heuristic column role inference. Used by sheet-layout-detector. */
export interface ColumnRoleSchema {
  role: string;
  keywords: string[];
  dataType?: 'string' | 'currency' | 'percent' | 'integer';
  required?: boolean;
}

/** Result of heuristic layout detection for a sheet section. */
export interface DetectedLayout {
  headerRowIndex: number;
  confidence: number;
  columnMap: Record<string, number>;
}

/** Configurable sheet name aliases. Keys match sheet roles; values are alternate names to try. */
export interface SheetAliasConfig {
  comps_summary?: string[];
  comps_grid?: string[];
  best_comps?: string[];
  ten_yr_pf?: string[];
  intake_form?: string[];
  financing?: string[];
  irr?: string[];
  total_project_cost?: string[];
  unit_costs?: string[];
  rates_projection?: string[];
  occupancy_projection?: string[];
  misc_expenses?: string[];
  market_profile?: string[];
  assumptions?: string[];
}
