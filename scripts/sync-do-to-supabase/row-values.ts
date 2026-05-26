import type { ColumnMeta } from './schema-utils';

const JSON_COLUMNS = new Set([
  'recommends',
  'sites_count',
  'core_amenities',
  'activities',
  'basic_amenities',
  'policies',
  'rv_types',
  'categories',
  'discounts',
  'seasonal_rates',
  'config',
  'amenities',
  'terrain',
  'rv_details',
  'rv_amenities',
  'category_list',
  'capacity',
  'rates',
  'season_rates',
]);

export function serializeRowValue(val: unknown, column: ColumnMeta): unknown {
  if (val === null || val === undefined) return null;

  const col = column.column_name;

  if (column.udt_name === 'json' || column.udt_name === 'jsonb') {
    if (typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'string') {
      if (!val.trim()) return null;
      try {
        JSON.parse(val);
        return val;
      } catch {
        return null;
      }
    }
  }

  if (JSON_COLUMNS.has(col) && typeof val === 'string') {
    if (!val.trim()) return null;
    try {
      JSON.parse(val);
      return val;
    } catch {
      return null;
    }
  }

  if (typeof val === 'string' && val === '') return null;

  if (column.udt_name === 'bool') {
    if (val === 't' || val === 'true') return true;
    if (val === 'f' || val === 'false') return false;
  }

  return val;
}
