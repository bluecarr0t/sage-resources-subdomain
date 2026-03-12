/**
 * API Route: Generate report draft (AI Report Builder MVP)
 * POST /api/admin/reports/generate-draft
 *
 * Accepts JSON body with property name, location, unit mix, etc.
 * Enriches with DB benchmarks, generates executive summary via OpenAI,
 * assembles DOCX, creates report record, uploads to storage, returns DOCX for download.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { logAdminAudit } from '@/lib/admin-audit';
import { isValidStudyIdFormat } from '@/lib/report-constants';
import {
  enrichReportInput,
  generateExecutiveSummary,
  generateLetterOfTransmittal,
  generateSWOTAnalysis,
  generateSiteAnalysis,
  assembleDraftDocx,
  assembleDraftXlsx,
  factCheckExecutiveSummary,
} from '@/lib/ai-report-builder';
import type { ReportDraftInput } from '@/lib/ai-report-builder';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'report-uploads';

function generateStudyId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = Math.random().toString(16).slice(2, 10); // 8 chars to reduce collision risk
  return `DRAFT-${yyyy}${mm}${dd}-${hex}`;
}

function buildReportInsertPayload(params: {
  userId: string;
  input: ReportDraftInput;
  enriched: { latitude?: number; longitude?: number; enrichment_metadata?: unknown };
  executive_summary: string;
}) {
  const { userId, input, enriched, executive_summary } = params;
  const location = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');
  const total_sites = input.unit_mix.reduce((sum, u) => sum + u.count, 0) || null;

  return {
    user_id: userId,
    study_id: input.study_id,
    title: `${input.property_name} Feasibility Study - ${input.study_id}`,
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
    executive_summary,
    status: 'draft',
    has_docx: true,
    docx_file_path: null,
    has_xlsx: false,
    xlsx_file_path: null,
    market_type: input.market_type ?? 'glamping',
    service: input.service ?? null,
    latitude: enriched.latitude ?? null,
    longitude: enriched.longitude ?? null,
    enrichment_metadata: enriched.enrichment_metadata ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const raw = body as Record<string, unknown>;
    const property_name = typeof raw.property_name === 'string' ? raw.property_name.trim() : '';
    const city = typeof raw.city === 'string' ? raw.city.trim() : '';
    const state = typeof raw.state === 'string' ? raw.state.trim() : '';
    const zip_code = typeof raw.zip_code === 'string' ? raw.zip_code.trim() : undefined;
    const address_1 = typeof raw.address_1 === 'string' ? raw.address_1.trim() : undefined;
    const acres = typeof raw.acres === 'number' ? raw.acres : typeof raw.acres === 'string' ? parseFloat(raw.acres) : undefined;
    const client_entity = typeof raw.client_entity === 'string' ? raw.client_entity.trim() : undefined;
    const client_contact_name = typeof raw.client_contact_name === 'string' ? raw.client_contact_name.trim() : undefined;
    const client_address = typeof raw.client_address === 'string' ? raw.client_address.trim() : undefined;
    const client_city_state_zip = typeof raw.client_city_state_zip === 'string' ? raw.client_city_state_zip.trim() : undefined;
    const parcel_number = typeof raw.parcel_number === 'string' ? raw.parcel_number.trim() : undefined;
    const amenities_description = typeof raw.amenities_description === 'string' ? raw.amenities_description.trim() : undefined;
    const study_id = typeof raw.study_id === 'string' ? raw.study_id.trim() || undefined : undefined;
    const market_type = typeof raw.market_type === 'string' ? raw.market_type.trim() : undefined;
    const service = typeof raw.service === 'string' ? raw.service.trim() || undefined : undefined;
    const format = typeof raw.format === 'string' ? raw.format.trim().toLowerCase() : 'docx';
    const include_web_research =
      format === 'docx' && typeof raw.include_web_research === 'boolean'
        ? raw.include_web_research
        : false;

    let unit_mix: Array<{ type: string; count: number }> = [];
    if (Array.isArray(raw.unit_mix)) {
      unit_mix = raw.unit_mix
        .filter((u): u is Record<string, unknown> => u && typeof u === 'object')
        .map((u) => ({
          type: String(u.type ?? '').trim(),
          count: typeof u.count === 'number' ? u.count : parseInt(String(u.count ?? 0), 10) || 0,
        }))
        .filter((u) => u.type && u.count > 0);
    }

    if (!property_name || !city || !state) {
      return NextResponse.json(
        { success: false, error: 'property_name, city, and state are required' },
        { status: 400 }
      );
    }

    if (zip_code && !/^\d{5}(-\d{4})?$/.test(zip_code)) {
      return NextResponse.json(
        { success: false, error: 'ZIP code must be 5 digits or 5+4 format (e.g. 12345 or 12345-6789)' },
        { status: 400 }
      );
    }

    const acresNum = acres != null && !Number.isNaN(acres) ? acres : undefined;
    if (acresNum != null && (acresNum < 0 || !Number.isFinite(acresNum))) {
      return NextResponse.json(
        { success: false, error: 'Acres must be a non-negative number' },
        { status: 400 }
      );
    }

    if (study_id && !isValidStudyIdFormat(study_id)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Job number must be blank (auto-generate), DRAFT-YYYYMMDD-xxxx, or NN-NNN[A]?-NN (e.g. 25-100A-01)',
        },
        { status: 400 }
      );
    }

    const input: ReportDraftInput = {
      property_name,
      city,
      state,
      zip_code,
      address_1,
      acres: acresNum,
      unit_mix,
      client_entity,
      client_contact_name,
      client_address,
      client_city_state_zip,
      parcel_number,
      amenities_description,
      study_id: study_id || generateStudyId(),
      market_type: market_type || 'glamping',
      include_web_research,
      service,
    };

    const enriched = await enrichReportInput(input);

    if (format === 'xlsx') {
      const xlsxBuffer = await assembleDraftXlsx(enriched, { marketType: input.market_type });
      const filename = `${input.study_id}-template.xlsx`;
      const blob = new Blob([new Uint8Array(xlsxBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': blob.size.toString(),
        },
      });
    }

    const [execSummaryResult, letter_of_transmittal, swot_analysis, site_analysis] = await Promise.all([
      generateExecutiveSummary(enriched),
      generateLetterOfTransmittal(enriched),
      generateSWOTAnalysis(enriched),
      generateSiteAnalysis(enriched),
    ]);
    let executive_summary = execSummaryResult.executive_summary;
    const citations = execSummaryResult.citations;

    const factCheck = factCheckExecutiveSummary(executive_summary, enriched);
    if (!factCheck.passed && factCheck.flags.length > 0) {
      const disclaimer = `\n\n[Note: AI-generated draft. Some figures may require verification: ${factCheck.flags.map((f) => f.claim).join('; ')}.]`;
      executive_summary = executive_summary + disclaimer;
    }

    const [docxBuffer, xlsxBuffer] = await Promise.all([
      assembleDraftDocx(
        enriched,
        { executive_summary, citations, letter_of_transmittal, swot_analysis, site_analysis },
        { marketType: input.market_type }
      ),
      assembleDraftXlsx(enriched, { marketType: input.market_type }),
    ]);

    const supabaseAdmin = createServerClient();

    const insertPayload = buildReportInsertPayload({
      userId: session.user.id,
      input,
      enriched,
      executive_summary,
    });

    const { data: newReport, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('[generate-draft] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: `Failed to create report: ${insertError.message}` },
        { status: 500 }
      );
    }

    const docxStoragePath = `${newReport.id}/report.docx`;
    const xlsxStoragePath = `${newReport.id}/template.xlsx`;

    const [docxUpload, xlsxUpload] = await Promise.all([
      supabaseAdmin.storage.from(BUCKET_NAME).upload(docxStoragePath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      }),
      supabaseAdmin.storage.from(BUCKET_NAME).upload(xlsxStoragePath, xlsxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      }),
    ]);

    if (docxUpload.error) {
      console.error('[generate-draft] DOCX storage error:', docxUpload.error);
      await supabaseAdmin.from('reports').delete().eq('id', newReport.id);
      return NextResponse.json(
        { success: false, error: `Failed to save DOCX: ${docxUpload.error.message}` },
        { status: 500 }
      );
    }

    if (xlsxUpload.error) {
      console.warn('[generate-draft] XLSX storage error (non-fatal):', xlsxUpload.error.message);
    }

    const updatePayload: Record<string, string | boolean> = {
      docx_file_path: docxStoragePath,
    };
    if (!xlsxUpload.error) {
      updatePayload.xlsx_file_path = xlsxStoragePath;
      updatePayload.has_xlsx = true;
    }

    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update(updatePayload)
      .eq('id', newReport.id);

    if (updateError) {
      console.error('[generate-draft] Update file paths error:', updateError);
      const { error: retryError } = await supabaseAdmin
        .from('reports')
        .update(updatePayload)
        .eq('id', newReport.id);
      if (retryError) {
        console.error('[generate-draft] Retry update failed:', retryError);
        await supabaseAdmin.from('reports').delete().eq('id', newReport.id);
        return NextResponse.json(
          { success: false, error: 'Failed to link files to report. Please try again.' },
          { status: 500 }
        );
      }
    }

    await logAdminAudit(
      {
        user_id: session.user.id,
        user_email: session.user.email ?? undefined,
        action: 'upload',
        resource_type: 'report',
        resource_id: newReport.id,
        study_id: input.study_id,
        details: { property_name: input.property_name, generated_draft: true },
        source: 'session',
      },
      request
    );

    const filename = `${input.study_id}-report.docx`;
    const blob = new Blob([new Uint8Array(docxBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': blob.size.toString(),
        'X-Study-Id': input.study_id ?? '',
      },
    });
  } catch (err) {
    console.error('[generate-draft] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Generation failed',
      },
      { status: 500 }
    );
  }
}
