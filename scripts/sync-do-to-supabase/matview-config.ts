/**
 * Campings matviews snapshotted into Supabase as regular tables.
 * Kept free of `pg` imports so unit tests can load this module safely.
 */

export interface MatviewSnapshotSpec {
  schema: string;
  name: string;
  /**
   * Natural unique key used for keyset pagination + upsert conflict target.
   * Required because DO matviews have no primary key; paginating by the first
   * column alone skips millions of rows.
   */
  uniqueKey: string[];
}

/** Matviews on campings DB that analytics / flat transform read from Supabase. */
export const CAMPINGS_MATVIEW_SNAPSHOTS: MatviewSnapshotSpec[] = [
  {
    schema: 'campspot',
    name: 'site_monthly_analytics',
    uniqueKey: ['property_id', 'site_id', 'year', 'month'],
  },
  {
    schema: 'campspot',
    name: 'site_yearly_analytics',
    uniqueKey: ['property_id', 'site_id', 'year'],
  },
  {
    schema: 'campspot',
    name: 'latest_sites',
    uniqueKey: ['property_id', 'site_id'],
  },
  {
    schema: 'hipcamp',
    name: 'site_monthly_analytics',
    uniqueKey: ['property_id', 'site_id', 'year', 'month'],
  },
  {
    schema: 'hipcamp',
    name: 'site_yearly_analytics',
    uniqueKey: ['property_id', 'site_id', 'year'],
  },
  {
    schema: 'hipcamp',
    name: 'latest_sites',
    uniqueKey: ['property_id', 'site_id'],
  },
];
