/**
 * API Route: Unified upload for feasibility studies
 * POST /api/admin/reports/unified-upload
 *
 * Accepts paired .xlsx and .docx/.doc files per study.
 * - XLSX files are forwarded to the existing /api/admin/comparables/upload
 * - DOCX files are parsed for key facts and merged into the report record
 * - Address is geocoded for the client map
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { parseDocxReport } from '@/lib/parsers/feasibility-docx-parser';
import { normalizeReportTitle } from '@/lib/normalize-report-title';
import { geocodeAddress } from '@/lib/geocode';
import { extractStudyId } from '@/lib/csv/feasibility-parser';

const MAX_FILES = 20;
const MAX_XLSX_SIZE_MB = 50;
const MAX_DOCX_SIZE_MB = 100; // Supabase Free: 50MB; Pro: 500GB
const MAX_XLSX_SIZE_BYTES = MAX_XLSX_SIZE_MB * 1024 * 1024;
const MAX_DOCX_SIZE_BYTES = MAX_DOCX_SIZE_MB * 1024 * 1024;
const BUCKET_NAME = 'report-uploads';

interface StudyPair {
  studyId: string;
  xlsx: File | null;
  docx: File | null;
}

interface UnifiedUploadResult {
  study_id: string;
  success: boolean;
  xlsx_processed: boolean;
  docx_processed: boolean;
  error?: string;
  warnings?: string[];
  xlsx_result?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const rlKey = `unified-upload:${getRateLimitKey(request)}`;
    const { allowed } = checkRateLimit(rlKey, 10, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many upload requests. Please try again later.' },
        { status: 429 }
      );
    }

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

    const supabaseAdmin = createServerClient();
    const xlsxFiles: File[] = [];
    const docxFiles: File[] = [];
    const oversized: string[] = [];
    const tempStoragePaths: string[] = [];

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Storage-path mode: files were uploaded directly to Supabase Storage
      const body = await request.json();
      const filePaths: Array<{ name: string; storagePath: string }> = body.files || [];

      for (const fp of filePaths) {
        tempStoragePaths.push(fp.storagePath);
        const { data: blob, error: dlError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .download(fp.storagePath);

        if (dlError || !blob) {
          return NextResponse.json(
            { success: false, message: `Failed to retrieve ${fp.name} from storage: ${dlError?.message || 'Unknown error'}` },
            { status: 500 }
          );
        }

        const name = fp.name.toLowerCase();
        const file = new File([blob], fp.name);

        if (name.endsWith('.xlsx')) {
          if (file.size <= MAX_XLSX_SIZE_BYTES) xlsxFiles.push(file);
          else oversized.push(`${fp.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, max ${MAX_XLSX_SIZE_MB}MB)`);
        } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
          if (file.size <= MAX_DOCX_SIZE_BYTES) docxFiles.push(file);
          else oversized.push(`${fp.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, max ${MAX_DOCX_SIZE_MB}MB)`);
        }
      }
    } else {
      // FormData mode: files sent directly in the request body (local dev)
      const formData = await request.formData();

      for (const [, value] of formData.entries()) {
        if (!(value instanceof File) || !value.name) continue;

        const name = value.name.toLowerCase();
        if (name.endsWith('.xlsx')) {
          if (value.size <= MAX_XLSX_SIZE_BYTES) xlsxFiles.push(value);
          else oversized.push(`${value.name} (${(value.size / 1024 / 1024).toFixed(1)}MB, max ${MAX_XLSX_SIZE_MB}MB)`);
        } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
          if (value.size <= MAX_DOCX_SIZE_BYTES) docxFiles.push(value);
          else oversized.push(`${value.name} (${(value.size / 1024 / 1024).toFixed(1)}MB, max ${MAX_DOCX_SIZE_MB}MB)`);
        }
      }
    }

    if (oversized.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `File(s) too large: ${oversized.join('; ')}. Try compressing DOCX files or reducing embedded images.`,
        },
        { status: 400 }
      );
    }

    if (xlsxFiles.length === 0 && docxFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid files provided. Please upload .xlsx and/or .docx files.' },
        { status: 400 }
      );
    }

    if (xlsxFiles.length + docxFiles.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: `Maximum ${MAX_FILES} total files per upload.` },
        { status: 400 }
      );
    }

    // Pair files by study ID
    const studyMap = new Map<string, StudyPair>();

    for (const file of xlsxFiles) {
      const studyId = extractStudyId(file.name);
      const pair = studyMap.get(studyId) || { studyId, xlsx: null, docx: null };
      pair.xlsx = file;
      studyMap.set(studyId, pair);
    }

    for (const file of docxFiles) {
      const studyId = extractStudyId(file.name);
      const pair = studyMap.get(studyId) || { studyId, xlsx: null, docx: null };
      pair.docx = file;
      studyMap.set(studyId, pair);
    }
    const results: UnifiedUploadResult[] = [];

    for (const [, pair] of studyMap) {
      const result: UnifiedUploadResult = {
        study_id: pair.studyId,
        success: false,
        xlsx_processed: false,
        docx_processed: false,
      };

      try {
        // Step 1: Process XLSX via internal API call
        if (pair.xlsx) {
          const xlsxFormData = new FormData();
          xlsxFormData.append('files', pair.xlsx);

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
            body: xlsxFormData,
            headers,
          });

          const uploadJson = await uploadRes.json();
          const xlsxResult = uploadJson.results?.[0];
          if (xlsxResult?.success) {
            result.xlsx_processed = true;
            result.xlsx_result = xlsxResult;
            if (xlsxResult.warnings?.length) result.warnings = xlsxResult.warnings;
          } else {
            result.error = xlsxResult?.error || uploadJson.message || 'XLSX processing failed';
            if (xlsxResult?.warnings?.length) result.warnings = xlsxResult.warnings;
          }
        }

        // Step 2: Process DOCX
        if (pair.docx) {
          const docxBuffer = Buffer.from(await pair.docx.arrayBuffer());
          const parsed = await parseDocxReport(docxBuffer, pair.docx.name, {
            useLLMForMissing: true,
          });

          // Find the report record: prefer report_id from XLSX result when both in same batch
          let reportId: string | null = null;
          if (result.xlsx_result?.report_id && typeof result.xlsx_result.report_id === 'string') {
            reportId = result.xlsx_result.report_id;
          }
          if (!reportId) {
            const { data: existingReport } = await supabaseAdmin
              .from('reports')
              .select('id')
              .eq('study_id', pair.studyId)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (existingReport) reportId = existingReport.id;
          }
          if (!reportId && !pair.xlsx) {
            // No XLSX was uploaded — create the report from DOCX data
            const { title, propertyName } = await normalizeReportTitle({
              documentTitle: parsed.document_title,
              rawTitle: parsed.resort_name ? `${parsed.resort_name} - ${pair.studyId}` : null,
              resortName: parsed.resort_name,
              studyId: pair.studyId,
            });
            const location = [parsed.city, parsed.state].filter(Boolean).join(', ') || null;
            const { data: newReport, error: reportError } = await supabaseAdmin
              .from('reports')
              .insert({
                user_id: session.user.id,
                title,
                property_name: propertyName,
                location,
                city: parsed.city,
                state: parsed.state,
                study_id: pair.studyId,
                status: 'completed',
                market_type: parsed.market_type || 'outdoor_hospitality',
              })
              .select('id')
              .single();

            if (reportError) throw reportError;
            reportId = newReport.id;
          }

          if (reportId) {
            const docxStoragePath = `${reportId}/report.docx`;
            const { error: uploadError } = await supabaseAdmin.storage
              .from(BUCKET_NAME)
              .upload(docxStoragePath, docxBuffer, {
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                upsert: true,
              });

            if (uploadError) {
              console.error(`[unified-upload] DOCX storage upload failed for ${pair.studyId}:`, uploadError);
              const isSizeError = /exceeded.*maximum|too large|size limit/i.test(uploadError.message);
              result.error =
                result.error ||
                (isSizeError
                  ? 'File exceeds 100MB limit. Try compressing the DOCX or reducing embedded images.'
                  : `Failed to save DOCX to storage: ${uploadError.message}`);
            } else {
              // Geocode the address
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

              // Update report with DOCX data (DOCX wins for address/city/state)
              const reportUpdate: Record<string, unknown> = {
                has_docx: true,
                docx_file_path: docxStoragePath,
                has_narrative: true,
                narrative_file_path: docxStoragePath,
                status: 'completed',
              };

              const { title: normalizedTitle, propertyName: normalizedPropertyName } =
                await normalizeReportTitle({
                  documentTitle: parsed.document_title,
                  rawTitle: parsed.resort_name ? `${parsed.resort_name} - ${pair.studyId}` : null,
                  resortName: parsed.resort_name,
                  studyId: pair.studyId,
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
                .eq('id', reportId);

              result.docx_processed = true;
            }
          }
        }

        result.success = result.xlsx_processed || result.docx_processed;
        if (!result.success && !result.error) {
          result.error = 'No files could be processed for this study';
        }
      } catch (err) {
        console.error(`[unified-upload] Error processing study ${pair.studyId}:`, err);
        result.error = err instanceof Error ? err.message : 'Processing failed';
      }

      results.push(result);
    }

    const anySuccess = results.some((r) => r.success);
    const allSuccess = results.every((r) => r.success);

    if (tempStoragePaths.length > 0) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove(tempStoragePaths).catch(() => {});
    }

    return NextResponse.json({
      success: anySuccess,
      message: allSuccess
        ? `All ${results.length} studies processed successfully`
        : `${results.filter((r) => r.success).length} of ${results.length} studies processed`,
      results,
    });
  } catch (err) {
    console.error('[unified-upload] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Upload failed' },
      { status: 500 }
    );
  }
}
