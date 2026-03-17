/**
 * Types for the AI Report Builder (Create Report Draft)
 */

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
  /** Open property & client brief: parcel, amenities, client goals, and any context for AI research and report generation */
  amenities_description?: string;
  /** Whether to include web research in enrichment */
  include_web_research?: boolean;
  /** Report service type (e.g. Feasibility Study, Appraisal) */
  service?: string;
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
  distance_miles: number;
  source_table: string;
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

export interface WeatherData {
  /** Resolved weatherspark.com URL */
  url: string;
  /** Extracted climate prose (temperature, precipitation, comfort, tourism score) */
  climate_text: string;
  /** Image URLs extracted from the page (may be empty for Canvas-rendered charts) */
  image_urls: string[];
  city: string;
  state: string;
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

export interface GeneratedSections {
  executive_summary: string;
  citations?: Citation[];
  letter_of_transmittal?: string;
  swot_analysis?: string;
  site_analysis?: string;
  /** Expanded Demand Indicators writeup (multi-paragraph, weather-enriched) */
  demand_indicators?: string;
}
