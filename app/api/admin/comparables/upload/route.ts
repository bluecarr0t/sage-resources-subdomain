/**
 * API Route: Upload feasibility study XLSX workbooks
 * POST /api/admin/comparables/upload
 *
 * Accepts up to 10 .xlsx files via multipart/form-data.
 * Each workbook is parsed via parseWorkbook(), the raw file is
 * stored to Supabase Storage, and extracted data is inserted
 * into all feasibility tables.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain, getManagedUser } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { parseWorkbook } from '@/lib/parsers/feasibility-xlsx-parser';
import { normalizeReportTitle } from '@/lib/normalize-report-title';
import { sanitizeFilename } from '@/lib/sanitize-filename';
import { logAdminAudit } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';
import type {
  FeasibilityComparableInsert,
  FeasibilityCompUnitInsert,
  FeasibilityStudySummaryInsert,
  FeasibilityPropertyScoreInsert,
  FeasibilityProFormaUnitInsert,
  FeasibilityValuationInsert,
  FeasibilityFinancingInsert,
  FeasibilityDevelopmentCostInsert,
  FeasibilityRateProjectionInsert,
  FeasibilityOccupancyProjectionInsert,
  FeasibilityMarketDataInsert,
  UploadResult,
} from '@/lib/types/feasibility';

const MAX_FILES = 10;
const BUCKET_NAME = 'report-uploads';

/** Clamp numerics to prevent "numeric field overflow" from Excel data. */
const MAX_CURRENCY = 999_999_999_999.99;   // NUMERIC(14,2) / (18,2)
const MAX_ADR = 999_999.99;                 // NUMERIC(10,2)
const MAX_PERCENT = 999.99;                 // NUMERIC(5,2)
const MAX_PERCENT_4 = 9.9999;               // NUMERIC(5,4) for 0-1 range
const MAX_SCORE = 10;                       // quality/score 0-10
const MAX_INTEGER = 2_147_483_647;          // INTEGER

function clampCurrency(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(Math.max(-MAX_CURRENCY, Math.min(MAX_CURRENCY, n)) * 100) / 100;
}
function clampAdr(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(Math.max(-MAX_ADR, Math.min(MAX_ADR, n)) * 100) / 100;
}
function clampPercent(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(Math.max(-MAX_PERCENT, Math.min(MAX_PERCENT, n)) * 100) / 100;
}
function clampPercent4(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(Math.max(-MAX_PERCENT_4, Math.min(MAX_PERCENT_4, n)) * 10000) / 10000;
}
function clampScore(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(Math.max(0, Math.min(MAX_SCORE, n)) * 100) / 100;
}
function clampInt(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  const v = Math.round(n);
  return Math.max(-MAX_INTEGER, Math.min(MAX_INTEGER, v));
}

function clampYearlyData(yd: Array<{ year?: number; adr?: number | null; occupancy?: number | null; site_nights?: number | null; revenue?: number | null }> | null): typeof yd {
  if (!yd) return null;
  return yd.map((d) => ({
    year: clampInt(d.year) ?? d.year,
    adr: clampAdr(d.adr),
    occupancy: clampPercent4(d.occupancy),
    site_nights: clampInt(d.site_nights),
    revenue: clampCurrency(d.revenue),
  }));
}

function clampYearlyProjections(yp: Array<{ year?: number; total_revenue?: number | null; total_expenses?: number | null; noi?: number | null; noi_margin?: number | null }> | null): typeof yp {
  if (!yp) return null;
  return yp.map((d) => ({
    year: clampInt(d.year) ?? d.year,
    total_revenue: clampCurrency(d.total_revenue),
    total_expenses: clampCurrency(d.total_expenses),
    noi: clampCurrency(d.noi),
    noi_margin: clampPercent(d.noi_margin),
  }));
}

function clampYearlyReturns(yr: Array<{ year?: number; noi?: number | null; net_income_to_equity?: number | null; cash_on_cash?: number | null; dcr?: number | null }> | null): typeof yr {
  if (!yr) return null;
  return yr.map((d) => ({
    year: clampInt(d.year) ?? d.year,
    noi: clampCurrency(d.noi),
    net_income_to_equity: clampCurrency(d.net_income_to_equity),
    cash_on_cash: clampPercent4(d.cash_on_cash),
    dcr: clampAdr(d.dcr),
  }));
}

/** Ensure report-uploads bucket exists and accepts .xlsx. Creates or updates as needed. */
async function ensureReportUploadsBucket(supabase: ReturnType<typeof createServerClient>): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);
  const mimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'application/octet-stream', // .xlsxm
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
  ];

  if (exists) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 104857600, // 100MB (Pro plan)
      allowedMimeTypes: mimeTypes,
    });
    if (updateError) {
      console.warn('[comparables/upload] Could not update bucket:', updateError.message);
    }
    return;
  }

  let createError: { message?: string } | null = null;
  const { error: e1 } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 104857600, // 100MB (Pro plan)
    allowedMimeTypes: mimeTypes,
  });
  createError = e1;

  if (createError && !createError.message?.includes('already exists')) {
    const { error: e2 } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 104857600, // 100MB (Pro plan)
    });
    if (e2 && !e2.message?.includes('already exists')) {
      throw new Error(`Failed to create storage bucket: ${createError.message}`);
    }
  }
}

/** Derive location string from filename (e.g. "25-101A-01 Emory, TX Glmp FS.xlsx" -> "Emory, TX") or project info */
function deriveLocation(
  filename: string,
  projectInfo: { resort_name: string | null; resort_address?: string | null; county: string | null } | null
): string {
  if (projectInfo?.resort_address) return projectInfo.resort_address;
  if (projectInfo?.resort_name && projectInfo?.county) {
    return `${projectInfo.resort_name}, ${projectInfo.county}`;
  }
  if (projectInfo?.resort_name) return projectInfo.resort_name;
  if (projectInfo?.county) return projectInfo.county;
  const base = filename.replace(/\.[^.]+$/, '');
  const studyIdMatch = base.match(/^(\d{2}-\d{3}[A-Z]?-\d{2})\s*/);
  const afterStudyId = studyIdMatch ? base.slice(studyIdMatch[0].length).trim() : base;
  const cityStateMatch = afterStudyId.match(/^([^,]+,\s*[A-Z]{2})(?:\s|$)/i);
  if (cityStateMatch) return cityStateMatch[1].trim();
  return afterStudyId || 'Unknown';
}

/** Derive state from location string (e.g. "Sulphur Springs, TX" -> "TX") */
function deriveStateFromLocation(location: string): string | null {
  const match = location.match(/,\s*([A-Z]{2})(?:\s|$)/i);
  return match ? match[1].toUpperCase() : null;
}

/** Derive city from location string (e.g. "Newport, TN" -> "Newport") */
function deriveCityFromLocation(location: string): string | null {
  const match = location.match(/^([^,]+),\s*[A-Z]{2}(?:\s|$)/i);
  return match ? match[1].trim() : null;
}

/** Never log or expose ADMIN_INTERNAL_API_KEY. Rotate if compromised. */
const INTERNAL_API_KEY = process.env.ADMIN_INTERNAL_API_KEY;

const UPLOAD_RATE_LIMIT = 20; // requests per window
const UPLOAD_RATE_WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    const rlKey = `upload:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many upload requests. Please try again later.' },
        { status: 429 }
      );
    }

    const internalKey = request.headers.get('x-internal-api-key');
    const isInternalCall = INTERNAL_API_KEY && internalKey && internalKey === INTERNAL_API_KEY;

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
          { success: false, message: 'No managed user found for internal upload. Add a user to managed_users.' },
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
      // RBAC: only admins can upload comparables via session (internal key used for bulk/CI)
      const user = await getManagedUser(session.user.id);
      if (!user || user.role !== 'admin') return forbiddenResponse();
      userId = session.user.id;
      userEmail = session.user.email ?? null;
    }

    const supabaseAdmin = createServerClient();
    const files: File[] = [];
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Storage-path mode: download from Supabase (avoids Vercel 4.5MB body limit on internal calls)
      const body = await request.json();
      const filePaths: Array<{ name: string; storagePath: string }> = body.files || [];

      for (const fp of filePaths) {
        const fn = fp.name.toLowerCase();
        if (!fn.endsWith('.xlsx') && !fn.endsWith('.xlsm') && !fn.endsWith('.xlsxm')) continue;

        const { data: blob, error: dlError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .download(fp.storagePath);

        if (dlError || !blob) {
          return NextResponse.json(
            { success: false, message: `Failed to retrieve ${fp.name}: ${dlError?.message || 'Unknown error'}` },
            { status: 500 }
          );
        }

        files.push(new File([blob], fp.name));
      }
    } else {
      const formData = await request.formData();
      for (const [, value] of formData.entries()) {
        if (value instanceof File) {
          const name = value.name.toLowerCase();
          if (name.endsWith('.xlsx') || name.endsWith('.xlsm') || name.endsWith('.xlsxm')) {
            files.push(value);
          }
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No .xlsx/.xlsm/.xlsxm files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: `Maximum ${MAX_FILES} files per upload` },
        { status: 400 }
      );
    }

    const results: UploadResult[] = [];

    try {
      await ensureReportUploadsBucket(supabaseAdmin);
    } catch (bucketErr) {
      console.warn('[comparables/upload] Bucket ensure (pre-flight):', bucketErr);
    }

    for (const file of files) {
      try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const parsed = parseWorkbook(buffer, file.name);

        const hasData =
          parsed.comparables.length > 0 ||
          parsed.comp_units.length > 0 ||
          parsed.property_scores.length > 0 ||
          parsed.pro_forma_units.length > 0 ||
          parsed.valuation !== null ||
          parsed.financing !== null ||
          parsed.development_costs.length > 0 ||
          parsed.rate_projections.length > 0 ||
          parsed.occupancy_projections.length > 0 ||
          parsed.market_data.length > 0 ||
          parsed.project_info !== null;

        if (!hasData) {
          results.push({
            filename: file.name,
            study_id: parsed.study_id,
            success: false,
            error: `No parseable data found. Sheets detected: ${parsed.sheets_found.join(', ') || 'none'}`,
            warnings: parsed.warnings?.length ? parsed.warnings : undefined,
          });
          continue;
        }

        // Find or create the parent report (duplicate uploads override existing)
        const { data: existingReport } = await supabaseAdmin
          .from('reports')
          .select('id')
          .eq('study_id', parsed.study_id)
          .maybeSingle();

        const { title, propertyName } = await normalizeReportTitle({
          rawTitle: parsed.project_info?.resort_name
            ? `${parsed.project_info.resort_name} - ${parsed.study_id}`
            : null,
          propertyName: parsed.project_info?.resort_name,
          studyId: parsed.study_id,
        });

        const location = deriveLocation(file.name, parsed.project_info);
        const state = deriveStateFromLocation(location);

        let reportId: string;
        if (existingReport) {
          reportId = existingReport.id;
        } else {
          const { data: newReport, error: reportError } = await supabaseAdmin
            .from('reports')
            .insert({
              user_id: userId,
              title,
              property_name: propertyName,
              location,
              state,
              study_id: parsed.study_id,
              status: 'draft',
              market_type: 'outdoor_hospitality',
              has_comparables: true,
            })
            .select('id')
            .single();

          if (reportError) throw reportError;
          reportId = newReport.id;
        }

        const safeFilename = sanitizeFilename(file.name);
        const storagePath = `${reportId}/workbooks/${safeFilename}`;
        let uploadError: { message?: string } | null = null;
        let uploadResult = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: true,
          });
        uploadError = uploadResult.error;

        if (uploadError && (uploadError.message?.includes('Bucket') || uploadError.message?.includes('not found') || uploadError.message?.includes('MIME'))) {
          try {
            await ensureReportUploadsBucket(supabaseAdmin);
            uploadResult = await supabaseAdmin.storage
              .from(BUCKET_NAME)
              .upload(storagePath, buffer, {
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                upsert: true,
              });
            uploadError = uploadResult.error;
          } catch (ensureErr) {
            console.error('[comparables/upload] Bucket ensure failed:', ensureErr);
          }
        }

        if (uploadError) {
          if (!existingReport) {
            await supabaseAdmin.from('reports').delete().eq('id', reportId);
          }
          throw new Error(
            uploadError.message?.includes('Bucket') || uploadError.message?.includes('MIME')
              ? `Storage bucket "report-uploads" may not exist or may reject .xlsx/.xlsm/.xlsxm files. ${uploadError.message}`
              : `Failed to save file to storage: ${uploadError.message}`
          );
        }

        // ---- Build all insert payloads before any DB mutations ----

        // Dedupe comparables by normalized name (strip trailing asterisk); keep row with most data
        const normalizeCompName = (n: string) => String(n || '').trim().replace(/\*+$/, '').trim() || n;
        const compDeduped = new Map<string, (typeof parsed.comparables)[0]>();
        for (const c of parsed.comparables) {
          const key = normalizeCompName(c.comp_name).toLowerCase();
          const existing = compDeduped.get(key);
          const score = (x: (typeof parsed.comparables)[0]) =>
            (x.overview ? 4 : 0) + (x.state ? 2 : 0) + (x.total_sites != null ? 2 : 0) + (x.quality_score != null ? 2 : 0) + ((x.amenity_keywords?.length ?? 0) > 0 ? 1 : 0);
          if (!existing || score(c) > score(existing)) compDeduped.set(key, c);
        }

        const compInserts: FeasibilityComparableInsert[] = [...compDeduped.values()].map((c) => ({
          report_id: reportId,
          study_id: parsed.study_id,
          comp_name: c.comp_name,
          overview: c.overview,
          state: c.state ?? null,
          amenities: c.amenities,
          amenity_keywords: c.amenity_keywords,
          distance_miles: clampAdr(c.distance_miles),
          total_sites: clampInt(c.total_sites),
          quality_score: clampScore(c.quality_score),
          property_type: c.property_type,
        }));

        const summaryInserts: FeasibilityStudySummaryInsert[] = parsed.summaries.map((s) => ({
          report_id: reportId,
          study_id: parsed.study_id,
          summary_type: s.summary_type,
          label: s.label,
          num_units: clampInt(s.num_units),
          low_adr: clampAdr(s.low_adr),
          peak_adr: clampAdr(s.peak_adr),
          low_monthly_rate: clampAdr(s.low_monthly_rate),
          peak_monthly_rate: clampAdr(s.peak_monthly_rate),
          low_occupancy: clampPercent(s.low_occupancy),
          peak_occupancy: clampPercent(s.peak_occupancy),
          quality_score: clampScore(s.quality_score),
          stat_min: null,
          stat_avg: null,
          stat_max: null,
        }));

        const scoreInserts: FeasibilityPropertyScoreInsert[] = parsed.property_scores.map((s) => ({
          report_id: reportId,
          study_id: parsed.study_id,
          property_name: s.property_name,
          overall_score: clampScore(s.overall_score),
          is_subject: s.is_subject,
          unit_types_score: clampScore(s.unit_types_score),
          unit_types_description: s.unit_types_description,
          unit_amenities_score: clampScore(s.unit_amenities_score),
          unit_amenities_description: s.unit_amenities_description,
          property_score: clampScore(s.property_score),
          property_description: s.property_description,
          property_amenities_score: clampScore(s.property_amenities_score),
          property_amenities_description: s.property_amenities_description,
          location_score: clampScore(s.location_score),
          location_description: s.location_description,
          brand_strength_score: clampScore(s.brand_strength_score),
          brand_strength_description: s.brand_strength_description,
          occupancy_notes: s.occupancy_notes,
        }));

        const pfInserts: FeasibilityProFormaUnitInsert[] = parsed.pro_forma_units.map((u) => {
          const clamped = clampYearlyData(u.yearly_data) ?? u.yearly_data ?? [];
          const yearly_data = clamped.map((d, i) => ({
            year: d.year ?? i + 1,
            adr: clampAdr(d.adr),
            occupancy: clampPercent4(d.occupancy),
            site_nights: clampInt(d.site_nights),
            revenue: clampCurrency(d.revenue),
          }));
          return {
            report_id: reportId,
            study_id: parsed.study_id,
            unit_type: u.unit_type,
            unit_category: u.unit_category,
            unit_count: clampInt(u.unit_count),
            adr_growth_rate: clampPercent(u.adr_growth_rate),
            yearly_data,
          };
        });

        let valInsert: FeasibilityValuationInsert | null = null;
        if (parsed.valuation) {
          const v = parsed.valuation;

          // Populate expense_breakdown from pro forma expense items if available
          let expenseBreakdown = v.expense_breakdown?.map((e) => ({
            ...e,
            amount: clampCurrency((e as { amount?: number | null }).amount),
            per_unit: clampCurrency((e as { per_unit?: number | null }).per_unit),
            pct_of_revenue: clampPercent((e as { pct_of_revenue?: number | null }).pct_of_revenue),
          }));
          if ((!expenseBreakdown || expenseBreakdown.length === 0) && parsed.pro_forma_expenses.length > 0) {
            expenseBreakdown = parsed.pro_forma_expenses.map((e) => ({
              category: e.category,
              label: e.label,
              amount: clampCurrency(e.yearly_amounts[0]?.amount ?? null),
              per_unit: clampCurrency(e.per_unit),
              pct_of_revenue: clampPercent(e.pct_of_revenue),
              yearly_amounts: e.yearly_amounts,
            }));
          }

          valInsert = {
            report_id: reportId,
            study_id: parsed.study_id,
            valuation_type: v.valuation_type,
            total_units: clampInt(v.total_units),
            occupancy_rate: clampPercent(v.occupancy_rate),
            average_daily_rate: clampAdr(v.average_daily_rate),
            annual_lodging_revenue: clampCurrency(v.annual_lodging_revenue),
            total_revenue: clampCurrency(v.total_revenue),
            total_expenses: clampCurrency(v.total_expenses),
            total_expenses_with_reserves: clampCurrency(v.total_expenses_with_reserves),
            noi: clampCurrency(v.noi),
            noi_margin: clampPercent(v.noi_margin),
            cap_rate: clampPercent(v.cap_rate),
            indicated_value: clampCurrency(v.indicated_value),
            value_per_unit: clampCurrency(v.value_per_unit),
            stabilization_months: clampInt(v.stabilization_months),
            stabilization_cost: clampCurrency(v.stabilization_cost),
            as_is_value: clampCurrency(v.as_is_value),
            discount_rate: clampPercent(v.discount_rate),
            terminal_cap_rate: clampPercent(v.terminal_cap_rate),
            projected_sale_price: clampCurrency(v.projected_sale_price),
            market_rental_rates: v.market_rental_rates?.map((r) => ({
              ...r,
              daily_rate: clampAdr(r.daily_rate),
              weekly_rate: clampAdr(r.weekly_rate),
              monthly_rate: clampAdr(r.monthly_rate),
            })),
            expense_breakdown: expenseBreakdown,
            yearly_projections: clampYearlyProjections(v.yearly_projections) ?? v.yearly_projections,
          };
        }

        let finInsert: FeasibilityFinancingInsert | null = null;
        if (parsed.financing) {
          const f = parsed.financing;
          finInsert = {
            report_id: reportId,
            study_id: parsed.study_id,
            interest_rate: clampPercent4(f.interest_rate),
            loan_term_years: clampInt(f.loan_term_years),
            ltc_ratio: clampPercent4(f.ltc_ratio),
            equity_pct: clampPercent4(f.equity_pct),
            mortgage_amount: clampCurrency(f.mortgage_amount),
            annual_debt_service: clampCurrency(f.annual_debt_service),
            total_development_cost: clampCurrency(f.total_development_cost),
            land_cost: clampCurrency(f.land_cost),
            total_project_cost: clampCurrency(f.total_project_cost),
            payback_period_years: clampInt(f.payback_period_years),
            irr_on_equity: clampPercent4(f.irr_on_equity),
            yearly_returns: (() => {
              const raw = clampYearlyReturns(f.yearly_returns) ?? f.yearly_returns ?? [];
              return raw.map((r, i) => ({
                year: r.year ?? i + 1,
                noi: clampCurrency(r.noi),
                net_income_to_equity: clampCurrency(r.net_income_to_equity),
                cash_on_cash: clampPercent4(r.cash_on_cash),
                dcr: clampAdr(r.dcr),
              }));
            })(),
          };
        }

        const devInserts: FeasibilityDevelopmentCostInsert[] = parsed.development_costs.map((d) => ({
          report_id: reportId,
          study_id: parsed.study_id,
          line_item: d.line_item,
          category: d.category,
          per_unit_cost: clampCurrency(d.per_unit_cost),
          total_cost: clampCurrency(d.total_cost),
          notes: d.notes,
        }));

        const rateInserts: FeasibilityRateProjectionInsert[] = parsed.rate_projections.map((r) => ({
          report_id: reportId,
          study_id: parsed.study_id,
          unit_type: r.unit_type,
          is_subject: r.is_subject,
          low_rate: clampAdr(r.low_rate),
          peak_rate: clampAdr(r.peak_rate),
          avg_rate: clampAdr(r.avg_rate),
          quality_score: clampScore(r.quality_score),
          source: r.source,
          rate_category: r.rate_category,
          seasonal_rates: r.seasonal_rates,
        }));

        const occInserts: FeasibilityOccupancyProjectionInsert[] = parsed.occupancy_projections.map((o) => ({
          report_id: reportId,
          study_id: parsed.study_id,
          unit_type: o.unit_type,
          stabilized_low_occ: clampPercent4(o.stabilized_low_occ),
          stabilized_peak_occ: clampPercent4(o.stabilized_peak_occ),
          weighted_annual_occ: clampPercent4(o.weighted_annual_occ),
          low_months: clampInt(o.low_months),
          peak_months: clampInt(o.peak_months),
          ramp_up: o.ramp_up,
          monthly_occupancy: o.monthly_occupancy,
        }));

        const marketInserts: FeasibilityMarketDataInsert[] = parsed.market_data.map((m) => ({
          report_id: reportId,
          study_id: parsed.study_id,
          radius: m.radius,
          population_2020: clampInt(m.population_2020),
          population_projected: clampInt(m.population_projected),
          population_growth_rate: clampPercent4(m.population_growth_rate),
          households_2020: clampInt(m.households_2020),
          avg_household_size: clampAdr(m.avg_household_size),
          median_household_income: clampAdr(m.median_household_income),
          per_capita_income: clampAdr(m.per_capita_income),
        }));

        // ---- Delete old data and insert new (file is safely in storage for recovery) ----
        // If inserts fail, the original file is still available via "Re-extract".
        try {
          await Promise.all([
            supabaseAdmin.from('feasibility_comp_units').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_study_summaries').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_property_scores').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_pro_forma_units').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_valuations').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_financing').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_development_costs').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_rate_projections').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_occupancy_projections').delete().eq('report_id', reportId),
            supabaseAdmin.from('feasibility_market_data').delete().eq('report_id', reportId),
          ]);
          await supabaseAdmin.from('feasibility_comparables').delete().eq('report_id', reportId);
        } catch (deleteErr) {
          throw new Error(`Failed to clear old data: ${(deleteErr as Error).message}. No data was lost — try re-extracting.`);
        }

        const compIdMap = new Map<string, string>();

        if (compInserts.length > 0) {
          const { data: insertedComps, error: compError } = await supabaseAdmin
            .from('feasibility_comparables')
            .insert(compInserts)
            .select('id, comp_name');

          if (compError) throw new Error(`Insert failed (comparables): ${compError.message}. Use "Re-extract" to retry.`);
          insertedComps?.forEach((c: { id: string; comp_name: string }) => {
            compIdMap.set(c.comp_name.toLowerCase(), c.id);
          });
        }

        if (parsed.comp_units.length > 0) {
          const unitInserts: FeasibilityCompUnitInsert[] = parsed.comp_units.map((u) => ({
            report_id: reportId,
            comparable_id: compIdMap.get(normalizeCompName(u.property_name).toLowerCase()) || null,
            study_id: parsed.study_id,
            property_name: u.property_name,
            unit_type: u.unit_type,
            unit_category: u.unit_category,
            num_units: clampInt(u.num_units),
            low_adr: clampAdr(u.low_adr),
            peak_adr: clampAdr(u.peak_adr),
            avg_annual_adr: clampAdr(u.avg_annual_adr),
            low_monthly_rate: clampAdr(u.low_monthly_rate),
            peak_monthly_rate: clampAdr(u.peak_monthly_rate),
            low_occupancy: clampPercent(u.low_occupancy),
            peak_occupancy: clampPercent(u.peak_occupancy),
            quality_score: clampScore(u.quality_score),
          }));

          for (let j = 0; j < unitInserts.length; j += 50) {
            const batch = unitInserts.slice(j, j + 50);
            const { error: unitError } = await supabaseAdmin
              .from('feasibility_comp_units')
              .insert(batch);
            if (unitError) throw new Error(`Insert failed (units batch ${j}): ${unitError.message}. Use "Re-extract" to retry.`);
          }
        }

        if (summaryInserts.length > 0) {
          const { error: summError } = await supabaseAdmin
            .from('feasibility_study_summaries')
            .insert(summaryInserts);
          if (summError) throw new Error(`Insert failed (summaries): ${summError.message}. Use "Re-extract" to retry.`);
        }

        if (scoreInserts.length > 0) {
          const { error: scoreError } = await supabaseAdmin
            .from('feasibility_property_scores')
            .insert(scoreInserts);
          if (scoreError) throw new Error(`Insert failed (scores): ${scoreError.message}. Use "Re-extract" to retry.`);
        }

        if (pfInserts.length > 0) {
          const { error: pfError } = await supabaseAdmin
            .from('feasibility_pro_forma_units')
            .insert(pfInserts);
          if (pfError) throw new Error(`Insert failed (pro forma): ${pfError.message}. Use "Re-extract" to retry.`);
        }

        if (valInsert) {
          const { error: valError } = await supabaseAdmin
            .from('feasibility_valuations')
            .insert(valInsert);
          if (valError) throw new Error(`Insert failed (valuation): ${valError.message}. Use "Re-extract" to retry.`);
        }

        if (finInsert) {
          const { error: finError } = await supabaseAdmin
            .from('feasibility_financing')
            .insert(finInsert);
          if (finError) throw new Error(`Insert failed (financing): ${finError.message}. Use "Re-extract" to retry.`);
        }

        if (devInserts.length > 0) {
          for (let j = 0; j < devInserts.length; j += 50) {
            const { error: devError } = await supabaseAdmin
              .from('feasibility_development_costs')
              .insert(devInserts.slice(j, j + 50));
            if (devError) throw new Error(`Insert failed (dev costs): ${devError.message}. Use "Re-extract" to retry.`);
          }
        }

        if (rateInserts.length > 0) {
          const { error: rateError } = await supabaseAdmin
            .from('feasibility_rate_projections')
            .insert(rateInserts);
          if (rateError) throw new Error(`Insert failed (rates): ${rateError.message}. Use "Re-extract" to retry.`);
        }

        if (occInserts.length > 0) {
          const { error: occError } = await supabaseAdmin
            .from('feasibility_occupancy_projections')
            .insert(occInserts);
          if (occError) throw new Error(`Insert failed (occupancy): ${occError.message}. Use "Re-extract" to retry.`);
        }

        if (marketInserts.length > 0) {
          const { error: marketError } = await supabaseAdmin
            .from('feasibility_market_data')
            .insert(marketInserts);
          if (marketError) throw new Error(`Insert failed (market): ${marketError.message}. Use "Re-extract" to retry.`);
        }

        const city = deriveCityFromLocation(location);
        const reportUpdate: Record<string, unknown> = {
          has_comparables: true,
          comp_count: parsed.comparables.length || undefined,
          comp_unit_count: parsed.comp_units.length || undefined,
          csv_file_path: storagePath,
          csv_file_types: parsed.sheets_found,
          title,
          property_name: parsed.project_info?.resort_name || parsed.study_id,
          location,
          state,
          ...(city && { city }),
        };

        if (parsed.project_info) {
          if (parsed.project_info.resort_name) reportUpdate.resort_name = parsed.project_info.resort_name;
          if (parsed.project_info.resort_type) reportUpdate.resort_type = parsed.project_info.resort_type;
          if (parsed.project_info.county) reportUpdate.county = parsed.project_info.county;
          if (parsed.project_info.lot_size_acres) reportUpdate.lot_size_acres = parsed.project_info.lot_size_acres;
          if (parsed.project_info.parcel_number) reportUpdate.parcel_number = parsed.project_info.parcel_number;
          if (parsed.project_info.report_purpose) reportUpdate.report_purpose = parsed.project_info.report_purpose;
          if (parsed.project_info.unit_descriptions.length > 0) {
            reportUpdate.unit_descriptions = parsed.project_info.unit_descriptions;
          }
          if (parsed.project_info.resort_name) {
            reportUpdate.property_name = parsed.project_info.resort_name;
          }
        }

        if (parsed.assumptions.length > 0) {
          reportUpdate.extracted_data = {
            ...(typeof reportUpdate.extracted_data === 'object' && reportUpdate.extracted_data !== null
              ? reportUpdate.extracted_data as Record<string, unknown>
              : {}),
            assumptions: parsed.assumptions,
          };
        }

        await supabaseAdmin
          .from('reports')
          .update(reportUpdate)
          .eq('id', reportId);

        await logAdminAudit(
          {
            user_id: userId,
            user_email: userEmail ?? undefined,
            action: 'upload',
            resource_type: 'report',
            resource_id: reportId,
            study_id: parsed.study_id,
            details: {
              filename: file.name,
              comparables_count: parsed.comparables.length,
              units_count: parsed.comp_units.length,
            },
            source: isInternalCall ? 'internal_api' : 'session',
          },
          request
        );

        results.push({
          filename: file.name,
          study_id: parsed.study_id,
          report_id: reportId,
          success: true,
          warnings: parsed.warnings?.length ? parsed.warnings : undefined,
          sheets_processed: parsed.sheets_found.length,
          comparables_count: parsed.comparables.length,
          units_count: parsed.comp_units.length,
          summaries_count: parsed.summaries.length,
          property_scores_count: parsed.property_scores.length,
          pro_forma_units_count: parsed.pro_forma_units.length,
          has_valuation: parsed.valuation !== null,
          has_financing: parsed.financing !== null,
          dev_costs_count: parsed.development_costs.length,
          rate_projections_count: parsed.rate_projections.length,
          occ_projections_count: parsed.occupancy_projections.length,
          market_data_count: parsed.market_data.length,
        });
      } catch (err) {
        console.error(`[comparables/upload] Error processing ${file.name}:`, err);
        const errMsg =
          (err as { message?: string })?.message ??
          (err instanceof Error ? err.message : String(err ?? 'Unknown error'));
        results.push({
          filename: file.name,
          study_id: file.name,
          success: false,
          error: errMsg || 'Unknown error',
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);

    return NextResponse.json({
      success: anySuccess,
      message: allSuccess
        ? `All ${results.length} workbooks processed successfully`
        : `${results.filter((r) => r.success).length} of ${results.length} workbooks processed`,
      results,
    });
  } catch (err) {
    console.error('[comparables/upload] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Upload failed' },
      { status: 500 }
    );
  }
}
