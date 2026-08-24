/**
 * POST /api/admin/reports/propose-assumptions
 * Enrich intake + propose ★ assumptions with evidence for the review UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { enrichReportInput } from '@/lib/ai-report-builder/enrich';
import { proposeAssumptions } from '@/lib/feasibility-model';
import { buildAssumptionEvidence } from '@/lib/ai-report-builder/assumption-helpers';
import type { ReportDraftInput } from '@/lib/ai-report-builder/types';
import {
  checkReportRateLimit,
  rateLimitExceededResponse,
} from '@/lib/report-builder-limits';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) return auth.response;

  const rate = await checkReportRateLimit('proposeAssumptions', auth.session.user.id);
  if (!rate.allowed) {
    return rateLimitExceededResponse(rate.resetAt);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const property_name = typeof body.property_name === 'string' ? body.property_name.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const state = typeof body.state === 'string' ? body.state.trim() : '';
    if (!property_name || !city || !state) {
      return NextResponse.json(
        { success: false, error: 'property_name, city, and state are required' },
        { status: 400 }
      );
    }

    const unit_mix = Array.isArray(body.unit_mix)
      ? (body.unit_mix as Array<{ type?: string; count?: number }>)
          .filter((u) => u && typeof u.type === 'string' && typeof u.count === 'number' && u.count > 0)
          .map((u) => ({ type: String(u.type), count: Number(u.count) }))
      : [];

    const input: ReportDraftInput = {
      property_name,
      city,
      state,
      address_1: typeof body.address_1 === 'string' ? body.address_1.trim() : undefined,
      zip_code: typeof body.zip_code === 'string' ? body.zip_code.trim() : undefined,
      acres: typeof body.acres === 'number' ? body.acres : undefined,
      market_type: typeof body.market_type === 'string' ? body.market_type : 'glamping',
      unit_mix,
      include_web_research: body.include_web_research !== false,
      land_cost: typeof body.land_cost === 'number' ? body.land_cost : undefined,
      loan_to_cost: typeof body.loan_to_cost === 'number' ? body.loan_to_cost : undefined,
      interest_rate_pct:
        typeof body.interest_rate_pct === 'number' ? body.interest_rate_pct : undefined,
      mill_levy_pct: typeof body.mill_levy_pct === 'number' ? body.mill_levy_pct : undefined,
    };

    const enriched = await enrichReportInput(input);
    const assumptions = proposeAssumptions(enriched);
    if (enriched.soft_cost_pct != null) {
      assumptions.softCostPct = { value: enriched.soft_cost_pct, state: 'analyst_set' };
    }
    if (enriched.land_cost != null) {
      assumptions.landCost = { value: enriched.land_cost, state: 'analyst_set' };
    }
    if (enriched.loan_to_cost != null) {
      assumptions.loanToCost = { value: enriched.loan_to_cost, state: 'analyst_set' };
    }
    if (enriched.interest_rate_pct != null) {
      assumptions.interestRate = {
        value: enriched.interest_rate_pct / 100,
        state: 'analyst_set',
      };
    }
    if (enriched.mill_levy_pct != null) {
      assumptions.millLevy = { value: enriched.mill_levy_pct / 100, state: 'analyst_set' };
    }

    const evidence = buildAssumptionEvidence(enriched);

    return NextResponse.json({
      success: true,
      assumptions,
      evidence,
      geocode: {
        latitude: enriched.latitude ?? null,
        longitude: enriched.longitude ?? null,
      },
      comps_count: enriched.nearby_comps?.length ?? 0,
      data_sources: enriched.enrichment_metadata?.data_sources ?? [],
    });
  } catch (err) {
    console.error('[propose-assumptions]', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to propose assumptions',
      },
      { status: 500 }
    );
  }
}
