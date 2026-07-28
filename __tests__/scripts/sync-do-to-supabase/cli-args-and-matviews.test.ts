import { parseSyncCliArgs } from '../../../scripts/sync-do-to-supabase/cli-args';
import { CAMPINGS_MATVIEW_SNAPSHOTS } from '../../../scripts/sync-do-to-supabase/matview-config';
import { shouldSkipLargeTable } from '../../../scripts/sync-do-to-supabase/table-sync-config';

describe('parseSyncCliArgs', () => {
  it('defaults to campings and skips large tables', () => {
    const opts = parseSyncCliArgs([], {});
    expect([...opts.databases]).toEqual(['campings']);
    expect(opts.includeLarge).toBe(false);
  });

  it('enables large tables only with --include-large', () => {
    expect(parseSyncCliArgs(['--include-large'], {}).includeLarge).toBe(true);
  });

  it('enables large tables when SYNC_INCLUDE_LARGE_DEFAULT=1', () => {
    expect(parseSyncCliArgs([], { SYNC_INCLUDE_LARGE_DEFAULT: '1' }).includeLarge).toBe(true);
  });

  it('--no-large wins over env and --include-large', () => {
    expect(
      parseSyncCliArgs(['--include-large', '--no-large'], { SYNC_INCLUDE_LARGE_DEFAULT: '1' })
        .includeLarge
    ).toBe(false);
  });

  it('parses database and table filters', () => {
    const opts = parseSyncCliArgs(
      ['--databases=hipcamp,campspot', '--tables=dates,sites'],
      {}
    );
    expect([...opts.databases].sort()).toEqual(['campspot', 'hipcamp']);
    expect(opts.tables?.has('dates')).toBe(true);
    expect(opts.tables?.has('sites')).toBe(true);
  });
});

describe('shouldSkipLargeTable with condensed default', () => {
  it('skips campspot.sites when includeLarge is false', () => {
    expect(shouldSkipLargeTable('campspot.sites', false, 'campings')).toBe(true);
    expect(shouldSkipLargeTable('hipcamp.propertys', false, 'campings')).toBe(true);
  });

  it('includes campspot.sites when includeLarge is true', () => {
    expect(shouldSkipLargeTable('campspot.sites', true, 'campings')).toBe(false);
  });
});

describe('CAMPINGS_MATVIEW_SNAPSHOTS', () => {
  it('includes monthly, yearly, and latest_sites for hipcamp and campspot', () => {
    const keys = CAMPINGS_MATVIEW_SNAPSHOTS.map((s) => `${s.schema}.${s.name}`).sort();
    expect(keys).toEqual(
      [
        'campspot.latest_sites',
        'campspot.site_monthly_analytics',
        'campspot.site_yearly_analytics',
        'hipcamp.latest_sites',
        'hipcamp.site_monthly_analytics',
        'hipcamp.site_yearly_analytics',
      ].sort()
    );
  });
});
