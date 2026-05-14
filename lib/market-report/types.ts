export type MarketReportSegment = 'glamping' | 'rv_resort';

/** Normalized row for aggregation (all segments). */
export interface CohortPropertyRow {
  source: 'all_glamping_properties' | 'all_roverpass_data_new' | 'campspot' | 'hipcamp';
  sourceId: string | null;
  /** Property coordinates (for dedupe keys and future map). */
  geo_lat: number;
  geo_lng: number;
  property_name: string;
  city: string;
  state: string;
  property_type: string | null;
  unit_type: string | null;
  property_total_sites: number | null;
  quantity_of_units: number | null;
  distance_miles: number;
  rate_avg: number | null;
  winter_weekday: number | null;
  winter_weekend: number | null;
  spring_weekday: number | null;
  spring_weekend: number | null;
  summer_weekday: number | null;
  summer_weekend: number | null;
  fall_weekday: number | null;
  fall_weekend: number | null;
  occupancy: number | null;
  operating_season_months: string | null;
  url: string | null;
  /** Glamping: raw DB fields for amenity + RV site columns. */
  raw: Record<string, unknown> | null;
}

/** Per-table bbox fetch stats (before mile-radius filter). */
export interface MarketReportFetchSliceMeta {
  candidatesInBBox: number;
  hitRowCap: boolean;
  /** How many sequential id-cursor queries ran (1 if a single batch was enough). */
  chunksUsed: number;
}

export interface MarketReportFetchMeta {
  glamping?: MarketReportFetchSliceMeta;
  roverpass?: MarketReportFetchSliceMeta;
  campspot?: MarketReportFetchSliceMeta;
  hipcamp?: MarketReportFetchSliceMeta;
}

/** Cohort property location for map preview (subset may be returned when capped). */
export interface MarketReportMapPin {
  key: string;
  lat: number;
  lng: number;
  property_name: string;
  city: string;
  state: string;
  source: string;
  distance_miles: number;
  /** Primary average daily rate (USD); null when unknown. */
  rate_avg?: number | null;
  /** Listing URL for the property when available. */
  url?: string | null;
  /** Canonical unit type (humanized at render time). */
  unit_type?: string | null;
}

export type MarketReportScope = 'local' | 'national';

export interface MarketReportMeta {
  addressLine: string;
  anchorLat: number;
  anchorLng: number;
  /** Miles for `local` scope; 0 for `national`. */
  radiusMiles: number;
  segment: MarketReportSegment;
  propertyCount: number;
  sources: string[];
  generatedAt: string;
  /** When true, a bbox query hit the row cap; in-radius counts may be incomplete. */
  fetchPossiblyIncomplete: boolean;
  fetch?: MarketReportFetchMeta;
  /** Properties with valid coordinates (map pin universe). */
  mapPinsTotal: number;
  /** True when mapPins array is shorter than mapPinsTotal (server cap). */
  mapPinsTruncated: boolean;
  /** Local (radius around an address) vs national (US-wide). Defaults to 'local' when missing. */
  scope?: MarketReportScope;
  /** Inclusive lower bound applied to `rate_avg`; null when no floor. */
  adrMin?: number | null;
  /** Inclusive upper bound applied to `rate_avg`; null when no ceiling. */
  adrMax?: number | null;
  /**
   * Minimum sites (RV resort) or units (glamping) per property used for the cohort filter.
   */
  minSiteUnitCount?: number;
  /** Per-request cache freshness summary; absent for legacy responses. */
  cache?: {
    /** True when every backing fetch was served from cache. */
    cached: boolean;
    /** True when at least one (but not all) backing fetches were cached. */
    partiallyCached: boolean;
    /** ISO timestamp of the oldest cache write across the backing fetches. Null when nothing was cached. */
    oldestCachedAt: string | null;
  };
}

export interface MarketReportSections {
  marketSummary: MarketSummarySection;
  propertyAnalysis: PropertyAnalysisSection;
  rateAnalysis: RateAnalysisSection;
  amenityAnalysis: AmenityAnalysisSection;
  siteUnitAnalysis: SiteUnitAnalysisSection;
}

/** Per listing source: counts and averages for properties inside the radius. */
export interface MarketReportSourceBreakdownRow {
  source: string;
  sourceLabel: string;
  propertyCount: number;
  /** Sum of `property_total_sites` where present and greater than zero. */
  totalSites: number | null;
  /** Sum of `quantity_of_units` where present and greater than zero. */
  totalUnits: number | null;
  avgRetailDailyRate: number | null;
  avgOccupancy: number | null;
}

export interface MarketSummaryTopUnitTypeRow {
  unit_type: string;
  /**
   * Number of properties offering this unit type. Because the cohort is
   * deduped at `(source, property, unit_type)` grain upstream, one row =
   * one property × unit_type combination.
   */
  count: number;
  /**
   * Sum of `quantity_of_units` across the cohort for this unit type
   * (e.g. "5 yurts at Cedar Ridge + 3 yurts at Maple Lodge = 8 units").
   * Null when no row reports a positive quantity.
   */
  unitCount: number | null;
  /** Mean ADR (USD) for cohort rows of this unit type; null when no rates known. */
  meanAdr: number | null;
  /** Median ADR (USD) for cohort rows of this unit type; null when no rates known. */
  medianAdr: number | null;
}

export interface MarketSummarySection {
  propertyCount: number;
  radiusMiles: number;
  segment: MarketReportSegment;
  /** `source` is the internal cohort key; `sourceLabel` is the product name (Sage, RoverPass, Campspot). */
  sourceCounts: { source: string; sourceLabel: string; count: number }[];
  /** One row per source that appears in the cohort (stable display order). */
  sourceBreakdown: MarketReportSourceBreakdownRow[];
  topStates: { state: string; count: number }[];
  /** Sum of `property_total_sites` across the cohort (null when none reported). */
  totalSites: number | null;
  /** Top unit types by count, with median ADR for that unit type. Capped at 3. */
  topUnitTypesWithAdr: MarketSummaryTopUnitTypeRow[];
  /** Demand drivers (national parks, ski resorts, wineries) in the catchment. Local scope only. */
  demandDrivers?: import('./demand-drivers').DemandDriversResult | null;
  /** Anchor county economic + demographic snapshot. Local scope only. */
  countyMetrics?: import('./county-metrics').CountyMetricsResult | null;
  /** Composite opportunity scorecard. Local scope only. */
  opportunityScore?: import('./opportunity-score').OpportunityScore | null;
}

export interface PropertyAnalysisSection {
  meanTotalSites: number | null;
  medianTotalSites: number | null;
  topPropertyTypes: { property_type: string; count: number }[];
  /** Closest properties first, capped for UI */
  sample: {
    /** Stable key for React lists */
    key: string;
    property_name: string;
    city: string;
    state: string;
    distance_miles: number;
    property_total_sites: number | null;
    property_type: string | null;
    unit_type: string | null;
    source: string;
    sourceLabel: string;
    /** Listing URL for the property when known. */
    url: string | null;
  }[];
}

export interface RateAnalysisSection {
  propertiesWithPrimaryRate: number;
  meanAdr: number | null;
  medianAdr: number | null;
  p25: number | null;
  p75: number | null;
  minAdr: number | null;
  maxAdr: number | null;
  seasonalAverages: { key: string; average: number | null }[];
  /** When cohort rows include occupancy (e.g. RoverPass / Campspot). */
  occupancySummary?: {
    countWithOccupancy: number;
    meanOccupancy: number | null;
    medianOccupancy: number | null;
  };
}

export interface AmenityAnalysisSection {
  mode: 'glamping' | 'rv_limited';
  cohortSize?: number;
  /**
   * Glamping only. `pctOfCohort` = Yes / full cohort; `pctOfKnown` = Yes / rows with non-empty cell.
   */
  amenityRates?: {
    column: string;
    label: string;
    /** % of cohort with “Yes” (missing/empty treated as not yes). */
    pctOfCohort: number;
    /** % “Yes” among rows with a non-empty value for this column. */
    pctOfKnown: number;
    /** Rows with non-empty cell for this amenity. */
    withKnownValue: number;
    /** Rows with affirmative value. */
    yesCount: number;
    /**
     * Mean ARDR (USD) for properties where this amenity is affirmative, minus
     * the cohort-wide mean ARDR. Positive = amenity correlates with higher
     * rates; negative = lower. Null when fewer than 3 affirmative rows have a
     * valid rate (sample too small to be meaningful).
     */
    rateImpactUsd: number | null;
    /** Number of affirmative rows with a usable rate (drives rateImpactUsd). */
    rateImpactSampleSize: number;
  }[];
}

export interface SiteUnitAnalysisSection {
  /**
   * Top unit types by row count. `meanAdr`/`medianAdr` are computed from rows
   * that have a positive `rate_avg`; both are nullable when no rate samples
   * exist for that unit type.
   *
   * Optional on the type so existing exporters / fixtures that don't carry
   * rates remain valid (the current aggregator always populates them).
   */
  topUnitTypes: {
    unit_type: string;
    count: number;
    meanAdr?: number | null;
    medianAdr?: number | null;
    /** Min positive `rate_avg` for this unit type; null when no rate samples. */
    minAdr?: number | null;
    /** Max positive `rate_avg` for this unit type; null when no rate samples. */
    maxAdr?: number | null;
  }[];
  siteBuckets: { label: string; count: number }[];
  /** Glamping: non-null counts for key RV columns when present */
  rvFieldPresence?: { field: string; label: string; pct: number; withData: number }[];
}
