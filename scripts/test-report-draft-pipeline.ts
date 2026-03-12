#!/usr/bin/env npx tsx
/**
 * Integration test for the report draft pipeline.
 * Run with: npx tsx scripts/test-report-draft-pipeline.ts
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
 * Optional: OPENAI_API_KEY for full AI generation (otherwise skips AI calls)
 *
 * Tests:
 * 1. enrichReportInput (Census/GDP, benchmarks, geocode)
 * 2. assembleDraftDocx (with citations, source appendix)
 * 3. assembleDraftXlsx
 * 4. Full AI pipeline: enrich → generate + fact-check → assemble (if OPENAI_API_KEY set)
 * 5. Full generate-draft API (if OPENAI_API_KEY set and server running)
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config();

async function main() {
  const errors: string[] = [];
  const results: string[] = [];

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!supabaseKey;
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();

  if (!hasSupabase) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  const testInput = {
    property_name: 'Pipeline Test Resort',
    city: 'St. Augustine',
    state: 'FL',
    zip_code: '32084',
    address_1: '3455 Coastal Hwy',
    acres: 43.86,
    unit_mix: [
      { type: 'RV Standard Back-in Site', count: 100 },
      { type: 'RV Standard Pull Thru Site', count: 50 },
    ],
    client_entity: 'Test Client LLC',
    client_contact_name: 'John Doe',
    client_address: '123 Main St',
    client_city_state_zip: 'Chicago, IL 60601',
    study_id: 'TEST-PIPELINE-01',
    market_type: 'rv',
  };

  // 1. Enrich
  try {
    const { enrichReportInput } = await import('@/lib/ai-report-builder/enrich');
    const enriched = await enrichReportInput(testInput);
    results.push('✓ enrichReportInput completed');
    if (enriched.benchmarks?.length) {
      results.push(`  - Benchmarks: ${enriched.benchmarks.length} categories`);
    }
    if (enriched.latitude && enriched.longitude) {
      results.push(`  - Geocoded: ${enriched.latitude}, ${enriched.longitude}`);
    }
    if (enriched.population_2020 != null || enriched.gdp_2023 != null) {
      results.push(`  - Census/GDP: pop2020=${enriched.population_2020 ?? 'n/a'}, gdp2023=${enriched.gdp_2023 ?? 'n/a'}`);
    }
  } catch (e) {
    errors.push(`enrichReportInput: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Assemble DOCX (with citations for source appendix)
  try {
    const { assembleDraftDocx } = await import('@/lib/ai-report-builder/assemble-docx');
    const { enrichReportInput } = await import('@/lib/ai-report-builder/enrich');
    const enriched = await enrichReportInput(testInput);
    const sections = {
      executive_summary: 'Integration test executive summary.',
      citations: [{ claim: 'Test claim', source: 'test' }],
      letter_of_transmittal: 'Integration test letter of transmittal.',
      swot_analysis: 'Integration test SWOT analysis.',
    };
    const docxBuf = await assembleDraftDocx(enriched, sections, { marketType: 'rv' });
    const outPath = path.join(process.cwd(), 'reports', 'test-pipeline-output.docx');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, docxBuf);
    results.push(`✓ assembleDraftDocx completed (${(docxBuf.length / 1024).toFixed(1)} KB)`);
    results.push(`  - Output: ${outPath}`);
  } catch (e) {
    errors.push(`assembleDraftDocx: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. Assemble XLSX
  try {
    const { assembleDraftXlsx } = await import('@/lib/ai-report-builder/assemble-xlsx');
    const { enrichReportInput } = await import('@/lib/ai-report-builder/enrich');
    const enriched = await enrichReportInput(testInput);
    const xlsxBuf = await assembleDraftXlsx(enriched, { marketType: 'rv' });
    const outPath = path.join(process.cwd(), 'reports', 'test-pipeline-output.xlsx');
    fs.writeFileSync(outPath, xlsxBuf);
    results.push(`✓ assembleDraftXlsx completed (${(xlsxBuf.length / 1024).toFixed(1)} KB)`);
    results.push(`  - Output: ${outPath}`);
  } catch (e) {
    errors.push(`assembleDraftXlsx: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 4. Full AI pipeline: enrich → generate → fact-check → assemble (optional, requires OpenAI)
  if (hasOpenAI) {
    try {
      const { enrichReportInput } = await import('@/lib/ai-report-builder/enrich');
      const { generateExecutiveSummary, generateLetterOfTransmittal, generateSWOTAnalysis } =
        await import('@/lib/ai-report-builder/generate');
      const { factCheckExecutiveSummary } = await import('@/lib/ai-report-builder/fact-check');
      const { assembleDraftDocx } = await import('@/lib/ai-report-builder/assemble-docx');

      const enriched = await enrichReportInput(testInput);
      const [execResult, letter, swot] = await Promise.all([
        generateExecutiveSummary(enriched),
        generateLetterOfTransmittal(enriched),
        generateSWOTAnalysis(enriched),
      ]);
      let execSummary = execResult.executive_summary;
      const citations = execResult.citations ?? [];

      const factCheck = factCheckExecutiveSummary(execSummary, enriched);
      if (!factCheck.passed && factCheck.flags.length > 0) {
        execSummary += `\n\n[Note: AI-generated draft. Some figures may require verification.]`;
      }

      const docxBuf = await assembleDraftDocx(
        enriched,
        { executive_summary: execSummary, citations, letter_of_transmittal: letter, swot_analysis: swot },
        { marketType: 'rv' }
      );
      const outPath = path.join(process.cwd(), 'reports', 'test-pipeline-full-ai.docx');
      fs.writeFileSync(outPath, docxBuf);
      results.push(`✓ Full AI pipeline completed (${(docxBuf.length / 1024).toFixed(1)} KB)`);
      results.push(`  - Output: ${outPath}`);
      results.push(`  - Citations: ${citations.length}`);
      if (factCheck.flags.length > 0) {
        results.push(`  - Fact-check flags: ${factCheck.flags.length}`);
      }
    } catch (e) {
      errors.push(`Full AI pipeline: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    results.push('⊘ Full AI pipeline skipped (OPENAI_API_KEY not set)');
  }

  // 5. Full API (optional, requires running dev server + auth)
  if (hasOpenAI) {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/admin/reports/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testInput,
          format: 'xlsx',
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const buf = Buffer.from(await blob.arrayBuffer());
        const outPath = path.join(process.cwd(), 'reports', 'test-api-xlsx-export.xlsx');
        fs.writeFileSync(outPath, buf);
        results.push(`✓ API generate-draft (XLSX) completed (${(buf.length / 1024).toFixed(1)} KB)`);
      } else if (res.status === 401) {
        results.push('⊘ API test skipped (401 Unauthorized - requires logged-in admin)');
      } else {
        errors.push(`API generate-draft: ${res.status} ${await res.text()}`);
      }
    } catch (e) {
      results.push('⊘ API test skipped (server may not be running)');
    }
  } else {
    results.push('⊘ API test skipped (OPENAI_API_KEY not set)');
  }

  // Summary
  console.log('\n--- Report Draft Pipeline Integration Test ---\n');
  results.forEach((r) => console.log(r));
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((e) => console.error('  ✗', e));
    process.exit(1);
  }
  console.log('\nAll tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
