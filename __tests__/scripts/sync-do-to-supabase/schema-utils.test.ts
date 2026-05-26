import {
  buildUpsertSql,
  type TableMeta,
} from '../../../scripts/sync-do-to-supabase/upsert-sql';
import { getTableSyncMode } from '../../../scripts/sync-do-to-supabase/table-sync-config';
import { serializeRowValue } from '../../../scripts/sync-do-to-supabase/row-values';

function meta(partial: Partial<TableMeta> & Pick<TableMeta, 'primaryKey'>): TableMeta {
  return {
    schema: 'campspot',
    table: 'sites',
    columns: [
      { column_name: 'id', data_type: 'integer', udt_name: 'int4', is_nullable: 'NO', column_default: null, ordinal_position: 1 },
      { column_name: 'scraping_id', data_type: 'integer', udt_name: 'int4', is_nullable: 'NO', column_default: null, ordinal_position: 2 },
      { column_name: 'price', data_type: 'double precision', udt_name: 'float8', is_nullable: 'YES', column_default: null, ordinal_position: 3 },
      { column_name: 'updated_at', data_type: 'timestamp with time zone', udt_name: 'timestamptz', is_nullable: 'YES', column_default: null, ordinal_position: 4 },
    ],
    geometryColumns: [],
    ...partial,
  };
}

describe('buildUpsertSql', () => {
  it('generates composite primary key ON CONFLICT', () => {
    const { sql } = buildUpsertSql('campspot', meta({ primaryKey: ['id', 'scraping_id'] }), 1);
    expect(sql).toContain('ON CONFLICT (id, scraping_id) DO UPDATE SET');
    expect(sql).toContain('price = EXCLUDED.price');
    expect(sql).not.toContain('id = EXCLUDED.id');
  });

  it('falls back to INSERT without PK', () => {
    const { sql } = buildUpsertSql('hipcamp', meta({ primaryKey: [] }), 2);
    expect(sql).toContain('INSERT INTO hipcamp.sites');
    expect(sql).not.toContain('ON CONFLICT');
  });
});

describe('getTableSyncMode', () => {
  it('uses incremental for fact tables with updated_at', () => {
    expect(getTableSyncMode('campspot.sites', true, { full: false, replaceSnapshots: false })).toBe(
      'incremental'
    );
  });

  it('skips snapshot tables on weekly default', () => {
    expect(
      getTableSyncMode('hipcamp.old_data_table', false, { full: false, replaceSnapshots: false })
    ).toBe('skip_snapshot');
  });

  it('full_replace when replace-snapshots', () => {
    expect(
      getTableSyncMode('campspot.old_data_table', false, { full: false, replaceSnapshots: true })
    ).toBe('full_replace');
  });
});

describe('serializeRowValue', () => {
  it('stringifies jsonb objects', () => {
    const col = {
      column_name: 'amenities',
      data_type: 'jsonb',
      udt_name: 'jsonb',
      is_nullable: 'YES',
      column_default: null,
      ordinal_position: 1,
    };
    expect(serializeRowValue({ a: 1 }, col)).toBe('{"a":1}');
  });
});
