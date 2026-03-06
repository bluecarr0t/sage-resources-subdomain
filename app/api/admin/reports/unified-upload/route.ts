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
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { parseDocxReport } from '@/lib/parsers/feasibility-docx-parser';
import { normalizeReportTitle } from '@/lib/normalize-report-title';
import { geocodeAddress } from '@/lib/geocode';
import { extractStudyId } from '@/lib/csv/feasibility-parser';
import { isValidTempUploadPath } from '@/lib/sanitize-filename';
import { logAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  docxStoragePath: string | null;
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}

/** Never log or expose ADMIN_INTERNAL_API_KEY. Rotate if compromised. */
const INTERNAL_API_KEY = process.env.ADMIN_INTERNAL_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const internalKey = request.headers.get('x-internal-api-key');
    const isInternalCall = INTERNAL_API_KEY && internalKey && internalKey === INTERNAL_API_KEY;

    const rlKey = isInternalCall
      ? `unified-upload-internal:${getRateLimitKey(request)}`
      : `unified-upload:${getRateLimitKey(request)}`;
    const rlLimit = isInternalCall ? 30 : 10;
    const { allowed } = await checkRateLimitAsync(rlKey, rlLimit, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many upload requests. Please try again later.' },
        { status: 429 }
      );
    }

    let userId: string;
    let userEmail: string | null = null;

    if (isInternalCall) {
      const supabaseAdmin = createServerClient();
      const { data: managed } = await supabaseAdmin
        .from('managed_users')
        .select('user_id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (!managed?.user_id) {
        return NextResponse.json(
          { success: false, message: 'No managed user found for bulk upload. Add a user to managed_users.' },
          { status: 500 }
        );
      }
      userId = managed.user_id;
    } else {
      const supabaseAuth = await createServerClientWithCookies();
      const {
        data: { session },
        error: sessionError,
      } = await supabaseAuth.auth.getSession();

      if (sessionError || !session?.user) return unauthorizedResponse();
      if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
      const hasAccess = await isManagedUser(session.user.id);
      if (!hasAccess) return forbiddenResponse();
      userId = session.user.id;
      userEmail = session.user.email ?? null;
    }

    const supabaseAdmin = createServerClient();
    const xlsxFiles: File[] = [];
    const docxEntries: Array<{ name: string; storagePath: string }> = [];
    const tempStoragePaths: string[] = [];
    const xlsxStoragePathByFilename = new Map<string, string>();
    let totalFileCount = 0;
    const formDataDocxFiles = new Map<string, File>();

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const filePaths: Array<{ name: string; storagePath: string }> = body.files || [];

      for (const fp of filePaths) {
        if (!isValidTempUploadPath(fp.storagePath)) {
          return NextResponse.json(
            { success: false, message: `Invalid storage path for ${fp.name || 'file'}` },
            { status: 400 }
          );
        }
        tempStoragePaths.push(fp.storagePath);
        const name = fp.name.toLowerCase();

        if (name.endsWith('.xlsx') || name.endsWith('.xlsm') || name.endsWith('.xlsxm')) {
          // Download XLSX/XLSM/XLSXM immediately (small enough, needed for comparables/upload)
          const { data: blob, error: dlError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .download(fp.storagePath);

          if (dlError || !blob) {
            return NextResponse.json(
              { success: false, message: `Failed to retrieve ${fp.name}: ${dlError?.message || 'Unknown error'}` },
              { status: 500 }
            );
          }

          xlsxFiles.push(new File([blob], fp.name));
          xlsxStoragePathByFilename.set(fp.name, fp.storagePath);
          totalFileCount++;
        } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
          // DOCXes: defer download until processing to avoid timeout
          docxEntries.push(fp);
          totalFileCount++;
        }
      }
    } else {
      const formData = await request.formData();

      for (const [, value] of formData.entries()) {
        if (!(value instanceof File) || !value.name) continue;

        const name = value.name.toLowerCase();
        if (name.endsWith('.xlsx') || name.endsWith('.xlsm') || name.endsWith('.xlsxm')) {
          if (value.size <= MAX_XLSX_SIZE_BYTES) xlsxFiles.push(value);
        } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
          if (value.size <= MAX_DOCX_SIZE_BYTES) {
            docxEntries.push({ name: value.name, storagePath: '' });
            // Store File reference for FormData mode (local dev)
            formDataDocxFiles.set(value.name, value);
          }
        }
        totalFileCount++;
      }
    }

    if (totalFileCount === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid files provided. Please upload .xlsx/.xlsm/.xlsxm and/or .docx files.' },
        { status: 400 }
      );
    }

    if (totalFileCount > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: `Maximum ${MAX_FILES} total files per upload.` },
        { status: 400 }
      );
    }

    // Pair files by study ID
    const studyMap = new Map<string, StudyPair>();

    for (const file of xlsxFiles) {
      const studyId = extractStudyId(file.name);
      const pair = studyMap.get(studyId) || { studyId, xlsx: null, docx: null, docxStoragePath: null };
      pair.xlsx = file;
      studyMap.set(studyId, pair);
    }

    for (const entry of docxEntries) {
      const studyId = extractStudyId(entry.name);
      const pair = studyMap.get(studyId) || { studyId, xlsx: null, docx: null, docxStoragePath: null };
      pair.docxStoragePath = entry.storagePath || null;
      // Create a placeholder File for pairing (no data loaded yet)
      pair.docx = new File([], entry.name);
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

          const xlsxStoragePath = xlsxStoragePathByFilename.get(pair.xlsx.name);
          const useStoragePath = !!xlsxStoragePath;

          if (useStoragePath) headers['Content-Type'] = 'application/json';

          const uploadRes = await fetch(`${origin}/api/admin/comparables/upload`, {
            method: 'POST',
            body: useStoragePath
              ? JSON.stringify({ files: [{ name: pair.xlsx.name, storagePath: xlsxStoragePath }] })
              : (() => {
                  const fd = new FormData();
                  fd.append('files', pair.xlsx!);
                  return fd;
                })(),
            headers,
          });

          const text = await uploadRes.text();
          let uploadJson: { results?: Array<{ success?: boolean; error?: string; warnings?: string[]; report_id?: string }>; message?: string };
          try {
            uploadJson = JSON.parse(text);
          } catch {
            throw new Error(uploadRes.status === 413 ? 'File too large for processing. Try compressing.' : `Invalid response: ${text.slice(0, 80)}`);
          }
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
        if (pair.docx && pair.docx.name) {
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
            const { data: newReport, error: reportError } = await supabaseAdmin
              .from('reports')
              .insert({
                user_id: userId,
                title: pair.studyId,
                property_name: pair.studyId,
                study_id: pair.studyId,
                location: pair.studyId,
                status: 'completed',
                market_type: 'outdoor_hospitality',
              })
              .select('id')
              .single();

            if (reportError) throw new Error(`Failed to create report: ${reportError.message} (${reportError.code})`);
            reportId = newReport.id;
          }

          if (reportId) {
            const docxStoragePath = `${reportId}/report.docx`;
            let docxStored = false;

            if (pair.docxStoragePath) {
              // Production: copy file in storage (server-side, no client memory needed)
              const { error: copyError } = await supabaseAdmin.storage
                .from(BUCKET_NAME)
                .copy(pair.docxStoragePath, docxStoragePath);

              if (copyError) {
                // Fallback: try move instead
                const { error: moveError } = await supabaseAdmin.storage
                  .from(BUCKET_NAME)
                  .move(pair.docxStoragePath, docxStoragePath);

                if (moveError) {
                  console.error(`[unified-upload] DOCX storage failed for ${pair.studyId}: copy=${copyError.message}, move=${moveError.message}`);
                  result.error = result.error || `Failed to save DOCX: ${copyError.message}`;
                } else {
                  docxStored = true;
                  const idx = tempStoragePaths.indexOf(pair.docxStoragePath);
                  if (idx >= 0) tempStoragePaths.splice(idx, 1);
                }
              } else {
                docxStored = true;
              }
            } else {
              // Local dev (FormData): upload from memory
              const formFile = formDataDocxFiles.get(pair.docx.name);
              if (formFile) {
                const docxBuffer = Buffer.from(await formFile.arrayBuffer());
                const { error: uploadError } = await supabaseAdmin.storage
                  .from(BUCKET_NAME)
                  .upload(docxStoragePath, docxBuffer, {
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    upsert: true,
                  });
                if (uploadError) {
                  console.error(`[unified-upload] DOCX upload failed for ${pair.studyId}:`, uploadError);
                  result.error = result.error || `Failed to save DOCX: ${uploadError.message}`;
                } else {
                  docxStored = true;
                }
              }
            }

            if (docxStored) {
              const reportUpdate: Record<string, unknown> = {
                has_docx: true,
                docx_file_path: docxStoragePath,
                has_narrative: true,
                narrative_file_path: docxStoragePath,
                status: 'completed',
              };

              let docxBuffer: Buffer | null = null;
              if (!pair.docxStoragePath) {
                // Local dev (FormData): file is in memory
                const formFile = formDataDocxFiles.get(pair.docx.name);
                if (formFile) docxBuffer = Buffer.from(await formFile.arrayBuffer());
              } else {
                // Production (storage-path): download from storage to parse
                const { data: blob, error: dlError } = await supabaseAdmin.storage
                  .from(BUCKET_NAME)
                  .download(docxStoragePath);
                if (!dlError && blob) docxBuffer = Buffer.from(await blob.arrayBuffer());
              }

              if (docxBuffer && docxBuffer.length <= MAX_DOCX_SIZE_BYTES) {
                const parsed = await parseDocxReport(docxBuffer, pair.docx.name, {
                  useLLMForMissing: false,
                });

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
                reportUpdate.location = [parsed.city, parsed.state].filter(Boolean).join(', ') || null;

                if (parsed.city || parsed.address) {
                  const coords = await geocodeAddress(
                    parsed.address || '', parsed.city || '', parsed.state || '', parsed.zip_code || '', 'USA'
                  );
                  if (coords) {
                    reportUpdate.latitude = coords.lat;
                    reportUpdate.longitude = coords.lng;
                  }
                }
              }

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
        const errMsg = err instanceof Error ? err.message : typeof err === 'object' && err !== null ? JSON.stringify(err) : 'Processing failed';
        console.error(`[unified-upload] Error processing study ${pair.studyId}:`, errMsg);
        result.error = errMsg;
      }

      if (result.success) {
        const reportIdForAudit = result.xlsx_result?.report_id as string | undefined;
        const reportId = reportIdForAudit ?? (await supabaseAdmin.from('reports').select('id').eq('study_id', pair.studyId).maybeSingle()).data?.id;
        if (reportId) {
          await logAdminAudit(
            {
              user_id: userId,
              user_email: userEmail ?? undefined,
              action: 'upload',
              resource_type: 'report',
              resource_id: reportId,
              study_id: pair.studyId,
              details: {
                xlsx_processed: result.xlsx_processed,
                docx_processed: result.docx_processed,
              },
              source: isInternalCall ? 'internal_api' : 'session',
            },
            request
          );
        }
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
