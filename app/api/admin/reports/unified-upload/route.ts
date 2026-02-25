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

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import { parseDocxReport } from '@/lib/parsers/feasibility-docx-parser';
import { geocodeAddress } from '@/lib/geocode';
import { extractStudyId } from '@/lib/csv/feasibility-parser';

const MAX_FILES = 20;
const MAX_XLSX_SIZE_MB = 50;
const MAX_DOCX_SIZE_MB = 100;
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

    const formData = await request.formData();

    const xlsxFiles: File[] = [];
    const docxFiles: File[] = [];

    for (const [, value] of formData.entries()) {
      if (!(value instanceof File) || !value.name) continue;

      const name = value.name.toLowerCase();
      if (name.endsWith('.xlsx')) {
        if (value.size <= MAX_XLSX_SIZE_BYTES) xlsxFiles.push(value);
      } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
        if (value.size <= MAX_DOCX_SIZE_BYTES) docxFiles.push(value);
      }
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

    const supabaseAdmin = createServerClient();
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
          if (uploadJson.results?.[0]?.success) {
            result.xlsx_processed = true;
            result.xlsx_result = uploadJson.results[0];
          } else {
            result.error = uploadJson.results?.[0]?.error || uploadJson.message || 'XLSX processing failed';
          }
        }

        // Step 2: Process DOCX
        if (pair.docx) {
          const docxBuffer = Buffer.from(await pair.docx.arrayBuffer());
          const parsed = await parseDocxReport(docxBuffer, pair.docx.name);

          // Find the report record (created by XLSX upload, or existing)
          let reportId: string | null = null;
          const { data: existingReport } = await supabaseAdmin
            .from('reports')
            .select('id')
            .eq('study_id', pair.studyId)
            .maybeSingle();

          if (existingReport) {
            reportId = existingReport.id;
          } else if (!pair.xlsx) {
            // No XLSX was uploaded — create the report from DOCX data
            const location = [parsed.city, parsed.state].filter(Boolean).join(', ') || null;
            const { data: newReport, error: reportError } = await supabaseAdmin
              .from('reports')
              .insert({
                user_id: session.user.id,
                title: parsed.resort_name
                  ? `${parsed.resort_name} - ${pair.studyId}`
                  : `Feasibility Study ${pair.studyId}`,
                property_name: parsed.resort_name || pair.studyId,
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
            // Store DOCX file
            const docxStoragePath = `${reportId}/report.docx`;
            await supabaseAdmin.storage
              .from(BUCKET_NAME)
              .upload(docxStoragePath, docxBuffer, {
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                upsert: true,
              });

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

            if (parsed.resort_name) {
              reportUpdate.property_name = parsed.resort_name;
              reportUpdate.title = `${parsed.resort_name} - ${pair.studyId}`;
            }
            if (parsed.city) reportUpdate.city = parsed.city;
            if (parsed.state) reportUpdate.state = parsed.state;
            if (parsed.address) reportUpdate.address_1 = parsed.address;
            if (parsed.zip_code) reportUpdate.zip_code = parsed.zip_code;
            if (parsed.county) reportUpdate.county = parsed.county;
            if (parsed.parcel_number) reportUpdate.parcel_number = parsed.parcel_number;
            if (parsed.lot_size_acres) reportUpdate.lot_size_acres = parsed.lot_size_acres;
            if (parsed.total_units) reportUpdate.total_sites = parsed.total_units;
            if (parsed.market_type) reportUpdate.market_type = parsed.market_type;
            if (parsed.executive_summary) reportUpdate.executive_summary = parsed.executive_summary;
            if (parsed.swot) reportUpdate.swot = parsed.swot;
            if (parsed.authors) reportUpdate.authors = parsed.authors;
            reportUpdate.report_date = parsed.report_date ?? null;
            if (parsed.client_entity) reportUpdate.client_entity = parsed.client_entity;
            if (parsed.report_purpose) reportUpdate.report_purpose = parsed.report_purpose;
            if (parsed.development_phase) reportUpdate.development_phase = parsed.development_phase;
            if (parsed.zoning) reportUpdate.zoning = parsed.zoning;
            if (parsed.unit_mix) reportUpdate.unit_mix = parsed.unit_mix;
            if (parsed.financial_assumptions) reportUpdate.financial_assumptions = parsed.financial_assumptions;
            if (parsed.recommendations) reportUpdate.recommendations = parsed.recommendations;
            if (latitude !== null) reportUpdate.latitude = latitude;
            if (longitude !== null) reportUpdate.longitude = longitude;

            // Build location string
            const locationParts = [parsed.city, parsed.state].filter(Boolean);
            if (locationParts.length > 0) {
              reportUpdate.location = locationParts.join(', ');
            }

            await supabaseAdmin
              .from('reports')
              .update(reportUpdate)
              .eq('id', reportId);

            result.docx_processed = true;
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
