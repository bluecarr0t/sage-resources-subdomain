#!/usr/bin/env npx tsx
/**
 * Capture WeatherSpark charts for Peninsula, OH and assemble a light DOCX
 * Demand Indicators weather section (no full LLM pipeline).
 */
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config();

async function main() {
  const { captureWeatherSparkChartImages } = await import(
    '@/lib/ai-report-builder/weatherspark-charts'
  );
  const { assembleDraftDocx, clearTemplateCache } = await import(
    '@/lib/ai-report-builder/assemble-docx'
  );
  const { assembleDraftXlsx } = await import('@/lib/ai-report-builder/assemble-xlsx');

  const url =
    'https://weatherspark.com/y/18202/Average-Weather-in-Peninsula-Ohio-United-States-Year-Round';

  console.log('Capturing WeatherSpark charts…');
  const charts = await captureWeatherSparkChartImages(url);
  console.log(
    'charts',
    charts.map((c) => ({ key: c.key, title: c.title, bytes: c.buffer.length }))
  );
  if (charts.length === 0) {
    throw new Error('No charts captured — check FIRECRAWL_API_KEY / WeatherSpark availability');
  }

  const previewDir = path.join(process.cwd(), 'reports', 'ws-charts');
  fs.mkdirSync(previewDir, { recursive: true });
  for (const c of charts) {
    fs.writeFileSync(path.join(previewDir, `${c.key}.png`), c.buffer);
  }

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
    resort_type: 'Glamping- Wellness',
    unit_mix: [
      { type: 'Cabin', count: 8 },
      { type: 'Safari Tent', count: 6 },
    ],
    study_id: 'DRAFT-20260810-ws-charts',
    market_type: 'glamping' as const,
    latitude: 41.2382085,
    longitude: -81.5560433,
    county: 'Summit County',
    weather_data: {
      url,
      climate_text:
        'In Peninsula, summers are warm and winters are freezing and snowy. Based on the tourism score, the best time of year to visit is from mid June to mid September.',
      image_urls: [],
      chart_images: charts,
      city: 'Peninsula',
      state: 'OH',
    },
  };

  const demand = `=== Weather ===
Peninsula experiences warm summers and freezing, snowy winters with a tourism score peak from mid June to mid September.

Summary
• Hot Months: July is the hottest month.
• Cool Months: Shoulder seasons remain usable for outdoor lodging.
• Freezing Months: January is typically the coldest month.
• Precipitation: Wet days are most common in June.

=== Attractions ===
Cuyahoga Valley National Park corridor supports leisure travel demand.`;

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
      companionWorkbookFileName: 'DRAFT-20260810-ws-charts-template.xlsx',
    }
  );

  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const docxPath = path.join(outDir, 'DRAFT-20260810-ws-charts-report.docx');
  fs.writeFileSync(docxPath, buffer);
  const xlsx = await assembleDraftXlsx(input as never, { marketType: 'glamping' });
  fs.writeFileSync(path.join(outDir, 'DRAFT-20260810-ws-charts-template.xlsx'), xlsx);

  console.log('Wrote', docxPath, 'bytes', buffer.length);
  console.log('imagesKept/placeholdered', diagnostics.imagesKept, diagnostics.imagesPlaceholdered);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
