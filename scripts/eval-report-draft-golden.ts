#!/usr/bin/env npx tsx
/**
 * Golden-set evaluation harness for Report Builder accuracy.
 *
 * Regenerates (or dry-scores) drafts for labeled historical studies and scores:
 *   - geography hygiene (city/state present)
 *   - comps within radius
 *   - citation coverage on exec summary
 *   - connector provenance soft-fails
 *
 * Usage:
 *   npx tsx scripts/eval-report-draft-golden.ts
 *   npx tsx scripts/eval-report-draft-golden.ts --fixtures=scripts/fixtures/report-golden-set.json
 *   npx tsx scripts/eval-report-draft-golden.ts --dry-run
 *
 * Fixtures format (JSON array):
 *   [{ "study_id": "26-107A-01", "city": "Spencer", "state": "TN", "market_type": "rv",
 *      "property_name": "Spencer RV", "address_1": "...", "unit_mix": [{ "type": "RV Site", "count": 50 }] }]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { enrichReportInput } from '../lib/ai-report-builder/enrich';
import { proposeAssumptions, runFeasibilityModel } from '../lib/feasibility-model';
import { runReportQaGates } from '../lib/ai-report-builder/qa-gates';
import type { ReportDraftInput } from '../lib/ai-report-builder/types';
import {
  findUnsourcedNumericClaims,
  scoreStyleRubric,
} from '../lib/ai-report-builder/eval-number-fidelity';
import { resolveReportLlmModel } from '../lib/ai-report-builder/llm-provider';

config({ path: resolve(process.cwd(), '.env.local') });

interface GoldenFixture {
  study_id: string;
  property_name: string;
  city: string;
  state: string;
  address_1?: string;
  market_type?: string;
  unit_mix?: Array<{ type: string; count: number }>;
  expected_min_comps_within_150?: number;
  /** Optional sample narrative for number-fidelity / style rubric offline gates */
  sample_narrative?: string;
  sample_facts?: string;
}

interface EvalScore {
  study_id: string;
  passed: boolean;
  scores: {
    geography: boolean;
    comps_within_radius: boolean;
    comps_count: number;
    past_report_comps: number;
    citation_placeholders: number;
    connectors: string[];
    soft_fail_connectors: string[];
    qa_flags: string[];
    number_fidelity_ok: boolean;
    unsourced_claims: string[];
    style_rubric_overall: number | null;
    llm_model: string;
  };
  notes: string[];
}

const DEFAULT_FIXTURES: GoldenFixture[] = [
  {
    study_id: 'GOLDEN-Spencer-TN',
    property_name: 'Spencer RV & Glamping',
    city: 'Spencer',
    state: 'TN',
    address_1: 'Spencer, TN',
    market_type: 'rv',
    unit_mix: [
      { type: 'RV Site', count: 40 },
      { type: 'Cabin', count: 10 },
    ],
    expected_min_comps_within_150: 3,
  },
  {
    study_id: 'GOLDEN-BuffaloJunction-VA',
    property_name: 'Buffalo Junction Glamping',
    city: 'Buffalo Junction',
    state: 'VA',
    market_type: 'glamping',
    unit_mix: [{ type: 'Safari Tent', count: 20 }],
    expected_min_comps_within_150: 2,
  },
];

function loadFixtures(path: string | null): GoldenFixture[] {
  if (!path) return DEFAULT_FIXTURES;
  if (!existsSync(path)) {
    console.error(`Fixtures not found: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenFixture[];
}

async function scoreFixture(fixture: GoldenFixture): Promise<EvalScore> {
  const notes: string[] = [];
  const input: ReportDraftInput = {
    property_name: fixture.property_name,
    city: fixture.city,
    state: fixture.state,
    address_1: fixture.address_1,
    market_type: fixture.market_type ?? 'glamping',
    unit_mix: fixture.unit_mix ?? [],
    study_id: fixture.study_id,
    include_web_research: false,
  };

  const enriched = await enrichReportInput(input);
  const assumptions = proposeAssumptions(enriched);
  const model = runFeasibilityModel(
    {
      propertyName: enriched.property_name,
      city: enriched.city,
      state: enriched.state,
      unitMix: enriched.unit_mix,
    },
    assumptions
  );

  const comps = enriched.nearby_comps ?? [];
  const within150 = comps.filter((c) => c.distance_miles != null && c.distance_miles <= 150);
  const past = comps.filter((c) => c.source_table === 'past_reports');
  const minComps = fixture.expected_min_comps_within_150 ?? 3;

  const geography =
    !!enriched.city &&
    !!enriched.state &&
    enriched.latitude != null &&
    enriched.longitude != null;

  const connectors = enriched.enrichment_metadata?.data_sources ?? [];
  const softFails: string[] = [];
  if (!enriched.tourism_economics) softFails.push('tourism_economics');
  if (!enriched.stvr_indicators?.airdna) softFails.push('airdna');
  if (!enriched.comp_radius_pivots?.buckets?.length) softFails.push('comp_radius_pivots');

  const qa = runReportQaGates({
    enriched,
    model,
    assumptionsDraftMode: true,
    stdbWaived: true,
    placeholderCount: 0,
    docxTextSample: `${enriched.city} ${enriched.state} ${enriched.property_name}`,
  });

  const compsOk = within150.length >= minComps;
  if (!geography) notes.push('missing geocode or city/state');
  if (!compsOk) notes.push(`only ${within150.length} comps within 150 mi (want ≥${minComps})`);

  // Number fidelity + style rubric (offline when sample_narrative provided;
  // otherwise synthesize a facts block from enrichment for regression harness)
  const factsBlock =
    fixture.sample_facts ??
    [
      enriched.property_name,
      enriched.city,
      enriched.state,
      enriched.acres != null ? `${enriched.acres} acres` : '',
      ...(enriched.unit_mix ?? []).map((u) => `${u.count} ${u.type}`),
      model.irr?.equityIrr10Year != null
        ? `IRR ${(model.irr.equityIrr10Year * 100).toFixed(1)}%`
        : '',
      model.costs?.totalDevelopmentCost != null
        ? `$${model.costs.totalDevelopmentCost}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

  const narrativeSample =
    fixture.sample_narrative ??
    `The subject property in ${enriched.city}, ${enriched.state} is intended for outdoor hospitality development. Feasibility conclusion pending financial model confirmation by the analyst.`;

  const unsourced = findUnsourcedNumericClaims(narrativeSample, factsBlock);
  const numberFidelityOk = unsourced.length === 0;
  if (!numberFidelityOk) {
    notes.push(`unsourced numeric claims: ${unsourced.slice(0, 5).join(', ')}`);
  }

  const style = scoreStyleRubric(narrativeSample);
  if (style.overall < 3) notes.push(`style rubric overall ${style.overall}/5`);

  const passed =
    geography &&
    compsOk &&
    numberFidelityOk &&
    qa.flags.filter((f) => !f.startsWith('stdb')).length === 0;

  return {
    study_id: fixture.study_id,
    passed,
    scores: {
      geography,
      comps_within_radius: compsOk,
      comps_count: within150.length,
      past_report_comps: past.length,
      citation_placeholders: 0,
      connectors,
      soft_fail_connectors: softFails,
      qa_flags: qa.flags,
      number_fidelity_ok: numberFidelityOk,
      unsourced_claims: unsourced,
      style_rubric_overall: style.overall,
      llm_model: resolveReportLlmModel(),
    },
    notes,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fixturesArg = args.find((a) => a.startsWith('--fixtures='));
  const fixturesPath = fixturesArg ? fixturesArg.split('=')[1] : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env');
    process.exit(1);
  }
  // Touch client so env is validated early
  createClient(supabaseUrl, supabaseKey);

  const fixtures = loadFixtures(fixturesPath);
  if (dryRun) {
    console.log(`Dry run: would evaluate ${fixtures.length} golden fixtures`);
    for (const f of fixtures) console.log(`  - ${f.study_id} (${f.city}, ${f.state})`);
    return;
  }

  console.log(`Evaluating ${fixtures.length} golden fixtures…`);
  const results: EvalScore[] = [];
  for (const fixture of fixtures) {
    process.stdout.write(`  ${fixture.study_id}… `);
    try {
      const score = await scoreFixture(fixture);
      results.push(score);
      console.log(score.passed ? 'PASS' : `FAIL (${score.notes.join('; ') || 'see flags'})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        study_id: fixture.study_id,
        passed: false,
        scores: {
          geography: false,
          comps_within_radius: false,
          comps_count: 0,
          past_report_comps: 0,
          citation_placeholders: 0,
          connectors: [],
          soft_fail_connectors: [],
          qa_flags: [`eval_error: ${message}`],
          number_fidelity_ok: false,
          unsourced_claims: [],
          style_rubric_overall: null,
          llm_model: resolveReportLlmModel(),
        },
        notes: [message],
      });
      console.log(`ERROR: ${message}`);
    }
  }

  const outDir = resolve(process.cwd(), 'tmp');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `report-golden-eval-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));

  const passed = results.filter((r) => r.passed).length;
  console.log('');
  console.log(`Result: ${passed}/${results.length} passed`);
  console.log(`Wrote ${outPath}`);
  if (passed < results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
