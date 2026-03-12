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
  assembleDraftDocx,
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
  enriched: { latitude?: number; longitude?: number };
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
    market_type: input.market_type ?? 'outdoor_hospitality',
    latitude: enriched.latitude ?? null,
    longitude: enriched.longitude ?? null,
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
    const study_id = typeof raw.study_id === 'string' ? raw.study_id.trim() || undefined : undefined;
    const market_type = typeof raw.market_type === 'string' ? raw.market_type.trim() : undefined;

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
            'Study ID must be blank (auto-generate), DRAFT-YYYYMMDD-xxxx, or NN-NNN[A]?-NN (e.g. 25-100A-01)',
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
      study_id: study_id || generateStudyId(),
      market_type: market_type || 'outdoor_hospitality',
    };

    const enriched = await enrichReportInput(input);
    const executive_summary = await generateExecutiveSummary(enriched);
    const docxBuffer = await assembleDraftDocx(enriched, { executive_summary });

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
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(docxStoragePath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      console.error('[generate-draft] Storage error:', uploadError);
      await supabaseAdmin.from('reports').delete().eq('id', newReport.id);
      return NextResponse.json(
        { success: false, error: `Failed to save DOCX: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Update report with docx path; retry once on failure to avoid orphaned records
    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update({ docx_file_path: docxStoragePath })
      .eq('id', newReport.id);

    if (updateError) {
      console.error('[generate-draft] Update docx_file_path error:', updateError);
      const { error: retryError } = await supabaseAdmin
        .from('reports')
        .update({ docx_file_path: docxStoragePath })
        .eq('id', newReport.id);
      if (retryError) {
        console.error('[generate-draft] Retry update failed:', retryError);
        await supabaseAdmin.from('reports').delete().eq('id', newReport.id);
        return NextResponse.json(
          { success: false, error: 'Failed to link DOCX to report. Please try again.' },
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
