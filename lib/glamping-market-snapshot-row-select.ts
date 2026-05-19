/** Columns required for market-overview regional aggregates (must include `unit_type` for inventory filters). */
export const GLAMPING_MARKET_SNAPSHOT_US_STATE_SELECT =
  'property_name, unit_type, state, country, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate' as const;

export const GLAMPING_MARKET_SNAPSHOT_CA_PROVINCE_SELECT =
  'property_name, unit_type, state, country, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate' as const;
