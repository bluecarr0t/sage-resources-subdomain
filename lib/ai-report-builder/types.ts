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
  /** Description of planned amenities */
  amenities_description?: string;
  /** Whether to include web research in enrichment */
  include_web_research?: boolean;
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

export interface EnrichedInput extends ReportDraftInput {
  benchmarks?: BenchmarkRow[];
  comparables_summary?: string;
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
}
