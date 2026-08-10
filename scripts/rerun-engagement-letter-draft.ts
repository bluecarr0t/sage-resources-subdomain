#!/usr/bin/env npx tsx
/**
 * Parse FS engagement letter PDF → enrich → model → generate all sections → assemble.
 * Usage: npx tsx scripts/rerun-engagement-letter-draft.ts [path-to-pdf]
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { ReportDraftInput } from '@/lib/ai-report-builder/types';

config({ path: resolve(process.cwd(), '.env.local') });
config();

/** UNIT_MIX="Cabin:10,Dome:5" → unit_mix rows for model drivers. */
function parseUnitMixEnv(raw: string | undefined): Array<{ type: string; count: number }> {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [type, countStr] = part.split(':').map((s) => s.trim());
      const count = Number(countStr);
      return { type, count: Number.isFinite(count) ? count : 0 };
    })
    .filter((u) => u.type && u.count > 0);
}

async function main() {
  const pdfPath =
    process.argv[2] ||
    path.join(process.env.HOME || '', 'Downloads', 'FS_Engagement_Letter (2).pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found:', pdfPath);
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error('OPENAI_API_KEY required');
    process.exit(1);
  }

  const { parseEngagementLetterPdf } = await import(
    '@/lib/ai-report-builder/parse-engagement-letter'
  );
  const { enrichReportInput } = await import('@/lib/ai-report-builder/enrich');
  const { deriveDevelopmentCosts } = await import('@/lib/ai-report-builder/development-costs');
  const {
    generateExecutiveSummary,
    generateLetterOfTransmittal,
    generateSWOTAnalysis,
    generateSiteAnalysis,
    generateDemandIndicators,
  } = await import('@/lib/ai-report-builder/generate');
  const {
    generateAreaAnalysis,
    generateSupplyCompetition,
    generateIndustryOverview,
  } = await import('@/lib/ai-report-builder/sections/area-supply-industry');
  const { factCheckExecutiveSummary } = await import('@/lib/ai-report-builder/fact-check');
  const { assembleDraftDocx, assembleDraftXlsx } = await import('@/lib/ai-report-builder');
  const {
    proposeAssumptions,
    runFeasibilityModel,
    formatModelMetricsForPrompt,
  } = await import('@/lib/feasibility-model');
  const { createServerClient } = await import('@/lib/supabase');

  console.log('Parsing PDF:', pdfPath);
  const buf = fs.readFileSync(pdfPath);
  const { extract } = await parseEngagementLetterPdf(buf);
  console.log('Extract:', JSON.stringify(extract, null, 2));

  const now = new Date();
  const studyId = `DRAFT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(16).slice(2, 10)}`;

  const input: ReportDraftInput = {
    property_name: extract.property_name || '',
    city: extract.city || '',
    state: extract.state || '',
    zip_code: extract.zip_code || undefined,
    address_1: extract.address_1 || undefined,
    parcel_number: extract.parcel_number || undefined,
    client_entity: extract.client_entity || undefined,
    client_contact_name: extract.client_contact_name || undefined,
    client_phone: extract.client_phone || undefined,
    client_email: extract.client_email || undefined,
    client_address: extract.client_address || undefined,
    client_city_state_zip: extract.client_city_state_zip || undefined,
    resort_type: extract.resort_type_raw || undefined,
    intended_use_of_study: extract.intended_use_of_study || undefined,
    engagement_date: extract.engagement_date || undefined,
    amenities_description: extract.amenities_description || undefined,
    unit_mix: parseUnitMixEnv(process.env.UNIT_MIX),
    study_id: studyId,
    market_type: extract.market_type || 'glamping',
    include_web_research: true,
    service: extract.service || 'Feasibility Study',
  };

  if (!input.property_name || !input.city || !input.state) {
    console.error('Missing required fields after parse');
    process.exit(1);
  }

  console.log('\n--- Pipeline input ---');
  console.log(JSON.stringify(input, null, 2));
  console.log('\n--- Enriching ---');
  const enriched = await enrichReportInput(input);
  console.log('✓ Enriched');

  console.log('--- Costs + model ---');
  const supabase = createServerClient();
  const devCosts = await deriveDevelopmentCosts(supabase, enriched);
  const assumptions = proposeAssumptions(enriched);
  const modelOutput = runFeasibilityModel(
    {
      propertyName: enriched.property_name,
      city: enriched.city,
      state: enriched.state,
      county: enriched.county,
      acres: enriched.acres,
      parcelNumber: enriched.parcel_number,
      unitMix: enriched.unit_mix,
      siteDevCost: devCosts.data.totalProjectCost.siteDev,
      unitCost: devCosts.data.totalProjectCost.unitCosts,
      addBldgCost: devCosts.data.totalProjectCost.addBldg,
      hardCostOverride:
        devCosts.data.totalProjectCost.hardCosts > 0
          ? devCosts.data.totalProjectCost.hardCosts
          : undefined,
    },
    assumptions
  );
  const modelMetrics = formatModelMetricsForPrompt(modelOutput);
  console.log('✓ Model TDC', modelOutput.costs.totalDevelopmentCost);

  console.log('--- Generating AI sections ---');
  const [
    execSummaryResult,
    letter_of_transmittal,
    swot_analysis,
    site_analysis,
    demand_indicators,
    area_analysis,
    supply_competition,
    industry_overview,
  ] = await Promise.all([
    generateExecutiveSummary(enriched, modelMetrics),
    generateLetterOfTransmittal(enriched),
    generateSWOTAnalysis(enriched),
    generateSiteAnalysis(enriched),
    generateDemandIndicators(enriched),
    generateAreaAnalysis(enriched),
    generateSupplyCompetition(enriched),
    generateIndustryOverview(enriched),
  ]);
  let executive_summary = execSummaryResult.executive_summary;
  const citations = execSummaryResult.citations ?? [];
  const factCheck = factCheckExecutiveSummary(executive_summary, enriched);
  if (!factCheck.passed && factCheck.flags.length > 0) {
    executive_summary += `\n\n[Note: AI-generated draft. Some figures may require verification: ${factCheck.flags.map((f) => f.claim).join('; ')}.]`;
  }
  console.log('✓ Generated sections');

  console.log('--- Assembling DOCX + XLSX ---');
  const hasUnitMix = enriched.unit_mix.some((u) => u.count > 0);
  const companionWorkbookFileName = `${studyId}-template.xlsx`;
  const [docxResult, xlsxBuffer] = await Promise.all([
    assembleDraftDocx(
      enriched,
      {
        executive_summary,
        citations,
        letter_of_transmittal,
        swot_analysis,
        site_analysis,
        demand_indicators,
        area_analysis,
        supply_competition,
        industry_overview,
        development_costs_data: devCosts.data,
        model_output: modelOutput,
      },
      { marketType: input.market_type, companionWorkbookFileName }
    ),
    assembleDraftXlsx(enriched, {
      marketType: input.market_type,
      modelOutput: hasUnitMix ? modelOutput : null,
    }),
  ]);
  const docxBuffer = docxResult.buffer;
  console.log('DOCX diagnostics:', JSON.stringify(docxResult.diagnostics, null, 2));

  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const docxPath = path.join(outDir, `${studyId}-report.docx`);
  const xlsxPath = path.join(outDir, companionWorkbookFileName);
  fs.writeFileSync(docxPath, docxBuffer);
  fs.writeFileSync(xlsxPath, xlsxBuffer);

  const downloads = path.join(process.env.HOME || '', 'Downloads');
  if (fs.existsSync(downloads)) {
    fs.writeFileSync(path.join(downloads, `${studyId}-report.docx`), docxBuffer);
    fs.writeFileSync(path.join(downloads, companionWorkbookFileName), xlsxBuffer);
  }

  console.log('\n--- Done ---');
  console.log(`DOCX: ${docxPath} (${(docxBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`XLSX: ${xlsxPath} (${(xlsxBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`study_id: ${studyId}`);
  console.log(`Excel links retargeted to: ${companionWorkbookFileName}`);

  // Automated parity smoke checklist
  const checklistPath = path.join(outDir, `${studyId}-parity-checklist.md`);
  const d = docxResult.diagnostics;
  const lines = [
    `# Parity checklist — ${studyId}`,
    '',
    `- Property: ${enriched.property_name}`,
    `- City/State: ${enriched.city}, ${enriched.state}`,
    `- Address: ${enriched.address_1 || ''}`,
    `- Unit mix: ${JSON.stringify(enriched.unit_mix)}`,
    `- Identity replacements: ${d.identityReplacements}`,
    `- Images kept / placeholders: ${d.imagesKept} / ${d.imagesPlaceholdered}`,
    `- Section hits: ${JSON.stringify(d.sectionHits)}`,
    `- Sample fingerprints remaining: ${d.sampleFingerprintsRemaining.join(', ') || 'none'}`,
    `- Layout chrome skipped (sectPr/page-break guards): ${d.layoutChromeSkipped ?? 0}`,
    `- Companion workbook (Word LINK target): ${companionWorkbookFileName}`,
    '',
    '## Manual visual checks (open vs foundation template)',
    '- [ ] Cover identity + letterhead',
    '- [ ] Industry Overview figures present',
    '- [ ] Transmittal / SWOT / Area mention subject geography',
    '- [ ] ToT filled; Rates labels match unit mix; Excel recalc Total Units',
    '- [ ] No Jasper / Florence AZ / Mirror Cabin leftovers (unless STDB waived)',
    '- [ ] SWOT/Area/Demand Heading2 skeletons retained; no raw ** markdown',
    '- [ ] sectPr / page-break counts match template',
    '- [ ] Exec Summary keeps linked Excel Income/Expense tables + cyan update notes',
    '- [ ] Image placeholders only where assets were not auto-generated',
  ];
  fs.writeFileSync(checklistPath, lines.join('\n') + '\n');
  console.log(`Checklist: ${checklistPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
