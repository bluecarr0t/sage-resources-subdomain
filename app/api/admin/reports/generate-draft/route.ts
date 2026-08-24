/**
 * API Route: Generate report draft (AI Report Builder)
 * POST /api/admin/reports/generate-draft
 *
 * Supports:
 * - JSON body (legacy) → DOCX blob response
 * - `{ stream: true }` → NDJSON progress + result URLs
 * - `format: 'xlsx'` → XLSX only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { isValidStudyIdFormat } from '@/lib/report-constants';
import type { ReportDraftInput } from '@/lib/ai-report-builder';
import { executeGenerateDraft, StudyIdConflictError } from '@/lib/ai-report-builder/execute-generate-draft';
import type { DraftProgressEvent } from '@/lib/ai-report-builder/draft-progress-events';
import type { FeasibilityAssumptions } from '@/lib/feasibility-model';
import type { StdbParseResult } from '@/lib/ai-report-builder/stdb-import';
import {
  acquireGenerateDraftLock,
  checkReportRateLimit,
  generationInProgressResponse,
  rateLimitExceededResponse,
  releaseGenerateDraftLock,
} from '@/lib/report-builder-limits';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function generateStudyId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = Math.random().toString(16).slice(2, 10);
  return `DRAFT-${yyyy}${mm}${dd}-${hex}`;
}

function parseInput(raw: Record<string, unknown>): {
  input: ReportDraftInput;
  format: 'docx' | 'xlsx';
  stream: boolean;
  draftMode: boolean;
  assumptionsOverride: FeasibilityAssumptions | null;
  stdbParse: StdbParseResult | null;
  stdbWaiver: boolean;
} | { error: string; status: number } {
  const property_name = typeof raw.property_name === 'string' ? raw.property_name.trim() : '';
  const city = typeof raw.city === 'string' ? raw.city.trim() : '';
  const state = typeof raw.state === 'string' ? raw.state.trim() : '';
  if (!property_name || !city || !state) {
    return { error: 'property_name, city, and state are required', status: 400 };
  }

  const zip_code = typeof raw.zip_code === 'string' ? raw.zip_code.trim() : undefined;
  const address_1 = typeof raw.address_1 === 'string' ? raw.address_1.trim() : undefined;
  const acres =
    typeof raw.acres === 'number'
      ? raw.acres
      : typeof raw.acres === 'string'
        ? parseFloat(raw.acres)
        : undefined;
  const client_entity = typeof raw.client_entity === 'string' ? raw.client_entity.trim() : undefined;
  const client_contact_name =
    typeof raw.client_contact_name === 'string' ? raw.client_contact_name.trim() : undefined;
  const client_phone = typeof raw.client_phone === 'string' ? raw.client_phone.trim() : undefined;
  const client_email = typeof raw.client_email === 'string' ? raw.client_email.trim() : undefined;
  const client_address =
    typeof raw.client_address === 'string' ? raw.client_address.trim() : undefined;
  const client_city_state_zip =
    typeof raw.client_city_state_zip === 'string' ? raw.client_city_state_zip.trim() : undefined;
  const client_salutation =
    typeof raw.client_salutation === 'string' ? raw.client_salutation.trim() : undefined;
  const parcel_number =
    typeof raw.parcel_number === 'string' ? raw.parcel_number.trim() : undefined;
  const resort_type = typeof raw.resort_type === 'string' ? raw.resort_type.trim() : undefined;
  const intended_use_of_study =
    typeof raw.intended_use_of_study === 'string' ? raw.intended_use_of_study.trim() : undefined;
  const engagement_date =
    typeof raw.engagement_date === 'string' ? raw.engagement_date.trim() : undefined;
  const amenities_description =
    typeof raw.amenities_description === 'string' ? raw.amenities_description.trim() : undefined;
  const study_id = typeof raw.study_id === 'string' ? raw.study_id.trim() : undefined;
  const market_type = typeof raw.market_type === 'string' ? raw.market_type.trim() : undefined;
  const service = typeof raw.service === 'string' ? raw.service.trim() : undefined;
  const county = typeof raw.county === 'string' ? raw.county.trim() : undefined;
  const include_web_research = raw.include_web_research !== false;
  const format = raw.format === 'xlsx' ? 'xlsx' : 'docx';
  const stream = raw.stream === true;
  const draftMode = raw.draft_mode !== false;
  const stdbWaiver = raw.stdb_waiver === true;

  const unit_mix_raw = Array.isArray(raw.unit_mix) ? raw.unit_mix : [];
  const unit_mix = unit_mix_raw
    .map((u) => {
      if (!u || typeof u !== 'object') return null;
      const row = u as Record<string, unknown>;
      const type = typeof row.type === 'string' ? row.type.trim() : '';
      const count =
        typeof row.count === 'number'
          ? row.count
          : typeof row.count === 'string'
            ? parseInt(row.count, 10)
            : 0;
      if (!type || !Number.isFinite(count) || count < 0) return null;
      return { type, count };
    })
    .filter((u): u is { type: string; count: number } => !!u);

  if (study_id && !isValidStudyIdFormat(study_id)) {
    return {
      error:
        'Job number must be blank (auto-generate), DRAFT-YYYYMMDD-xxxx, or NN-NNN[A]?-NN (e.g. 25-100A-01)',
      status: 400,
    };
  }

  const num = (v: unknown) =>
    typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : undefined;

  const input: ReportDraftInput = {
    property_name,
    city,
    state,
    zip_code,
    address_1,
    acres: acres != null && Number.isFinite(acres) ? acres : undefined,
    unit_mix,
    client_entity,
    client_contact_name,
    client_phone,
    client_email,
    client_address,
    client_city_state_zip,
    client_salutation,
    parcel_number,
    resort_type,
    intended_use_of_study,
    engagement_date,
    amenities_description,
    study_id: study_id || generateStudyId(),
    market_type: market_type || 'glamping',
    include_web_research,
    service,
    county,
    loan_to_cost: (() => {
      const v = num(raw.loan_to_cost);
      return v != null && Number.isFinite(v) ? v : undefined;
    })(),
    interest_rate_pct: (() => {
      const v = num(raw.interest_rate_pct);
      return v != null && Number.isFinite(v) ? v : undefined;
    })(),
    loan_term_years: (() => {
      const v = num(raw.loan_term_years);
      return v != null && Number.isFinite(v) ? v : undefined;
    })(),
    land_cost: (() => {
      const v = num(raw.land_cost);
      return v != null && Number.isFinite(v) ? v : undefined;
    })(),
    soft_cost_pct: (() => {
      const v = num(raw.soft_cost_pct);
      return v != null && Number.isFinite(v) ? v : undefined;
    })(),
    assessment_ratio: (() => {
      const v = num(raw.assessment_ratio);
      return v != null && Number.isFinite(v) ? v : undefined;
    })(),
    mill_levy_pct: (() => {
      const v = num(raw.mill_levy_pct);
      return v != null && Number.isFinite(v) ? v : undefined;
    })(),
  };

  const assumptionsOverride =
    raw.assumptions && typeof raw.assumptions === 'object'
      ? (raw.assumptions as FeasibilityAssumptions)
      : null;
  const stdbParse =
    raw.stdb_parse && typeof raw.stdb_parse === 'object'
      ? (raw.stdb_parse as StdbParseResult)
      : null;

  return {
    input,
    format,
    stream,
    draftMode,
    assumptionsOverride,
    stdbParse,
    stdbWaiver,
  };
}

export async function POST(request: NextRequest) {
  let lockHeld = false;
  let lockUserId: string | null = null;
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) return auth.response;

    const rate = await checkReportRateLimit('generateDraft', auth.session.user.id);
    if (!rate.allowed) {
      return rateLimitExceededResponse(rate.resetAt);
    }

    lockHeld = await acquireGenerateDraftLock(auth.session.user.id);
    if (!lockHeld) {
      return generationInProgressResponse();
    }
    lockUserId = auth.session.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = parseInput(body as Record<string, unknown>);
    if ('error' in parsed) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: parsed.status });
    }

    const {
      input,
      format,
      stream,
      draftMode,
      assumptionsOverride,
      stdbParse,
      stdbWaiver,
    } = parsed;

    if (stream) {
      const encoder = new TextEncoder();
      const userId = auth.session.user.id;
      const userEmail = auth.session.user.email ?? undefined;
      const readable = new ReadableStream({
        async start(controller) {
          const send = (ev: DraftProgressEvent) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
          };
          try {
            await executeGenerateDraft({
              input,
              userId,
              userEmail,
              format,
              draftMode,
              assumptionsOverride,
              stdbParse,
              stdbWaiver,
              emit: send,
              request,
            });
          } catch (err) {
            const status = err instanceof StudyIdConflictError ? 409 : 500;
            send({
              type: 'error',
              success: false,
              message: err instanceof Error ? err.message : 'Generation failed',
              status,
            });
          } finally {
            await releaseGenerateDraftLock(userId);
            controller.close();
          }
        },
      });
      lockHeld = false;
      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Study-Id': input.study_id ?? '',
        },
      });
    }

    const result = await executeGenerateDraft({
      input,
      userId: auth.session.user.id,
      userEmail: auth.session.user.email ?? undefined,
      format,
      draftMode,
      assumptionsOverride,
      stdbParse,
      stdbWaiver,
      request,
    });

    if (format === 'xlsx') {
      const filename = `${result.studyId}-template.xlsx`;
      return new NextResponse(new Uint8Array(result.xlsxBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': result.xlsxBuffer.length.toString(),
          'X-Study-Id': result.studyId,
        },
      });
    }

    const filename = `${result.studyId}-report.docx`;
    return new NextResponse(new Uint8Array(result.docxBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': result.docxBuffer.length.toString(),
        'X-Study-Id': result.studyId,
        'X-Report-Id': result.reportId,
      },
    });
  } catch (err) {
    console.error('[generate-draft] Error:', err);
    if (err instanceof StudyIdConflictError) {
      return NextResponse.json(
        { success: false, error: err.message, studyId: err.studyId, reportId: err.reportId },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Generation failed',
      },
      { status: 500 }
    );
  } finally {
    if (lockHeld && lockUserId) {
      await releaseGenerateDraftLock(lockUserId);
    }
  }
}
