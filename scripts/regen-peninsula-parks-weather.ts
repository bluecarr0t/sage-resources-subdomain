#!/usr/bin/env npx tsx
/**
 * Regenerate Peninsula FS Demand Indicators: WeatherSpark charts, National Parks
 * Google Static Map (from Supabase national-parks), and researched State Parks
 * tables in DOCX + XLSX.
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
  const { selectNationalParkRows, selectStateParkRows } = await import(
    '@/lib/ai-report-builder/park-visitation'
  );
  const { buildTourismAuthorChecklistMarkdown } = await import(
    '@/lib/ai-report-builder/tourism-author-checklist'
  );

  clearTemplateCache();
  const studyId = 'DRAFT-20260810-parks-weather';
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
    study_id: studyId,
    market_type: 'glamping' as const,
    include_web_research: true,
    service: 'Feasibility Study',
  };

  console.log('Enriching (national parks + WeatherSpark + state-park research)…');
  const enriched = await enrichReportInput(input);
  console.log('coords', enriched.latitude, enriched.longitude, enriched.county);
  console.log(
    'national parks',
    selectNationalParkRows(enriched.demand_drivers, 6).map((p) => ({
      name: p.name,
      mi: p.distance_miles,
      visitors: p.visitors,
      lat: p.latitude,
      lng: p.longitude,
    }))
  );
  console.log(
    'state parks',
    selectStateParkRows(enriched.demand_drivers, 6).map((p) => ({
      name: p.name,
      mi: p.distance_miles,
      visitors: p.visitors,
      lat: p.latitude,
      lng: p.longitude,
    }))
  );
  const { resolveNearestMajorCity, fetchDriveRouteFromCity } = await import(
    '@/lib/ai-report-builder/transportation-access'
  );
  if (enriched.latitude != null && enriched.longitude != null) {
    const city = resolveNearestMajorCity(
      enriched.latitude,
      enriched.longitude,
      enriched.demand_drivers
    );
    console.log('nearest major city', city);
    if (city) {
      const route = await fetchDriveRouteFromCity(
        city,
        enriched.latitude,
        enriched.longitude
      );
      console.log('drive route', route && {
        from: city.name,
        distance_text: route.distance_text,
        duration_text: route.duration_text,
        hasPolyline: Boolean(route.overview_polyline),
      });
    }
  }
  console.log(
    'nearby comps',
    (enriched.nearby_comps ?? []).slice(0, 10).map((c) => ({
      name: c.property_name,
      mi: c.distance_miles,
      adr: c.avg_retail_daily_rate,
      src: c.source_table,
      web: !!c.web_research_supplement,
    }))
  );

  const area_analysis = `=== Overview ===
This section provides a comprehensive assessment of the subject's area and its impact on the subject resort. The subject is located within Summit County, in Peninsula, Ohio.

=== State ===
Ohio offers diverse outdoor recreation and interstate access supporting leisure travel demand.

=== County ===
Summit County includes urban, suburban, and significant parkland resources including Cuyahoga Valley National Park corridor access.

=== Local ===
Peninsula is a small community along the Cuyahoga River within Cuyahoga Valley National Park. The subject's location is well-suited for its proposed glamping resort.`;

  const demand_indicators = `=== Weather ===
Peninsula experiences warm summers and freezing, snowy winters. Based on WeatherSpark tourism scores, the strongest outdoor lodging window is typically mid-June through mid-September.

Summary
• Hot Months: July is typically the hottest month.
• Cool Months: Shoulder seasons remain usable for outdoor lodging.
• Freezing Months: January is typically the coldest month.
• Precipitation: Wet days are most common in early summer.
• Snow: Measurable snowfall is common in winter months.

=== Attractions ===
Overall, the demand indicators for the subject are positive. Cuyahoga Valley National Park sits immediately adjacent to the subject and anchors regional leisure travel, while nearby Ohio state parks extend summer and shoulder-season day-trip demand.`;

  console.log('Assembling DOCX…');
  const companionXlsx = `${studyId}-template.xlsx`;
  const { buffer, diagnostics } = await assembleDraftDocx(
    enriched,
    {
      executive_summary:
        '=== Project Overview ===\nNordic Wellness Glamping & Christmas Tree Farm — Peninsula, OH.\n\n=== Demand Indicators ===\nPositive — national park adjacency and regional state-park draw.',
      area_analysis,
      letter_of_transmittal: '',
      swot_analysis:
        '=== Strengths ===\nLocation in Cuyahoga Valley.\n=== Weaknesses ===\nSeasonality.\n=== Opportunities ===\nTourism.\n=== Threats ===\nCompetition.',
      site_analysis: 'Site analysis pending detailed field inspection.',
      demand_indicators,
      supply_competition: 'Supply analysis pending.',
      industry_overview: 'Industry overview pending.',
    },
    {
      marketType: 'glamping',
      companionWorkbookFileName: companionXlsx,
    }
  );

  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const docxPath = path.join(outDir, `${studyId}-report.docx`);
  fs.writeFileSync(docxPath, buffer);
  const xlsx = await assembleDraftXlsx(enriched, { marketType: 'glamping' });
  const xlsxPath = path.join(outDir, companionXlsx);
  fs.writeFileSync(xlsxPath, xlsx);

  const checklist = buildTourismAuthorChecklistMarkdown({
    city: enriched.city,
    state: enriched.state,
    propertyName: enriched.property_name,
    studyId,
  });
  fs.writeFileSync(path.join(outDir, `${studyId}-author-checklist.md`), checklist);

  console.log('Wrote', docxPath, 'bytes', buffer.length);
  console.log('Wrote', xlsxPath);
  console.log('sectionHits', diagnostics.sectionHits);
  console.log('imagesKept/placeholdered', diagnostics.imagesKept, diagnostics.imagesPlaceholdered);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
