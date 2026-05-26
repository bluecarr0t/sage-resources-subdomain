/** Pure SQL builders (no pg import) — safe for Jest unit tests. */

export interface ColumnMeta {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
}

export interface TableMeta {
  schema: string;
  table: string;
  columns: ColumnMeta[];
  primaryKey: string[];
  geometryColumns: string[];
}

export function buildUpsertSql(
  targetSchema: string,
  meta: TableMeta,
  rowCount: number
): { sql: string; columnCount: number } {
  const columns = meta.columns.map((c) => c.column_name);
  const colList = columns.join(', ');
  const columnCount = columns.length;

  const values: string[] = [];
  for (let row = 0; row < rowCount; row++) {
    const base = row * columnCount;
    const placeholders = columns.map((col, colIdx) => {
      const param = base + colIdx + 1;
      return meta.geometryColumns.includes(col)
        ? `ST_GeomFromText($${param}, 4326)::geometry`
        : `$${param}`;
    });
    values.push(`(${placeholders.join(', ')})`);
  }

  const updateCols = columns
    .filter((c) => !meta.primaryKey.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`);

  if (meta.primaryKey.length === 0) {
    return {
      sql: `INSERT INTO ${targetSchema}.${meta.table} (${colList}) VALUES ${values.join(', ')}`,
      columnCount,
    };
  }

  const conflict = `ON CONFLICT (${meta.primaryKey.join(', ')}) DO UPDATE SET ${updateCols.join(', ')}`;
  return {
    sql: `INSERT INTO ${targetSchema}.${meta.table} (${colList}) VALUES ${values.join(', ')} ${conflict}`,
    columnCount,
  };
}
