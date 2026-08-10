#!/usr/bin/env npx tsx
/**
 * Quick Peninsula area-maps regenerate (no full LLM pipeline).
 */
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config();

async function main() {
  const { enrichReportInput } = await import('@/lib/ai-report-builder/enrich');
  const { assembleDraftDocx, clearTemplateCache } = await import(
    '@/lib/ai-report-builder/assemble-docx'
  );
  const { assembleDraftXlsx } = await import('@/lib/ai-report-builder/assemble-xlsx');
  const typeMod = await import('@/lib/ai-report-builder/types');
  void typeMod;

  clearTemplateCache();
  const input = {
    property_name: 'Nordic Wellness Glamping & Christmas Tree Farm',
    city: 'Peninsula',
    state: 'OH',
    zip_code: '44264',
    address_1: '6050 Riverview Rd',
    parcel_number: '1100539',
    client_entity: 'Heritage Farms',
    client_contact_name: 'David Baiko',
    client_address: '2374 Middleton Rd',
    client_city_state_zip: 'Hudson, OH 44236',
    client_email: 'baikodc@gmail.com',
    client_phone: '2166500625',
    resort_type: 'Glamping- Wellness',
    amenities_description:
      'Christmas Tree Farm, Fall Events, Primitive Camping; wellness-oriented glamping resort planned',
    unit_mix: [
      { type: 'Cabin', count: 8 },
      { type: 'Safari Tent', count: 6 },
    ],
    study_id: 'DRAFT-20260810-areamaps',
    market_type: 'glamping',
    include_web_research: false,
    service: 'Feasibility Study',
  };

  console.log('Enriching…');
  const enriched = await enrichReportInput(input);
  console.log('coords', enriched.latitude, enriched.longitude, enriched.county);

  const area_analysis = `=== Overview ===
This section provides a comprehensive assessment of the subject's area and its impact on the subject resort. The subject is located within Summit County, in Peninsula, Ohio.

=== State ===
Ohio offers diverse outdoor recreation and interstate access supporting leisure travel demand.

=== County ===
Summit County includes urban, suburban, and significant parkland resources including Cuyahoga Valley National Park corridor access.

=== Local ===
Peninsula is a small community along the Cuyahoga River within Cuyahoga Valley National Park. The subject's location is well-suited for its proposed glamping resort.`;

  console.log('Assembling DOCX…');
  const { buffer, diagnostics } = await assembleDraftDocx(
    enriched,
    {
      executive_summary:
        '=== Project Overview ===\nOverview.\n\n=== Demand Indicators ===\nPositive.',
      area_analysis,
      letter_of_transmittal: '',
      swot_analysis:
        '=== Strengths ===\nLocation.\n=== Weaknesses ===\nSeasonality.\n=== Opportunities ===\nTourism.\n=== Threats ===\nCompetition.',
      site_analysis: 'Site analysis pending detailed field inspection.',
      demand_indicators: 'Demand indicators pending.',
      supply_competition: 'Supply analysis pending.',
      industry_overview: 'Industry overview pending.',
    },
    {
      marketType: 'glamping',
      companionWorkbookFileName: 'DRAFT-20260810-areamaps-template.xlsx',
    }
  );

  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const docxPath = path.join(outDir, 'DRAFT-20260810-areamaps-report.docx');
  fs.writeFileSync(docxPath, buffer);
  const xlsx = await assembleDraftXlsx(enriched, { marketType: 'glamping' });
  fs.writeFileSync(path.join(outDir, 'DRAFT-20260810-areamaps-template.xlsx'), xlsx);

  console.log('Wrote', docxPath, 'bytes', buffer.length);
  console.log('sectionHits', diagnostics.sectionHits);
  console.log('imagesKept/placeholdered', diagnostics.imagesKept, diagnostics.imagesPlaceholdered);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
