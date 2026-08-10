/**
 * Types for the AI Report Builder (Create Report Draft)
 */

import type { FeasibilityModelOutput } from '@/lib/feasibility-model';
import type { CompRadiusPivotsResult } from './comp-radius-pivots';
import type { DriveTimeDemographicsResult } from './drive-time-demographics';
import type { NearestAirportResult } from './nearest-airport';
import type { SiteRiskResult } from './site-risk';
import type { StvrIndicators } from './stvr-indicators';
import type { TourismEconomicsResult } from './tourism-economics';

export interface ReportDraftInput {
  property_name: string;
  city: string;
  state: string;
  zip_code?: string;
  address_1?: string;
  acres?: number;
  unit_mix: Array<{ type: string; count: number }>;
  client_entity?: string;
  /** Client contact name for letter of transmittal */
  client_contact_name?: string;
  /** Client phone (engagement letter / ToT Owner Summary) */
  client_phone?: string;
  /** Client email (engagement letter; written with phone on ToT when no email column) */
  client_email?: string;
  /** Client mailing address */
  client_address?: string;
  /** Client city, state, zip */
  client_city_state_zip?: string;
  /** Salutation for the client (e.g. "Mr. Smith") */
  client_salutation?: string;
  study_id?: string;
  market_type?: string;
  /** Property parcel number */
  parcel_number?: string;
  /** Resort type from engagement letter (e.g. Glamping- Wellness) */
  resort_type?: string;
  /** Intended use of the study / purpose of the report */
  intended_use_of_study?: string;
  /** Engagement letter acceptance date (YYYY-MM-DD when known) */
  engagement_date?: string;
  /** Open property & client brief: parcel, amenities, client goals, and any context for AI research and report generation */
  amenities_description?: string;
  /** Whether to include web research in enrichment */
  include_web_research?: boolean;
  /** Report service type (e.g. Feasibility Study, Appraisal) */
  service?: string;
  /** County name when known */
  county?: string;
  /** Loan-to-cost fraction (e.g. 0.75) */
  loan_to_cost?: number;
  /** Annual interest rate as percent (e.g. 9.5) */
  interest_rate_pct?: number;
  /** Loan term in years */
  loan_term_years?: number;
  /** Land / acquisition cost basis */
  land_cost?: number;
  /** Soft-cost fraction of hard costs (default 0.15 when unset) */
  soft_cost_pct?: number;
  /** Assessment ratio for RE taxes (e.g. 0.5) */
  assessment_ratio?: number;
  /** Mill levy / tax rate as percent (e.g. 4.9846) */
  mill_levy_pct?: number;
  /**
   * Whether the signing appraiser / team made a personal site visit.
   * Drives Certification ("have" / "have not") and Scope of Work visit bullet.
   */
  site_visit_conducted?: boolean;
  /**
   * When true, Letter of Transmittal uses the "ownership provided limited cost
   * information" extraordinary-assumption variant.
   */
  client_provided_cost_info?: boolean;
  /** Names credited for significant professional assistance on Certification */
  report_assistants?: string;
  /** Override for the prior-services Certification disclosure sentence */
  prior_services_disclosure?: string;
}

export interface BenchmarkRow {
  unit_category: string;
  avg_low_adr: number;
  avg_peak_adr: number;
  sample_count: number;
}

export interface EnrichmentMetadata {
  benchmark_sample_count: number;
  benchmark_categories: string[];
  enrichment_date: string;
  data_sources: string[];
}

export interface SeasonalRates {
  winter_weekday: number | null;
  winter_weekend: number | null;
  spring_weekday: number | null;
  spring_weekend: number | null;
  summer_weekday: number | null;
  summer_weekend: number | null;
  fall_weekday: number | null;
  fall_weekend: number | null;
}

export interface ComparableProperty {
  property_name: string;
  city: string;
  state: string;
  unit_type: string | null;
  property_total_sites: number | null;
  quantity_of_units: number | null;
  avg_retail_daily_rate: number | null;
  high_rate: number | null;
  low_rate: number | null;
  seasonal_rates: SeasonalRates;
  operating_season_months: string | null;
  url: string | null;
  description: string | null;
  /** Street / place line parsed from web research (optional). */
  location_detail?: string | null;
  /** Miles from search anchor; null when unknown (e.g. web gap-fill before geocode). */
  distance_miles: number | null;
  /**
   * Distance recorded in the original past study (relative to that study's subject).
   * Not comparable to the current subject — use `distance_miles` for ranking.
   */
  original_study_distance_miles?: number | null;
  source_table: string;
  /** WGS84 when known (e.g. comps map markers). */
  geo_lat?: number | null;
  geo_lng?: number | null;
  /**
   * After merge dedupe: true when any merged row was Tavily/Firecrawl gap-fill (map + filters use Web Research styling).
   */
  web_research_supplement?: boolean;
  /** Occupancy rate from Hipcamp / Campspot / RoverPass when present (decimal or percent per source). */
  market_occupancy_rate?: number | null;
  /** Amenities list (from past reports or web research) */
  amenities?: string | null;
  /** Quality score from past report analysis (0-10) */
  quality_score?: number | null;
  /** Study ID linking to the past report this comp came from */
  past_report_study_id?: string | null;
  /** Occupancy data from past reports */
  low_occupancy?: number | null;
  peak_occupancy?: number | null;
}

export interface WeatherChartImageData {
  key: 'temperature' | 'precip' | 'snowfall' | 'tourism';
  title: string;
  /** PNG bytes captured from WeatherSpark SVG figures */
  buffer: Buffer;
  ext: 'png';
  width: number;
  height: number;
}

export interface WeatherData {
  /** Resolved weatherspark.com URL */
  url: string;
  /** Extracted climate prose (temperature, precipitation, comfort, tourism score) */
  climate_text: string;
  /** Image URLs extracted from the page (may be empty for Canvas-rendered charts) */
  image_urls: string[];
  /**
   * Rasterized WeatherSpark figure charts (temp / precip / snow / tourism).
   * Preferred over image_urls when present — charts are SVG-drawn, not static assets.
   */
  chart_images?: WeatherChartImageData[];
  city: string;
  state: string;
}

/** County metrics from county-population + county-gdp */
export interface CountyMetricsBlock {
  county_name: string;
  state_abbr: string;
  population_2020: number | null;
  population_change_pct: number | null;
  gdp_2023: number | null;
  gdp_growth_maa_pct: number | null;
  high_confidence: boolean;
  source: string;
  fetched_at: string;
}

/** Compact demand-drivers snapshot for enrich / prompts / Excel+Word tables */
export interface DemandDriverItemBlock {
  name: string;
  state: string | null;
  distance_miles: number;
  visitors: number | null;
  site_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DemandDriversBlock {
  national_parks: {
    count: number;
    top_names: string[];
    items: DemandDriverItemBlock[];
    radius_miles: number;
  };
  ski_resorts: {
    count: number;
    top_names: string[];
    items: DemandDriverItemBlock[];
    radius_miles: number;
  };
  wineries: {
    count: number;
    top_names: string[];
    items: DemandDriverItemBlock[];
    radius_miles: number;
  };
  major_outdoor_sites: {
    count: number;
    top_names: string[];
    items: DemandDriverItemBlock[];
    radius_miles: number;
  };
  major_cities: {
    count: number;
    top_names: string[];
    items: DemandDriverItemBlock[];
    radius_miles: number;
  };
  source: string;
  fetched_at: string;
}

export interface EnrichedInput extends ReportDraftInput {
  benchmarks?: BenchmarkRow[];
  comparables_summary?: string;
  nearby_comps?: ComparableProperty[];
  latitude?: number;
  longitude?: number;
  web_context?: string;
  enrichment_metadata?: EnrichmentMetadata;
  /** State-level population from county-population (Census) */
  population_2010?: number;
  population_2020?: number;
  population_change_pct?: number;
  /** State-level GDP from county-gdp (BEA) */
  gdp_2022?: number;
  gdp_2023?: number;
  /** From Census API (when CENSUS_API_KEY set) */
  census_population?: number;
  census_median_household_income?: number;
  /** WeatherSpark climate data for Demand Indicators section */
  weather_data?: WeatherData;
  /** Phase 2: county-level metrics */
  county_metrics?: CountyMetricsBlock;
  /** Phase 2: parks / outdoor / ski / wineries / cities */
  demand_drivers?: DemandDriversBlock;
  /** Phase 2: drive-time demographic rings + demand rubric */
  drive_time_demographics?: DriveTimeDemographicsResult;
  /** Phase 2: FEMA / wetlands / wildfire */
  site_risk?: SiteRiskResult;
  /** Phase 2: Hipcamp/Campspot occ (+ optional AirDNA) */
  stvr_indicators?: StvrIndicators;
  /** Phase 2: radius supply pivots */
  comp_radius_pivots?: CompRadiusPivotsResult;
  /** Phase 2: nearest major airport */
  nearest_airport?: NearestAirportResult;
  /** Phase 2: tourism economics cache */
  tourism_economics?: TourismEconomicsResult;
}

export interface Citation {
  claim: string;
  source: string;
}

export interface ExecutiveSummaryStructured {
  project_overview: string;
  demand_indicators: string;
  pro_forma_reference: string;
  feasibility_conclusion: string;
  citations: Citation[];
}

/** Development Costs data for Report Builder DOCX/XLSX sections */
export interface DevelopmentCostsData {
  siteDevCosts: {
    totalRVSites: number;
    totalGlampingUnits: number;
    rvTotal: number;
    glampingTotal: number;
    lineItems: Array<{ name: string; quantity: number; costPerUnit: number; subtotal: number }>;
  };
  unitCosts: {
    items: Array<{ name: string; qty: number; costPerUnit: number; subtotal: number }>;
    total: number;
  };
  addBldgImprovements: {
    items: Array<{ name: string; sf?: number; costPerSf?: number; total: number }>;
    total: number;
  };
  totalProjectCost: {
    siteDev: number;
    unitCosts: number;
    addBldg: number;
    hardCosts: number;
    softCosts: number;
    land: number;
    total: number;
  };
}

export interface GeneratedSections {
  executive_summary: string;
  citations?: Citation[];
  letter_of_transmittal?: string;
  swot_analysis?: string;
  site_analysis?: string;
  /** Expanded Demand Indicators writeup (multi-paragraph, weather-enriched) */
  demand_indicators?: string;
  /** Area Analysis (state / county / local) */
  area_analysis?: string;
  /** Supply and Competition Analysis */
  supply_competition?: string;
  /** Industry Overview (boilerplate + light polish) */
  industry_overview?: string;
  /** Development Costs tables for DOCX section and Cost Analysis XLSX */
  development_costs_data?: DevelopmentCostsData;
  /** Deterministic financial model output for PF / feasibility sections */
  model_output?: FeasibilityModelOutput;
}
