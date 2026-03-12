/**
 * API Route: Regenerate report DOCX + XLSX from existing report data
 * POST /api/admin/reports/study/[studyId]/regenerate
 *
 * Reads the existing report row, builds ReportDraftInput from its fields,
 * runs the full pipeline (enrich → generate → assemble), uploads new
 * DOCX + XLSX to storage, and updates the report record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { logAdminAudit } from '@/lib/admin-audit';
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
export const maxDuration = 180;

const BUCKET_NAME = 'report-uploads';

type ParamsContext = { params: Promise<{ studyId: string }> };

export const POST = withAdminAuth<ParamsContext>(async (request: NextRequest, auth, context) => {
  const { studyId } = await context!.params;

  try {
    const supabaseAdmin = createServerClient();

    const { data: report, error: fetchError } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[regenerate] Fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    if (!report.property_name || !report.city || !report.state) {
      return NextResponse.json(
        { success: false, error: 'Report missing required fields (property_name, city, state)' },
        { status: 400 }
      );
    }

    const rawUnitMix = report.unit_mix;
    const unitMix = Array.isArray(rawUnitMix) ? rawUnitMix : [];
    const rawUnitDesc = report.unit_descriptions;
    const unitDescriptions = Array.isArray(rawUnitDesc) ? rawUnitDesc : [];

    let unit_mix: Array<{ type: string; count: number }>;
    if (unitMix.length > 0) {
      unit_mix = unitMix
        .filter((u: { type?: string; count?: number }) => u?.type && (u.count ?? 0) > 0)
        .map((u: { type?: string; count?: number }) => ({
          type: String(u.type),
          count: Number(u.count) || 1,
        }));
    } else if (unitDescriptions.length > 0) {
      unit_mix = unitDescriptions
        .filter((u: { type?: string; quantity?: number | null }) => u?.type)
        .map((u: { type?: string; quantity?: number | null }) => ({
          type: String(u.type),
          count: Number(u.quantity) || 1,
        }));
    } else {
      unit_mix = [];
    }

    const keyAmenities = (report.key_amenities as string[] | null) ?? [];

    const input: ReportDraftInput = {
      property_name: report.property_name,
      city: report.city,
      state: report.state,
      zip_code: report.zip_code ?? undefined,
      address_1: report.address_1 ?? undefined,
      acres: report.lot_size_acres != null ? Number(report.lot_size_acres) : undefined,
      parcel_number: report.parcel_number ?? undefined,
      client_entity: report.client_entity ?? undefined,
      client_contact_name: report.client_contact_name ?? undefined,
      client_address: report.client_address ?? undefined,
      client_city_state_zip: report.client_city_state_zip ?? undefined,
      unit_mix,
      amenities_description: keyAmenities.length > 0 ? keyAmenities.join(', ') : undefined,
      study_id: studyId,
      market_type: report.market_type ?? 'rv',
      include_web_research: true,
      service: report.service ?? undefined,
    };

    const enriched = await enrichReportInput(input);

    const [execSummaryResult, letter_of_transmittal, swot_analysis, site_analysis] =
      await Promise.all([
        generateExecutiveSummary(enriched),
        generateLetterOfTransmittal(enriched),
        generateSWOTAnalysis(enriched),
        generateSiteAnalysis(enriched),
      ]);

    let executive_summary = execSummaryResult.executive_summary;
    const citations = execSummaryResult.citations;

    const factCheck = factCheckExecutiveSummary(executive_summary, enriched);
    if (!factCheck.passed && factCheck.flags.length > 0) {
      executive_summary += `\n\n[Note: AI-generated draft. Some figures may require verification: ${factCheck.flags.map((f) => f.claim).join('; ')}.]`;
    }

    const [docxBuffer, xlsxBuffer] = await Promise.all([
      assembleDraftDocx(
        enriched,
        { executive_summary, citations, letter_of_transmittal, swot_analysis, site_analysis },
        { marketType: input.market_type }
      ),
      assembleDraftXlsx(enriched, { marketType: input.market_type }),
    ]);

    const docxStoragePath = `${report.id}/report.docx`;
    const xlsxStoragePath = `${report.id}/template.xlsx`;

    const [docxUpload, xlsxUpload] = await Promise.all([
      supabaseAdmin.storage.from(BUCKET_NAME).upload(docxStoragePath, docxBuffer, {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      }),
      supabaseAdmin.storage.from(BUCKET_NAME).upload(xlsxStoragePath, xlsxBuffer, {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      }),
    ]);

    if (docxUpload.error) {
      console.error('[regenerate] DOCX storage error:', docxUpload.error);
      return NextResponse.json(
        { success: false, error: `Failed to save DOCX: ${docxUpload.error.message}` },
        { status: 500 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      executive_summary,
      has_docx: true,
      docx_file_path: docxStoragePath,
      enrichment_metadata: enriched.enrichment_metadata ?? null,
      latitude: enriched.latitude ?? null,
      longitude: enriched.longitude ?? null,
    };

    if (!xlsxUpload.error) {
      updatePayload.xlsx_file_path = xlsxStoragePath;
      updatePayload.has_xlsx = true;
    } else {
      console.warn('[regenerate] XLSX storage error (non-fatal):', xlsxUpload.error.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update(updatePayload)
      .eq('id', report.id);

    if (updateError) {
      console.error('[regenerate] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Report files saved but failed to update record' },
        { status: 500 }
      );
    }

    await logAdminAudit(
      {
        user_id: auth.session.user.id,
        user_email: auth.session.user.email ?? undefined,
        action: 'edit',
        resource_type: 'report',
        resource_id: report.id,
        study_id: studyId,
        details: { regenerated: true, property_name: report.property_name },
        source: 'session',
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Report regenerated successfully',
      docx_size: docxBuffer.length,
      xlsx_size: xlsxBuffer.length,
    });
  } catch (err) {
    console.error('[regenerate] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Regeneration failed',
      },
      { status: 500 }
    );
  }
});
