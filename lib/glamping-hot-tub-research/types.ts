/** Confidence tier for scraped + LLM hot tub research. */
export type HotTubConfidence = 'high' | 'medium' | 'low';

export type YesNo = 'Yes' | 'No';

/** One row from `all_glamping_properties` in the research cohort. */
export type HotTubCohortRow = {
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
  unit_hot_tub: string | null;
  property_hot_tub: string | null;
  unit_hot_tub_or_sauna: string | null;
  unit_sauna: string | null;
  discovery_source: string | null;
  notes: string | null;
  quantity_of_units: number | null;
};

export type HotTubUnitMatch = {
  site_name: string | null;
  unit_type: string | null;
};

export type HotTubUnitExtraction = {
  match: HotTubUnitMatch;
  unit_hot_tub: YesNo | null;
  unit_sauna: YesNo | null;
  evidence: string;
  confidence: HotTubConfidence;
};

export type HotTubPropertyExtraction = {
  property_hot_tub: YesNo | null;
  property_spa_notes: string;
  units: HotTubUnitExtraction[];
  sources: string[];
  confidence: HotTubConfidence;
};

export type RowUpdatePayload = {
  id: number;
  property_id: string;
  updates: Record<string, string>;
};

export type HotTubConflict = {
  kind: 'value_mismatch' | 'low_confidence' | 'unmatched_row';
  property_id: string;
  property_name: string | null;
  row_id: number | null;
  field: string;
  existing_value: string | null;
  proposed_value: string | null;
  confidence: HotTubConfidence;
  evidence: string;
  source_url: string | null;
};

export type ApplyResult = {
  applied: RowUpdatePayload[];
  conflicts: HotTubConflict[];
  unmatched_row_ids: number[];
  scrape_url: string | null;
  skip_reason?: string;
};

export type PropertyResearchResult = {
  property_id: string;
  property_name: string | null;
  row_count: number;
  extraction: HotTubPropertyExtraction | null;
  apply: ApplyResult;
  markdown_chars: number;
};
