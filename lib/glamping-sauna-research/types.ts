/** Confidence tier for scraped + LLM sauna research. */
export type SaunaConfidence = 'high' | 'medium' | 'low';

export type YesNo = 'Yes' | 'No';

/** One row from `all_glamping_properties` in the research cohort. */
export type SaunaCohortRow = {
  id: number;
  property_id: string;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
  url: string | null;
  ota_url_hipcamp: string | null;
  ota_url_airbnb: string | null;
  description: string | null;
  amenities_raw: string | null;
  unit_sauna: string | null;
  property_sauna: string | null;
  unit_hot_tub_or_sauna: string | null;
  discovery_source: string | null;
  notes: string | null;
  quantity_of_units: number | null;
};

export type SaunaUnitMatch = {
  site_name: string | null;
  unit_type: string | null;
};

export type SaunaUnitExtraction = {
  match: SaunaUnitMatch;
  unit_sauna: YesNo | null;
  evidence: string;
  confidence: SaunaConfidence;
};

export type SaunaPropertyExtraction = {
  property_sauna: YesNo | null;
  property_sauna_notes: string;
  units: SaunaUnitExtraction[];
  sources: string[];
  confidence: SaunaConfidence;
};

export type RowUpdatePayload = {
  id: number;
  property_id: string;
  updates: Record<string, string>;
};

export type SaunaConflict = {
  kind: 'value_mismatch' | 'low_confidence' | 'unmatched_row';
  property_id: string;
  property_name: string | null;
  row_id: number | null;
  field: string;
  existing_value: string | null;
  proposed_value: string | null;
  confidence: SaunaConfidence;
  evidence: string;
  source_url: string | null;
};

export type ApplyResult = {
  applied: RowUpdatePayload[];
  conflicts: SaunaConflict[];
  unmatched_row_ids: number[];
  scrape_url: string | null;
  skip_reason?: string;
};

export type PropertyResearchResult = {
  property_id: string;
  property_name: string | null;
  row_count: number;
  extraction: SaunaPropertyExtraction | null;
  apply: ApplyResult;
  markdown_chars: number;
};
