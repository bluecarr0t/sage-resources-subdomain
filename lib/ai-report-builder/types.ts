/**
 * Types for the AI Report Builder (Create Report Draft MVP)
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
  study_id?: string;
  market_type?: string;
}

export interface BenchmarkRow {
  unit_category: string;
  avg_low_adr: number;
  avg_peak_adr: number;
  sample_count: number;
}

export interface EnrichedInput extends ReportDraftInput {
  benchmarks?: BenchmarkRow[];
  comparables_summary?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeneratedSections {
  executive_summary: string;
}
