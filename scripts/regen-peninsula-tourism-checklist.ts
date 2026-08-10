#!/usr/bin/env npx tsx
/**
 * Inject TOUR-0N placeholders + write companion author-checklist.md for Peninsula, OH.
 */
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config();

async function main() {
  const { assembleDraftDocx, clearTemplateCache } = await import(
    '@/lib/ai-report-builder/assemble-docx'
  );
  const { buildTourismAuthorChecklistMarkdown } = await import(
    '@/lib/ai-report-builder/tourism-author-checklist'
  );

  clearTemplateCache();
  const studyId = 'DRAFT-20260810-tourism-checklist';
  const input = {
    property_name: 'Nordic Wellness Glamping & Christmas Tree Farm',
    city: 'Peninsula',
    state: 'OH',
    zip_code: '44264',
    address_1: '6050 Riverview Rd',
    parcel_number: '1100539',
    client_entity: 'Heritage Farms',
    client_contact_name: 'David Baiko',
    resort_type: 'Glamping- Wellness',
    unit_mix: [
      { type: 'Cabin', count: 8 },
      { type: 'Safari Tent', count: 6 },
    ],
    study_id: studyId,
    market_type: 'glamping' as const,
    latitude: 41.2382085,
    longitude: -81.5560433,
    county: 'Summit County',
  };

  const demand = `=== Weather ===
Peninsula climate supports a summer-peak outdoor lodging season.

=== Tourism Trends ===
Regional tourism is anchored by Cuyahoga Valley National Park and Northeast Ohio drive-time markets. Replace TN template overnight-trip figures with Ohio visitor-profile graphics (see TOUR checklist).

=== Demand Analysis Conclusion ===
Overall demand indicators are supportive pending author tourism-figure updates.`;

  console.log('Assembling DOCX…');
  const { buffer, diagnostics } = await assembleDraftDocx(
    input as never,
    {
      executive_summary: '=== Project Overview ===\nOverview.\n\n=== Demand Indicators ===\nPositive.',
      area_analysis: '=== Overview ===\nPeninsula, Summit County, Ohio.',
      letter_of_transmittal: '',
      swot_analysis:
        '=== Strengths ===\nLocation.\n=== Weaknesses ===\nSeasonality.\n=== Opportunities ===\nTourism.\n=== Threats ===\nCompetition.',
      site_analysis: 'Site analysis pending.',
      demand_indicators: demand,
      supply_competition: 'Supply pending.',
      industry_overview: 'Industry pending.',
    },
    {
      marketType: 'glamping',
      companionWorkbookFileName: `${studyId}-template.xlsx`,
    }
  );

  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const docxPath = path.join(outDir, `${studyId}-report.docx`);
  fs.writeFileSync(docxPath, buffer);

  const checklist = buildTourismAuthorChecklistMarkdown({
    studyId,
    propertyName: input.property_name,
    city: input.city,
    state: input.state,
    county: input.county,
    companionDocxFileName: `${studyId}-report.docx`,
    companionXlsxFileName: `${studyId}-template.xlsx`,
  });
  const checklistPath = path.join(outDir, `${studyId}-author-checklist.md`);
  fs.writeFileSync(checklistPath, checklist, 'utf8');

  console.log('Wrote', docxPath);
  console.log('Wrote', checklistPath);
  console.log('tourismPlaceholdersInjected', diagnostics.tourismPlaceholdersInjected);
  console.log('tourismDrawingsStripped', diagnostics.tourismDrawingsStripped);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
