/**
 * API Route: Re-extract feasibility study from stored files
 * POST /api/admin/comparables/:studyId/re-extract
 *
 * Downloads the original .xlsx AND .docx from storage, re-parses both,
 * clears existing data, and re-inserts. Original files are never modified.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { parseDocxReport } from '@/lib/parsers/feasibility-docx-parser';
import { normalizeReportTitle } from '@/lib/normalize-report-title';
import { geocodeAddress } from '@/lib/geocode';

const BUCKET_NAME = 'report-uploads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const { studyId } = await params;
    const supabaseAdmin = createServerClient();

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, csv_file_path, docx_file_path')
      .eq('study_id', studyId)
      .maybeSingle();

    if (reportError) throw reportError;

    if (!report?.csv_file_path && !report?.docx_file_path) {
      return NextResponse.json(
        { success: false, message: 'No original files found for this study' },
        { status: 404 }
      );
    }

    let xlsxSuccess = false;
    let docxSuccess = false;
    let xlsxResult: Record<string, unknown> | undefined;
    const errors: string[] = [];

    // ── XLSX re-extraction ──────────────────────────────────────────────
    if (report.csv_file_path) {
      try {
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .download(report.csv_file_path);

        if (downloadError || !fileData) {
          errors.push('Failed to download XLSX from storage');
          console.error('[re-extract] XLSX storage error:', downloadError);
        } else {
          const filename = report.csv_file_path.split('/').pop() || `${studyId}.xlsx`;
          const buffer = Buffer.from(await fileData.arrayBuffer());

          const formData = new FormData();
          formData.append(
            'files',
            new Blob([buffer], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
            filename
          );

          const origin =
            (typeof request.url === 'string' ? new URL(request.url).origin : null) ||
            (request.headers.get('x-forwarded-host')
              ? `https://${request.headers.get('x-forwarded-host')}`
              : null) ||
            'http://localhost:3000';

          const headers: Record<string, string> = {};
          const internalKey = process.env.ADMIN_INTERNAL_API_KEY;
          if (internalKey) {
            headers['x-internal-api-key'] = internalKey;
          } else {
            headers['Cookie'] = request.headers.get('cookie') || '';
          }

          const uploadRes = await fetch(`${origin}/api/admin/comparables/upload`, {
            method: 'POST',
            body: formData,
            headers,
          });

          const uploadJson = await uploadRes.json();
          const result = uploadJson.results?.[0];

          if (uploadRes.ok && result?.success) {
            xlsxSuccess = true;
            xlsxResult = result;
          } else {
            errors.push(result?.error || uploadJson.message || 'XLSX re-extraction failed');
          }
        }
      } catch (err) {
        console.error('[re-extract] XLSX error:', err);
        errors.push('XLSX re-extraction failed');
      }
    }

    // ── DOCX re-extraction ──────────────────────────────────────────────
    if (report.docx_file_path) {
      try {
        const { data: docxData, error: docxDownloadError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .download(report.docx_file_path);

        if (docxDownloadError || !docxData) {
          errors.push('Failed to download DOCX from storage');
          console.error('[re-extract] DOCX storage error:', docxDownloadError);
        } else {
          const docxFilename = report.docx_file_path.split('/').pop() || `${studyId}.docx`;
          const docxBuffer = Buffer.from(await docxData.arrayBuffer());
          const parsed = await parseDocxReport(docxBuffer, docxFilename, {
            useLLMForMissing: true,
          });

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

          const reportUpdate: Record<string, unknown> = {
            has_docx: true,
            has_narrative: true,
            status: 'completed',
          };

          const { title: normalizedTitle, propertyName: normalizedPropertyName } =
            await normalizeReportTitle({
              documentTitle: parsed.document_title,
              rawTitle: parsed.resort_name ? `${parsed.resort_name} - ${studyId}` : null,
              resortName: parsed.resort_name,
              studyId,
            });
          reportUpdate.property_name = normalizedPropertyName;
          reportUpdate.title = normalizedTitle;
          reportUpdate.city = parsed.city ?? null;
          reportUpdate.state = parsed.state ?? null;
          reportUpdate.address_1 = parsed.address ?? null;
          reportUpdate.zip_code = parsed.zip_code ?? null;
          reportUpdate.county = parsed.county ?? null;
          reportUpdate.parcel_number = parsed.parcel_number ?? null;
          reportUpdate.lot_size_acres = parsed.lot_size_acres ?? null;
          reportUpdate.total_sites = parsed.total_units ?? null;
          reportUpdate.market_type = parsed.market_type ?? null;
          reportUpdate.report_date = parsed.report_date ?? null;
          if (parsed.executive_summary) reportUpdate.executive_summary = parsed.executive_summary;
          if (parsed.swot) reportUpdate.swot = parsed.swot;
          if (parsed.authors) reportUpdate.authors = parsed.authors;
          if (parsed.client_name) reportUpdate.client_name = parsed.client_name;
          if (parsed.client_entity) reportUpdate.client_entity = parsed.client_entity;
          if (parsed.report_purpose) reportUpdate.report_purpose = parsed.report_purpose;
          if (parsed.development_phase) reportUpdate.development_phase = parsed.development_phase;
          if (parsed.zoning) reportUpdate.zoning = parsed.zoning;
          if (parsed.unit_mix) reportUpdate.unit_mix = parsed.unit_mix;
          if (parsed.financial_assumptions) reportUpdate.financial_assumptions = parsed.financial_assumptions;
          if (parsed.recommendations) reportUpdate.recommendations = parsed.recommendations;
          if (parsed.extraction_messages?.length) reportUpdate.docx_extraction_messages = parsed.extraction_messages;
          if (latitude !== null) reportUpdate.latitude = latitude;
          if (longitude !== null) reportUpdate.longitude = longitude;

          const locationParts = [parsed.city, parsed.state].filter(Boolean);
          reportUpdate.location = locationParts.length > 0 ? locationParts.join(', ') : null;

          await supabaseAdmin
            .from('reports')
            .update(reportUpdate)
            .eq('id', report.id);

          docxSuccess = true;
        }
      } catch (err) {
        console.error('[re-extract] DOCX error:', err);
        errors.push('DOCX re-extraction failed');
      }
    }

    const anySuccess = xlsxSuccess || docxSuccess;
    const parts: string[] = [];
    if (xlsxSuccess) parts.push('XLSX');
    if (docxSuccess) parts.push('DOCX');

    if (!anySuccess) {
      return NextResponse.json(
        { success: false, message: errors.join('; ') || 'Re-extraction failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Re-extraction completed: ${parts.join(' + ')} processed successfully`,
      study_id: studyId,
      xlsx_processed: xlsxSuccess,
      docx_processed: docxSuccess,
      xlsx_result: xlsxResult,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[re-extract] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Re-extraction failed' },
      { status: 500 }
    );
  }
}
