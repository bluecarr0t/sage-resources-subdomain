#!/usr/bin/env npx tsx
/**
 * Generate a report draft with Development Costs (Cabin: 5, Yurt: 3).
 * Run with: npx tsx scripts/generate-report-with-development-costs.ts
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
 * Optional: OPENAI_API_KEY for full AI generation
 *
 * Outputs:
 * - reports/dev-costs-test-report.docx (with Development Costs section)
 * - reports/dev-costs-test-cost-analysis.xlsx
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createServerClient } from '@/lib/supabase';
import {
  enrichReportInput,
  deriveDevelopmentCosts,
  generateExecutiveSummary,
  generateLetterOfTransmittal,
  generateSWOTAnalysis,
  generateSiteAnalysis,
  generateDemandIndicators,
  assembleDraftDocx,
  assembleDraftXlsx,
  factCheckExecutiveSummary,
} from '@/lib/ai-report-builder';
import { exportCostAnalysisToXlsx } from '@/lib/site-builder/export-cost-analysis-xlsx';

config({ path: resolve(process.cwd(), '.env.local') });
config();

async function main() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();
  const supabase = createServerClient();

  const input = {
    property_name: 'Development Costs Test Resort',
    city: 'St. Augustine',
    state: 'FL',
    zip_code: '32084',
    address_1: '3455 Coastal Hwy',
    acres: 43.86,
    unit_mix: [
      { type: 'Cabin', count: 5 },
      { type: 'Yurt', count: 3 },
    ],
    client_entity: 'Test Client LLC',
    study_id: 'DEV-COSTS-TEST-01',
    market_type: 'glamping',
  };

  console.log('Enriching input...');
  const enriched = await enrichReportInput(input);

  console.log('Deriving development costs...');
  const devCostsResult = await deriveDevelopmentCosts(supabase, enriched);
  console.log(`  - Configs: ${devCostsResult.configs.length}`);
  console.log(`  - Site Dev: $${Math.round(devCostsResult.data.totalProjectCost.siteDev).toLocaleString()}`);
  console.log(`  - Unit Costs: $${Math.round(devCostsResult.data.totalProjectCost.unitCosts).toLocaleString()}`);
  console.log(`  - Total: $${Math.round(devCostsResult.data.totalProjectCost.total).toLocaleString()}`);

  let executive_summary: string;
  let letter_of_transmittal: string;
  let swot_analysis: string;
  let site_analysis: string;
  let demand_indicators: string;
  let citations: { claim: string; source: string }[] = [];

  if (hasOpenAI) {
    console.log('Generating AI sections...');
    const [execResult, letter, swot, site, demand] = await Promise.all([
      generateExecutiveSummary(enriched),
      generateLetterOfTransmittal(enriched),
      generateSWOTAnalysis(enriched),
      generateSiteAnalysis(enriched),
      generateDemandIndicators(enriched),
    ]);
    executive_summary = execResult.executive_summary;
    citations = execResult.citations ?? [];
    letter_of_transmittal = letter;
    swot_analysis = swot;
    site_analysis = site;
    demand_indicators = demand;

    const factCheck = factCheckExecutiveSummary(executive_summary, enriched);
    if (!factCheck.passed && factCheck.flags.length > 0) {
      executive_summary += `\n\n[Note: AI-generated draft. Some figures may require verification.]`;
    }
  } else {
    executive_summary = 'Development Costs integration test. Executive summary placeholder.';
    letter_of_transmittal = 'Development Costs integration test. Letter of transmittal placeholder.';
    swot_analysis = 'Development Costs integration test. SWOT placeholder.';
    site_analysis = 'Development Costs integration test. Site analysis placeholder.';
    demand_indicators = 'Development Costs integration test. Demand indicators placeholder.';
  }

  console.log('Assembling DOCX...');
  const docxBuf = await assembleDraftDocx(
    enriched,
    {
      executive_summary,
      citations,
      letter_of_transmittal,
      swot_analysis,
      site_analysis,
      demand_indicators,
      development_costs_data: devCostsResult.data,
    },
    { marketType: 'glamping' }
  );

  let xlsxBuf: Buffer | null = null;
  try {
    console.log('Assembling XLSX template...');
    xlsxBuf = await assembleDraftXlsx(enriched, { marketType: 'glamping' });
  } catch (e) {
    console.warn('XLSX template skipped:', e instanceof Error ? e.message : e);
  }

  let costAnalysisBuf: Buffer | null = null;
  if (devCostsResult.configs.length > 0) {
    console.log('Exporting Cost Analysis XLSX...');
    costAnalysisBuf = exportCostAnalysisToXlsx({
      configs: devCostsResult.configs,
      costResult: devCostsResult.costResult,
      amenityBreakdown: [],
    });
  }

  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });

  const docxPath = path.join(outDir, 'dev-costs-test-report.docx');
  const xlsxPath = path.join(outDir, 'dev-costs-test-template.xlsx');
  const costAnalysisPath = path.join(outDir, 'dev-costs-test-cost-analysis.xlsx');

  fs.writeFileSync(docxPath, docxBuf);
  if (xlsxBuf) fs.writeFileSync(xlsxPath, xlsxBuf);
  if (costAnalysisBuf) fs.writeFileSync(costAnalysisPath, costAnalysisBuf);

  console.log('\n--- Output ---');
  console.log(`DOCX: ${docxPath} (${(docxBuf.length / 1024).toFixed(1)} KB)`);
  if (xlsxBuf) {
    console.log(`XLSX template: ${xlsxPath} (${(xlsxBuf.length / 1024).toFixed(1)} KB)`);
  }
  if (costAnalysisBuf) {
    console.log(`Cost Analysis XLSX: ${costAnalysisPath} (${(costAnalysisBuf.length / 1024).toFixed(1)} KB)`);
  }
  console.log('\nDone. Open the DOCX to verify the Development Costs section.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
