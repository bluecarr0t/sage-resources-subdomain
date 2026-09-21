import { YEAR_OPENED_RESEARCH_TAG } from '@/lib/glamping-year-opened-research/accept';
import { YEAR_OPENED_TABLE } from '@/lib/glamping-year-opened-research/cohort';

export type YearOpenedSqlUpdate = {
  propertyId: string;
  propertyName: string;
  year: number;
  openedOn: string | null;
  quote: string;
  sourceUrl: string;
};

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function yearOpenedUpdatesToSql(
  updates: YearOpenedSqlUpdate[],
  runDate: string
): string {
  const lines = [
    '-- Open-year research (review before apply). Does not write by itself.',
    `-- Rows are property-level: every still-blank unit row for the property.`,
    `-- Updates: ${updates.length}`,
    '',
  ];

  for (const update of updates) {
    const note = `Open year research (${runDate}): ${update.year}${
      update.openedOn ? ` (${update.openedOn})` : ''
    } — ${update.sourceUrl} — "${update.quote.replace(/\s+/g, ' ').trim()}"`;
    const openedSql = update.openedOn ? `DATE ${sqlString(update.openedOn)}` : 'NULL';
    lines.push(
      `-- ${update.propertyName}`,
      `UPDATE public.${YEAR_OPENED_TABLE} SET`,
      `  year_site_opened = ${update.year},`,
      `  site_opened_on = ${openedSql},`,
      `  date_updated = ${sqlString(runDate)},`,
      `  discovery_source = CASE`,
      `    WHEN discovery_source IS NULL OR btrim(discovery_source) = '' THEN ${sqlString(YEAR_OPENED_RESEARCH_TAG)}`,
      `    WHEN discovery_source ILIKE ${sqlString(`%${YEAR_OPENED_RESEARCH_TAG}%`)} THEN discovery_source`,
      `    ELSE discovery_source || ${sqlString(`; ${YEAR_OPENED_RESEARCH_TAG}`)}`,
      `  END,`,
      `  notes = COALESCE(notes, '') || E'\\n\\n' || ${sqlString(note)}`,
      `WHERE property_id = ${sqlString(update.propertyId)}`,
      `  AND year_site_opened IS NULL`,
      `  AND is_glamping_property = 'Yes'`,
      `  AND research_status = 'published';`,
      ''
    );
  }

  return lines.join('\n');
}
