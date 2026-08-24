/**
 * Shared pipeline for generate-draft (blocking + NDJSON stream).
 */

import { createServerClient } from '@/lib/supabase';
import { logAdminAudit } from '@/lib/admin-audit';
import { enrichReportInput } from './enrich';
import { deriveDevelopmentCosts } from './development-costs';
import {
  generateExecutiveSummary,
  generateSWOTAnalysis,
  generateSiteAnalysis,
  generateDemandIndicators,
} from './generate';
import { assembleDraftDocx } from './assemble-docx';
import { assembleDraftXlsx } from './assemble-xlsx';
import { factCheckNarrative } from './fact-check';
import {
  proposeAssumptions,
  runFeasibilityModel,
  formatModelMetricsForPrompt,
  type FeasibilityAssumptions,
  type FeasibilityProjectInput,
} from '@/lib/feasibility-model';
import { exportCostAnalysisToXlsx } from '@/lib/site-builder/export-cost-analysis-xlsx';
import type { ReportDraftInput, EnrichedInput } from './types';
import type { DraftProgressEmit } from './draft-progress-events';
import { runReportQaGates } from './qa-gates';
import { assertXlsxBufferMatchesModel } from './xlsx-model-assert';
import {
  generateAreaAnalysis,
  generateSupplyCompetition,
  generateIndustryOverview,
} from './sections/area-supply-industry';
import { applyStdbToWorkbook, type StdbParseResult } from './stdb-import';
import {
  buildTourismAuthorChecklistMarkdown,
} from './tourism-author-checklist';
import {
  generateShadowDraftBundle,
  uploadShadowDraftBundle,
} from './shadow-draft';
import ExcelJS from 'exceljs';
import PizZip from 'pizzip';

const BUCKET_NAME = 'report-uploads';
const EXPECTED_XLSX_SHEETS = ['ToT (Intake Form)'];

/** LLM sections on the generate/regenerate hot path (LoT is rebuilt from intake). */
export const REPORT_HOT_PATH_LLM_SECTIONS = [
  'executive_summary',
  'swot',
  'site_analysis',
  'demand_indicators',
  'area_analysis',
  'supply_competition',
  'industry_overview',
] as const;

export class ReportQaBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportQaBlockedError';
  }
}

export class StudyIdConflictError extends Error {
  readonly studyId: string;
  readonly reportId?: string;

  constructor(studyId: string, reportId?: string) {
    super(`A report with study_id ${studyId} already exists`);
    this.name = 'StudyIdConflictError';
    this.studyId = studyId;
    this.reportId = reportId;
  }
}

/** First ~50k plain chars from word/document.xml for geography QA. */
function extractDocxPlainSample(docxBuffer: Buffer, maxChars = 50_000): string {
  if (!docxBuffer.length) return '';
  try {
    const zip = new PizZip(docxBuffer);
    const xml = zip.file('word/document.xml')?.asText() ?? '';
    const plain = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
      .map((m) => m[1])
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.slice(0, maxChars);
  } catch {
    return '';
  }
}

export type ExecuteGenerateDraftParams = {
  input: ReportDraftInput;
  userId: string;
  userEmail?: string;
  /** When true, skip LLM-heavy sections not required for xlsx-only */
  format?: 'docx' | 'xlsx';
  /** Analyst-edited assumptions (overrides proposeAssumptions) */
  assumptionsOverride?: FeasibilityAssumptions | null;
  /** Allow ship with proposed ★ assumptions */
  draftMode?: boolean;
  /** Parsed STDB import to merge into workbook */
  stdbParse?: StdbParseResult | null;
  /** Explicit waiver when STDB not uploaded */
  stdbWaiver?: boolean;
  emit?: DraftProgressEmit;
  request?: Request;
  /** When set, update this report in place instead of inserting a new row. */
  existingReportId?: string;
};

export type ExecuteGenerateDraftResult = {
  studyId: string;
  reportId: string;
  docxBuffer: Buffer;
  xlsxBuffer: Buffer;
  enriched: EnrichedInput;
  qa: { passed: boolean; flags: string[]; analystTasks: string[] };
  docxDiagnostics?: import('./assemble-docx').AssembleDocxDiagnostics | null;
  assumptionsUsed?: FeasibilityAssumptions;
  /** Companion markdown for state tourism TOUR-0N figure slots */
  authorChecklistMarkdown?: string;
  authorChecklistPath?: string;
};

function emitPhase(
  emit: DraftProgressEmit | undefined,
  step: import('./draft-progress-events').DraftProgressPhase,
  status: 'started' | 'complete' | 'skipped',
  detail?: string
) {
  emit?.({ type: 'phase', step, status, detail });
}

export async function executeGenerateDraft(
  params: ExecuteGenerateDraftParams
): Promise<ExecuteGenerateDraftResult> {
  const {
    input,
    userId,
    userEmail,
    format = 'docx',
    assumptionsOverride,
    draftMode = true,
    stdbParse,
    stdbWaiver = false,
    emit,
    request,
    existingReportId,
  } = params;

  const studyId = input.study_id!;
  const correlationId = `${studyId}-${Date.now().toString(16)}`;
  emit?.({ type: 'meta', studyId, correlationId });

  emitPhase(emit, 'enrich', 'started');
  const enriched = await enrichReportInput(input);
  emitPhase(emit, 'enrich', 'complete');

  if (stdbParse) {
    emitPhase(emit, 'stdb', 'started');
    enriched.drive_time_demographics = {
      rings: stdbParse.rings.map((r) => ({
        minutes: r.minutes,
        radius_label: `${r.minutes} min`,
        population_2020: r.population_2020 ?? r.population_2025 ?? null,
        households_2020: r.households_2020 ?? r.households_2025 ?? null,
        median_household_income: r.median_hh_income_2025 ?? r.median_hh_income_2030 ?? null,
        method: 'cached' as const,
      })),
      demand_rubric: stdbParse.rings.map((r) => ({
        minutes: r.minutes,
        population: r.population_2020 ?? r.population_2025 ?? null,
        score: 0 as 0 | 1 | 2 | 3,
        note: 'From STDB import — rubric scoring deferred to analyst',
      })),
      overall_score: 0,
      fetched_at: new Date().toISOString(),
      source: 'stdb_import',
    };
    emitPhase(emit, 'stdb', 'complete');
  } else {
    emitPhase(emit, 'stdb', 'skipped', stdbWaiver ? 'waived' : 'not provided');
  }

  emitPhase(emit, 'assumptions', 'started');
  const supabaseAdmin = createServerClient();
  const devCostsResult = await deriveDevelopmentCosts(supabaseAdmin, enriched);
  const assumptions = assumptionsOverride ?? proposeAssumptions(enriched);
  if (!assumptionsOverride) {
    if (enriched.soft_cost_pct != null) {
      assumptions.softCostPct = { value: enriched.soft_cost_pct, state: 'analyst_set' };
    }
    if (enriched.land_cost != null) {
      assumptions.landCost = { value: enriched.land_cost, state: 'analyst_set' };
    }
    if (enriched.loan_to_cost != null) {
      assumptions.loanToCost = { value: enriched.loan_to_cost, state: 'analyst_set' };
    }
    if (enriched.interest_rate_pct != null) {
      assumptions.interestRate = {
        value: enriched.interest_rate_pct / 100,
        state: 'analyst_set',
      };
    }
    if (enriched.loan_term_years != null) {
      assumptions.loanTermYears = { value: enriched.loan_term_years, state: 'analyst_set' };
    }
    if (enriched.assessment_ratio != null) {
      assumptions.assessmentRatio = { value: enriched.assessment_ratio, state: 'analyst_set' };
    }
    if (enriched.mill_levy_pct != null) {
      assumptions.millLevy = { value: enriched.mill_levy_pct / 100, state: 'analyst_set' };
    }
  }
  emitPhase(emit, 'assumptions', 'complete');

  emitPhase(emit, 'model', 'started');
  const projectInput: FeasibilityProjectInput = {
    propertyName: enriched.property_name,
    city: enriched.city,
    state: enriched.state,
    county: enriched.county,
    acres: enriched.acres,
    parcelNumber: enriched.parcel_number,
    unitMix: enriched.unit_mix,
    siteDevCost: devCostsResult.data.totalProjectCost.siteDev,
    unitCost: devCostsResult.data.totalProjectCost.unitCosts,
    addBldgCost: devCostsResult.data.totalProjectCost.addBldg,
    hardCostOverride:
      devCostsResult.data.totalProjectCost.hardCosts > 0
        ? devCostsResult.data.totalProjectCost.hardCosts
        : undefined,
  };
  const modelOutput = runFeasibilityModel(projectInput, assumptions);
  const modelMetricsText = formatModelMetricsForPrompt(modelOutput);
  emitPhase(emit, 'model', 'complete');

  let executive_summary = '';
  let citations: { claim: string; source: string }[] = [];
  let letter_of_transmittal = '';
  let swot_analysis = '';
  let site_analysis = '';
  let demand_indicators = '';
  let area_analysis = '';
  let supply_competition = '';
  let industry_overview = '';
  let shadowUploadPath: string | null = null;

  if (format !== 'xlsx') {
    emitPhase(emit, 'section:executive_summary', 'started');
    emitPhase(emit, 'section:letter_of_transmittal', 'skipped', 'rebuilt from intake');
    emitPhase(emit, 'section:swot', 'started');
    emitPhase(emit, 'section:site_analysis', 'started');
    emitPhase(emit, 'section:demand_indicators', 'started');
    emitPhase(emit, 'section:area_analysis', 'started');
    emitPhase(emit, 'section:supply_competition', 'started');
    emitPhase(emit, 'section:industry_overview', 'started');

    const [execSummaryResult, swot, site, demand, area, supply, industry] = await Promise.all([
      generateExecutiveSummary(enriched, modelMetricsText),
      generateSWOTAnalysis(enriched),
      generateSiteAnalysis(enriched),
      generateDemandIndicators(enriched),
      generateAreaAnalysis(enriched),
      generateSupplyCompetition(enriched),
      generateIndustryOverview(enriched),
    ]);

    executive_summary = execSummaryResult.executive_summary;
    citations = execSummaryResult.citations ?? [];
    letter_of_transmittal = '';
    swot_analysis = swot;
    site_analysis = site;
    demand_indicators = demand;
    area_analysis = area;
    supply_competition = supply;
    industry_overview = industry;

    const narrativeNote = (flags: { claim: string }[]) =>
      `\n\n[Note: AI-generated draft. Some figures may require verification: ${flags.map((f) => f.claim).join('; ')}.]`;
    const execCheck = factCheckNarrative(executive_summary, enriched);
    if (!execCheck.passed && execCheck.flags.length > 0) {
      executive_summary += narrativeNote(execCheck.flags);
    }
    const swotCheck = factCheckNarrative(swot_analysis, enriched);
    if (!swotCheck.passed && swotCheck.flags.length > 0) {
      swot_analysis += narrativeNote(swotCheck.flags);
    }
    const demandCheck = factCheckNarrative(demand_indicators, enriched);
    if (!demandCheck.passed && demandCheck.flags.length > 0) {
      demand_indicators += narrativeNote(demandCheck.flags);
    }
    const areaCheck = factCheckNarrative(area_analysis, enriched);
    if (!areaCheck.passed && areaCheck.flags.length > 0) {
      area_analysis += narrativeNote(areaCheck.flags);
    }
    const supplyCheck = factCheckNarrative(supply_competition, enriched);
    if (!supplyCheck.passed && supplyCheck.flags.length > 0) {
      supply_competition += narrativeNote(supplyCheck.flags);
    }

    emitPhase(emit, 'section:executive_summary', 'complete');
    emitPhase(emit, 'section:swot', 'complete');
    emitPhase(emit, 'section:site_analysis', 'complete');
    emitPhase(emit, 'section:demand_indicators', 'complete');
    emitPhase(emit, 'section:area_analysis', 'complete');
    emitPhase(emit, 'section:supply_competition', 'complete');
    emitPhase(emit, 'section:industry_overview', 'complete');
  }

  emitPhase(emit, 'assemble_xlsx', 'started');
  const hasUnitMix = enriched.unit_mix.some((u) => u.count > 0);
  let xlsxBuffer = await assembleDraftXlsx(enriched, {
    marketType: input.market_type,
    modelOutput: hasUnitMix ? modelOutput : null,
  });

  let stdbMergeFailed = false;
  if (stdbParse) {
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(xlsxBuffer as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
      applyStdbToWorkbook(wb, stdbParse);
      const out = await wb.xlsx.writeBuffer();
      xlsxBuffer = Buffer.from(out);
    } catch (err) {
      stdbMergeFailed = true;
      console.warn('[execute-generate-draft] STDB workbook merge failed:', err);
    }
  }

  let xlsxMissingSheets: string[] = [];
  let xlsxModelAssertFlags: string[] = [];
  try {
    const wbCheck = new ExcelJS.Workbook();
    await wbCheck.xlsx.load(xlsxBuffer as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
    const names = new Set(wbCheck.worksheets.map((s) => s.name));
    xlsxMissingSheets = EXPECTED_XLSX_SHEETS.filter((n) => !names.has(n));
    if (hasUnitMix) {
      xlsxModelAssertFlags = await assertXlsxBufferMatchesModel(xlsxBuffer, modelOutput);
    }
  } catch (err) {
    console.warn('[execute-generate-draft] XLSX inspect failed:', err);
  }

  emitPhase(
    emit,
    'assemble_xlsx',
    'complete',
    hasUnitMix ? undefined : 'driversSkipped:empty_unit_mix'
  );

  emitPhase(emit, 'assemble_docx', 'started');
  let docxDiagnostics: import('./assemble-docx').AssembleDocxDiagnostics | null = null;
  let docxBuffer = Buffer.alloc(0);
  if (format !== 'xlsx') {
    const assembled = await assembleDraftDocx(
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
        development_costs_data: devCostsResult.data,
        model_output: modelOutput,
      },
      { marketType: input.market_type, companionWorkbookFileName: 'template.xlsx' }
    );
    docxBuffer = Buffer.from(assembled.buffer);
    docxDiagnostics = assembled.diagnostics;
    emit?.({
      type: 'phase',
      step: 'assemble_docx',
      status: 'complete',
      detail: `identity=${assembled.diagnostics.identityReplacements}; placeholders=${assembled.diagnostics.imagesPlaceholdered}; fingerprints=${assembled.diagnostics.sampleFingerprintsRemaining.join('|') || 'none'}`,
    });
  } else {
    emitPhase(emit, 'assemble_docx', 'skipped');
  }

  emitPhase(emit, 'qa', 'started');
  const placeholderCount =
    docxDiagnostics?.imagesPlaceholdered ??
    (docxBuffer.toString('utf8').match(/\[Image placeholder/g) ?? []).length;
  const docxTextSample = docxDiagnostics
    ? [
        enriched.city,
        enriched.state,
        enriched.property_name,
        extractDocxPlainSample(docxBuffer),
      ]
        .filter(Boolean)
        .join('\n')
    : null;
  const qa = runReportQaGates({
    enriched,
    model: modelOutput,
    assumptionsDraftMode: draftMode,
    stdbImported: !!stdbParse,
    stdbWaived: stdbWaiver,
    stdbMergeFailed,
    unmappedUnitTypes: devCostsResult.unmappedTypes,
    placeholderCount,
    placeholderThreshold: draftMode ? 200 : 12,
    docxTextSample: docxTextSample,
    sampleFingerprintsRemaining: docxDiagnostics?.sampleFingerprintsRemaining ?? null,
    assembleDiagnostics: docxDiagnostics,
    xlsxMissingSheets,
    xlsxModelAssertFlags,
    citationCount: citations.length,
  });
  emitPhase(emit, 'qa', qa.passed ? 'complete' : 'complete', qa.flags.join('; ') || undefined);

  // Ship mode: block upload when QA fails
  if (!draftMode && !qa.passed) {
    const message = `QA gates blocked ship: ${qa.flags.join('; ')}`;
    emit?.({ type: 'error', success: false, message, status: 422 });
    throw new ReportQaBlockedError(message);
  }

  emitPhase(emit, 'upload', 'started');
  const location = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');
  const total_sites = input.unit_mix.reduce((sum, u) => sum + u.count, 0) || null;

  let enrichmentWithProvenance: Record<string, unknown> = {
    ...(enriched.enrichment_metadata ?? {}),
    draft_mode: draftMode,
    stdb_imported: !!stdbParse,
    stdb_waived: stdbWaiver,
    qa_passed: qa.passed,
    qa_flags: qa.flags,
    assumptions_states: {
      units: assumptions.units.map((u) => u.state),
      realMarketAdj: assumptions.realMarketAdj.state,
      landCost: assumptions.landCost.state,
      loanToCost: assumptions.loanToCost.state,
    },
    connectors: {
      past_report_comps: (enriched.nearby_comps ?? []).filter((c) => c.source_table === 'past_reports')
        .length,
      web_comps: (enriched.nearby_comps ?? []).filter((c) => c.source_table === 'tavily_web_research')
        .length,
      radius_pivots: !!enriched.comp_radius_pivots,
      airdna: !!enriched.stvr_indicators?.airdna,
      tourism_economics: !!enriched.tourism_economics,
      site_risk: !!enriched.site_risk,
    },
    unmapped_unit_types: devCostsResult.unmappedTypes,
    stdb_merge_failed: stdbMergeFailed,
  };

  const reportFields = {
    study_id: studyId,
    title: `${input.property_name} Feasibility Study - ${studyId}`,
    property_name: input.property_name,
    location: location || null,
    city: input.city,
    state: input.state,
    zip_code: input.zip_code ?? null,
    address_1: input.address_1 ?? null,
    lot_size_acres: input.acres ?? null,
    client_entity: input.client_entity ?? null,
    unit_mix: input.unit_mix.length > 0 ? input.unit_mix : null,
    total_sites,
    executive_summary: executive_summary || null,
    status: 'draft' as const,
    has_docx: format !== 'xlsx',
    has_xlsx: false,
    market_type: input.market_type ?? 'glamping',
    service: input.service ?? null,
    latitude: enriched.latitude ?? null,
    longitude: enriched.longitude ?? null,
    enrichment_metadata: enrichmentWithProvenance,
  };

  let reportId: string;
  if (existingReportId) {
    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update({
        ...reportFields,
        docx_file_path: null,
        xlsx_file_path: null,
      })
      .eq('id', existingReportId);
    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }
    reportId = existingReportId;
  } else {
    const { data: newReport, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert({
        user_id: userId,
        ...reportFields,
        docx_file_path: null,
        xlsx_file_path: null,
      })
      .select('id')
      .single();

    if (insertError || !newReport) {
      if (insertError?.code === '23505') {
        const { data: existing } = await supabaseAdmin
          .from('reports')
          .select('id')
          .eq('study_id', studyId)
          .is('deleted_at', null)
          .maybeSingle();
        throw new StudyIdConflictError(studyId, existing?.id);
      }
      throw new Error(`Failed to create report: ${insertError?.message ?? 'unknown'}`);
    }
    reportId = newReport.id;
  }

  const docxStoragePath = `${reportId}/report.docx`;
  const xlsxStoragePath = `${reportId}/template.xlsx`;
  const checklistStoragePath = `${reportId}/author-checklist.md`;
  const authorChecklistMarkdown = buildTourismAuthorChecklistMarkdown({
    studyId,
    propertyName: input.property_name,
    city: input.city,
    state: input.state,
    county: enriched.county ?? enriched.county_metrics?.county_name ?? null,
    companionDocxFileName: 'report.docx',
    companionXlsxFileName: 'template.xlsx',
  });
  const uploads: Promise<{ error: { message: string } | null }>[] = [];

  if (format !== 'xlsx' && docxBuffer.length > 0) {
    uploads.push(
      supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(docxStoragePath, docxBuffer, {
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })
        .then((r) => ({ error: r.error }))
    );
  }

  // Shadow gpt-4o vs Claude (optional) — store under report-uploads/{id}/shadow/
  if (format !== 'xlsx' && executive_summary) {
    try {
      const bundle = await generateShadowDraftBundle(
        enriched,
        modelMetricsText,
        {
          executive_summary,
          letter_of_transmittal,
          swot_analysis,
        }
      );
      if (bundle) {
        shadowUploadPath = await uploadShadowDraftBundle({
          supabase: supabaseAdmin,
          reportId,
          bundle,
        });
        if (shadowUploadPath) {
          enrichmentWithProvenance = {
            ...enrichmentWithProvenance,
            shadow_compare_path: shadowUploadPath,
            shadow_primary_model: bundle.primary_model,
            shadow_alt_model: bundle.shadow_model,
          };
          await supabaseAdmin
            .from('reports')
            .update({ enrichment_metadata: enrichmentWithProvenance })
            .eq('id', reportId);
        }
      }
    } catch (shadowErr) {
      console.warn(
        '[execute-generate-draft] shadow draft failed:',
        shadowErr instanceof Error ? shadowErr.message : shadowErr
      );
    }
  }

  uploads.push(
    supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(xlsxStoragePath, xlsxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })
      .then((r) => ({ error: r.error }))
  );
  uploads.push(
    supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(checklistStoragePath, Buffer.from(authorChecklistMarkdown, 'utf8'), {
        contentType: 'text/markdown; charset=utf-8',
        upsert: true,
      })
      .then((r) => ({ error: r.error }))
  );

  if (devCostsResult.configs.length > 0) {
    try {
      const costAnalysisBuffer = await exportCostAnalysisToXlsx({
        configs: devCostsResult.configs,
        costResult: devCostsResult.costResult,
        amenityBreakdown: [],
      });
      uploads.push(
        supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(`${reportId}/cost-analysis.xlsx`, costAnalysisBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true,
          })
          .then((r) => ({ error: r.error }))
      );
    } catch (costErr) {
      console.warn('[execute-generate-draft] Cost Analysis XLSX export failed:', costErr);
    }
  }

  const uploadResults = await Promise.all(uploads);
  const docxUpload = format !== 'xlsx' ? uploadResults[0] : null;
  const xlsxUpload = format !== 'xlsx' ? uploadResults[1] : uploadResults[0];

  if (docxUpload?.error) {
    if (!existingReportId) {
      await supabaseAdmin.from('reports').delete().eq('id', reportId);
    }
    throw new Error(`Failed to save DOCX: ${docxUpload.error.message}`);
  }

  const updatePayload: Record<string, string | boolean | null> = {};
  if (format !== 'xlsx') updatePayload.docx_file_path = docxStoragePath;
  if (!xlsxUpload?.error) {
    updatePayload.xlsx_file_path = xlsxStoragePath;
    updatePayload.has_xlsx = true;
  }
  await supabaseAdmin.from('reports').update(updatePayload).eq('id', reportId);

  if (request) {
    await logAdminAudit(
      {
        user_id: userId,
        user_email: userEmail,
        action: existingReportId ? 'edit' : 'upload',
        resource_type: 'report',
        resource_id: reportId,
        study_id: studyId,
        details: {
          property_name: input.property_name,
          generated_draft: !existingReportId,
          regenerated: !!existingReportId,
        },
        source: 'session',
      },
      request
    );
  }

  emitPhase(emit, 'upload', 'complete');

  const { data: docxSigned } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(docxStoragePath, 3600);
  const { data: xlsxSigned } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(xlsxStoragePath, 3600);
  const { data: checklistSigned } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(checklistStoragePath, 3600);

  emit?.({
    type: 'result',
    success: true,
    studyId,
    reportId,
    docxUrl: docxSigned?.signedUrl,
    xlsxUrl: xlsxSigned?.signedUrl,
    authorChecklistUrl: checklistSigned?.signedUrl,
    qa: { passed: qa.passed, flags: qa.flags },
    analystTasks: qa.analystTasks,
    docxDiagnostics: docxDiagnostics ?? undefined,
    assumptions: assumptions,
  });

  return {
    studyId,
    reportId,
    docxBuffer,
    xlsxBuffer,
    enriched,
    qa,
    docxDiagnostics,
    assumptionsUsed: assumptions,
    authorChecklistMarkdown,
    authorChecklistPath: checklistStoragePath,
  };
}
