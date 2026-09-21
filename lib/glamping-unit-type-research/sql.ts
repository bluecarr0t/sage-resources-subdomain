import type { AcceptedUnit } from '@/lib/glamping-unit-type-research/accept';
import type { MissingUnitRow } from '@/lib/glamping-unit-type-research/cohort';

export const UNIT_TYPE_RESEARCH_TAG = 'web_research_unit_type_2026_09';

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function discoverySql(): string {
  return [
    `  discovery_source = CASE`,
    `    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN ${sqlString(UNIT_TYPE_RESEARCH_TAG)}`,
    `    WHEN discovery_source ILIKE ${sqlString(`%${UNIT_TYPE_RESEARCH_TAG}%`)} THEN discovery_source`,
    `    ELSE discovery_source || ${sqlString(`; ${UNIT_TYPE_RESEARCH_TAG}`)}`,
    `  END`,
  ].join('\n');
}

export function canonicalSiteNameUpdatesToSql(rows: MissingUnitRow[]): string {
  const fills = rows.filter((row) => row.canonicalFromSiteName && row.queue === 'named_site');
  const lines = [
    '-- Fill unit_type from a site_name that is already a canonical product label.',
    '-- Review before apply. Does not write by itself.',
    `-- Rows: ${fills.length}`,
    '',
  ];
  for (const row of fills) {
    const unitType = row.canonicalFromSiteName;
    if (!unitType) continue;
    lines.push(
      `-- ${row.propertyName} / ${row.siteName}`,
      `UPDATE public.all_sage_data SET`,
      `  unit_type = ${sqlString(unitType)},`,
      `  date_updated = CURRENT_DATE,`,
      discoverySql(),
      `WHERE id = ${row.id}`,
      `  AND (unit_type IS NULL OR btrim(unit_type) = '');`,
      ''
    );
  }
  return lines.join('\n');
}

export type ResearchedUnitUpdate = {
  row: MissingUnitRow;
  units: AcceptedUnit[];
  sourceUrl: string;
  /** State-park placeholders keep a null unit_type. New lodging rows are inserts. */
  insertOnly: boolean;
};

export function researchedUnitsToSql(updates: ResearchedUnitUpdate[], runDate: string): string {
  const lines = [
    '-- Unit-type research (review before apply). Does not write by itself.',
    `-- Properties: ${updates.length}`,
    '',
  ];

  for (const update of updates) {
    update.units.forEach((unit, index) => {
      const note = `Unit type research (${runDate}): ${unit.unitType}${
        unit.quantity != null ? ` x ${unit.quantity}` : ''
      } — ${update.sourceUrl} — "${unit.quote.replace(/\s+/g, ' ').trim()}"`;
      const quantitySql =
        unit.quantity != null ? `,\n  quantity_of_units = ${unit.quantity}` : '';
      if (index === 0 && !update.insertOnly) {
        lines.push(
          `-- ${update.row.propertyName}: set blank row to ${unit.unitType}`,
          `UPDATE public.all_sage_data SET`,
          `  unit_type = ${sqlString(unit.unitType)},`,
          `  site_name = CASE WHEN site_name IS NULL OR btrim(site_name) = '' THEN ${sqlString(unit.siteName)} ELSE site_name END,`,
          `  date_updated = ${sqlString(runDate)},`,
          `${discoverySql()},`,
          `  notes = COALESCE(notes, '') || E'\\n\\n' || ${sqlString(note)}${quantitySql}`,
          `WHERE id = ${update.row.id}`,
          `  AND (unit_type IS NULL OR btrim(unit_type) = '');`,
          ''
        );
        return;
      }
      lines.push(
        `-- ${update.row.propertyName}: add ${unit.unitType}`,
        `INSERT INTO public.all_sage_data`,
        `SELECT (jsonb_populate_record(NULL::public.all_sage_data, to_jsonb(src) || jsonb_build_object(`,
        `  'id', nextval('all_glamping_properties_new_id_seq1'),`,
        `  'unit_type', ${sqlString(unit.unitType)},`,
        `  'site_name', ${sqlString(unit.siteName)},`,
        `  'quantity_of_units', ${unit.quantity == null ? 'NULL' : String(unit.quantity)},`,
        `  'slug', NULL,`,
        `  'date_updated', ${sqlString(runDate)},`,
        `  'discovery_source', CASE`,
        `    WHEN src.discovery_source IS NULL OR btrim(src.discovery_source) = '' THEN ${sqlString(UNIT_TYPE_RESEARCH_TAG)}`,
        `    WHEN src.discovery_source ILIKE ${sqlString(`%${UNIT_TYPE_RESEARCH_TAG}%`)} THEN src.discovery_source`,
        `    ELSE src.discovery_source || ${sqlString(`; ${UNIT_TYPE_RESEARCH_TAG}`)}`,
        `  END,`,
        `  'notes', COALESCE(src.notes, '') || E'\\n\\n' || ${sqlString(note)}`,
        `))).*`,
        `FROM public.all_sage_data src`,
        `WHERE src.id = ${update.row.id};`,
        ''
      );
    });
  }

  return lines.join('\n');
}
