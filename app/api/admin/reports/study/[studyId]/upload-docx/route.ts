/**
 * API Route: Upload DOCX for an existing report
 * POST /api/admin/reports/study/[studyId]/upload-docx
 *
 * Accepts a single .docx/.doc file and stores it for the report.
 * Use this to fix reports where Download DOCX fails (file missing in storage).
 * RBAC: Admin role required.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parseDocxReport } from '@/lib/parsers/feasibility-docx-parser';
import { normalizeReportTitle } from '@/lib/normalize-report-title';
import { geocodeAddress } from '@/lib/geocode';
import { extractStudyId } from '@/lib/csv/feasibility-parser';
import { logAdminAudit } from '@/lib/admin-audit';

const BUCKET_NAME = 'report-uploads';
const MAX_DOCX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB (Supabase Free: 50MB; Pro: 500GB)

type ParamsContext = { params: Promise<{ studyId: string }> };

export const POST = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  const { studyId } = await context!.params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file?.size || !file.name) {
      return NextResponse.json(
        { success: false, error: 'No file provided. Upload a .docx or .doc file.' },
        { status: 400 }
      );
    }

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.docx') && !lower.endsWith('.doc')) {
      return NextResponse.json(
        { success: false, error: 'File must be .docx or .doc' },
        { status: 400 }
      );
    }

    if (file.size > MAX_DOCX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File too large (max 100MB). Try compressing the DOCX or reducing embedded images.' },
        { status: 400 }
      );
    }

    const fileStudyId = extractStudyId(file.name);
    if (fileStudyId.toUpperCase() !== studyId.toUpperCase()) {
      return NextResponse.json(
        {
          success: false,
          error: `Filename job number (${fileStudyId}) does not match this report (${studyId}). Use a DOCX file whose filename contains the job number.`,
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServerClient();

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, study_id')
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reportError || !report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const docxBuffer = Buffer.from(await file.arrayBuffer());
    const docxStoragePath = `${report.id}/report.docx`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(docxStoragePath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-docx] Storage error:', uploadError);
      const isSizeError = /exceeded.*maximum|too large|size limit|1mb|1 mb/i.test(uploadError.message);
      const message = isSizeError
        ? `Upload failed: ${uploadError.message}`
        : `Failed to save file: ${uploadError.message}`;
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }

    const parsed = await parseDocxReport(docxBuffer, file.name, { useLLMForMissing: true });

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (parsed.city || parsed.address) {
      const coords = await geocodeAddress(
        parsed.address || '',
        parsed.city || '',
        parsed.state || '',
        parsed.zip_code || '',
        'USA'
      );
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    const locationParts = [parsed.city, parsed.state].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : null;

    const updatePayload: Record<string, unknown> = {
      has_docx: true,
      docx_file_path: docxStoragePath,
      has_narrative: true,
      narrative_file_path: docxStoragePath,
      status: 'completed',
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      address_1: parsed.address ?? null,
      zip_code: parsed.zip_code ?? null,
      county: parsed.county ?? null,
      parcel_number: parsed.parcel_number ?? null,
      lot_size_acres: parsed.lot_size_acres ?? null,
      total_sites: parsed.total_units ?? null,
      market_type: parsed.market_type ?? null,
      report_date: parsed.report_date ?? null,
      executive_summary: parsed.executive_summary ?? null,
      swot: parsed.swot ?? null,
      authors: parsed.authors ?? null,
      client_name: parsed.client_name ?? null,
      client_entity: parsed.client_entity ?? null,
      report_purpose: parsed.report_purpose ?? null,
      development_phase: parsed.development_phase ?? null,
      zoning: parsed.zoning ?? null,
      unit_mix: parsed.unit_mix ?? null,
      financial_assumptions: parsed.financial_assumptions ?? null,
      recommendations: parsed.recommendations ?? null,
      key_amenities: parsed.key_amenities ?? null,
      docx_extraction_messages: parsed.extraction_messages ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location,
    };
    const { title: normalizedTitle, propertyName: normalizedPropertyName } =
      await normalizeReportTitle({
        documentTitle: parsed.document_title,
        rawTitle: parsed.resort_name ? `${parsed.resort_name} - ${studyId}` : null,
        resortName: parsed.resort_name,
        studyId,
      });
    updatePayload.property_name = normalizedPropertyName;
    updatePayload.title = normalizedTitle;

    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update(updatePayload)
      .eq('id', report.id);

    if (updateError) {
      console.error('[upload-docx] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: `File saved but update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    await logAdminAudit(
      {
        user_id: auth.session.user.id,
        user_email: auth.session.user.email ?? undefined,
        action: 'upload',
        resource_type: 'report',
        resource_id: report.id,
        study_id: studyId,
        details: { file_type: 'docx', filename: file.name },
        source: 'session',
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'DOCX uploaded successfully. Download DOCX should now work.',
    });
  } catch (err) {
    console.error('[upload-docx] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}, { requireRole: 'admin' });
