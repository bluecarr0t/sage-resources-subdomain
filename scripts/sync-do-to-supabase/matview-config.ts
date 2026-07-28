/**
 * Campings matviews snapshotted into Supabase as regular tables.
 * Kept free of `pg` imports so unit tests can load this module safely.
 */

export interface MatviewSnapshotSpec {
  schema: string;
  name: string;
}

/** Matviews on campings DB that analytics / flat transform read from Supabase. */
export const CAMPINGS_MATVIEW_SNAPSHOTS: MatviewSnapshotSpec[] = [
  { schema: 'campspot', name: 'site_monthly_analytics' },
  { schema: 'campspot', name: 'site_yearly_analytics' },
  { schema: 'campspot', name: 'latest_sites' },
  { schema: 'hipcamp', name: 'site_monthly_analytics' },
  { schema: 'hipcamp', name: 'site_yearly_analytics' },
  { schema: 'hipcamp', name: 'latest_sites' },
];
