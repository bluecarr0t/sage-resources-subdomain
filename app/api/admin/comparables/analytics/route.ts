/**
 * API Route: Analytics aggregations for feasibility comparables
 * GET /api/admin/comparables/analytics
 *
 * Returns pre-aggregated data for dashboard charts:
 *   - ADR by unit category
 *   - Occupancy vs ADR scatter data
 *   - Unit type distribution
 *   - Regional rate averages
 *   - Top-level summary stats
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';

const ANALYTICS_RATE_LIMIT = 60; // requests per window
const ANALYTICS_RATE_WINDOW_MS = 60 * 1000; // 1 minute

export async function GET(request: NextRequest) {
  try {
    const rlKey = `analytics:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, ANALYTICS_RATE_LIMIT, ANALYTICS_RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const supabaseAdmin = createServerClient();

    // Fetch units for aggregation (bounded to prevent memory exhaustion)
    const { data: allUnits, error: unitsError } = await supabaseAdmin
      .from('feasibility_comp_units')
      .select('unit_category, property_name, low_adr, peak_adr, avg_annual_adr, low_occupancy, peak_occupancy, quality_score, num_units, study_id')
      .limit(50000);

    if (unitsError) throw unitsError;

    // Fetch reports for regional data
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('reports')
      .select('study_id, state, city, property_name, created_at')
      .eq('has_comparables', true);

    if (reportsError) throw reportsError;

    // Fetch total comparables count
    const { count: totalComparables } = await supabaseAdmin
      .from('feasibility_comparables')
      .select('id', { count: 'exact', head: true });

    const units = allUnits || [];
    const reportsList = reports || [];

    // Build state lookup from reports
    const studyStateMap = new Map<string, string>();
    reportsList.forEach((r: { study_id: string | null; state: string | null }) => {
      if (r.study_id && r.state) studyStateMap.set(r.study_id, r.state);
    });

    // 1. ADR by unit category
    const categoryMap = new Map<string, { sumLow: number; sumPeak: number; count: number }>();
    units.forEach((u: { unit_category: string | null; low_adr: number | null; peak_adr: number | null }) => {
      const cat = u.unit_category || 'other';
      const entry = categoryMap.get(cat) || { sumLow: 0, sumPeak: 0, count: 0 };
      if (u.low_adr !== null) entry.sumLow += u.low_adr;
      if (u.peak_adr !== null) entry.sumPeak += u.peak_adr;
      if (u.low_adr !== null || u.peak_adr !== null) entry.count++;
      categoryMap.set(cat, entry);
    });

    const adrByCategory = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        unit_category: category,
        avg_low_adr: stats.count > 0 ? Math.round(stats.sumLow / stats.count) : 0,
        avg_peak_adr: stats.count > 0 ? Math.round(stats.sumPeak / stats.count) : 0,
        count: stats.count,
      }))
      .sort((a, b) => b.count - a.count);

    // 2. Occupancy vs ADR scatter points
    const occupancyScatter = units
      .filter((u: { avg_annual_adr: number | null; low_occupancy: number | null; peak_occupancy: number | null }) =>
        u.avg_annual_adr !== null && (u.low_occupancy !== null || u.peak_occupancy !== null)
      )
      .map((u: {
        avg_annual_adr: number | null;
        low_occupancy: number | null;
        peak_occupancy: number | null;
        quality_score: number | null;
        unit_category: string | null;
        property_name: string;
      }) => ({
        avg_annual_adr: u.avg_annual_adr,
        low_occupancy: u.low_occupancy !== null ? Math.round(u.low_occupancy * 100) : null,
        peak_occupancy: u.peak_occupancy !== null ? Math.round(u.peak_occupancy * 100) : null,
        quality_score: u.quality_score,
        unit_category: u.unit_category || 'other',
        property_name: u.property_name,
      }));

    // 3. Unit type distribution
    const unitMixMap = new Map<string, number>();
    units.forEach((u: { unit_category: string | null }) => {
      const cat = u.unit_category || 'other';
      unitMixMap.set(cat, (unitMixMap.get(cat) || 0) + 1);
    });
    const totalUnits = units.length;
    const unitMix = Array.from(unitMixMap.entries())
      .map(([category, count]) => ({
        unit_category: category,
        count,
        percentage: totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 4. Regional rate averages
    const regionMap = new Map<string, { sumLow: number; sumPeak: number; count: number; studies: Set<string> }>();
    units.forEach((u: { study_id: string | null; low_adr: number | null; peak_adr: number | null }) => {
      const state = u.study_id ? studyStateMap.get(u.study_id) : null;
      if (!state) return;
      const entry = regionMap.get(state) || { sumLow: 0, sumPeak: 0, count: 0, studies: new Set<string>() };
      if (u.low_adr !== null) entry.sumLow += u.low_adr;
      if (u.peak_adr !== null) entry.sumPeak += u.peak_adr;
      if (u.low_adr !== null || u.peak_adr !== null) entry.count++;
      if (u.study_id) entry.studies.add(u.study_id);
      regionMap.set(state, entry);
    });

    const regionalRates = Array.from(regionMap.entries())
      .map(([state, stats]) => ({
        state,
        avg_low_adr: stats.count > 0 ? Math.round(stats.sumLow / stats.count) : 0,
        avg_peak_adr: stats.count > 0 ? Math.round(stats.sumPeak / stats.count) : 0,
        study_count: stats.studies.size,
      }))
      .sort((a, b) => b.study_count - a.study_count);

    // 5. Top comps by estimated RevPAR
    const topComps = units
      .filter((u: { avg_annual_adr: number | null; peak_occupancy: number | null; num_units: number | null }) =>
        u.avg_annual_adr !== null && u.peak_occupancy !== null && u.num_units !== null
      )
      .map((u: {
        property_name: string;
        unit_category: string | null;
        avg_annual_adr: number | null;
        peak_occupancy: number | null;
        num_units: number | null;
        quality_score: number | null;
      }) => ({
        property_name: u.property_name,
        unit_category: u.unit_category || 'other',
        avg_annual_adr: u.avg_annual_adr,
        peak_occupancy: u.peak_occupancy !== null ? Math.round(u.peak_occupancy * 100) : null,
        num_units: u.num_units,
        estimated_revpar: u.avg_annual_adr !== null && u.peak_occupancy !== null
          ? Math.round(u.avg_annual_adr * u.peak_occupancy)
          : 0,
        quality_score: u.quality_score,
      }))
      .sort((a: { estimated_revpar: number }, b: { estimated_revpar: number }) => b.estimated_revpar - a.estimated_revpar)
      .slice(0, 20);

    // 6. Property score analytics
    const { data: allScores, error: scoresError } = await supabaseAdmin
      .from('feasibility_property_scores')
      .select('property_name, overall_score, unit_types_score, unit_amenities_score, property_score, property_amenities_score, location_score, brand_strength_score, is_subject');

    if (scoresError) throw scoresError;

    const scores = allScores || [];
    const nonSubjectScores = scores.filter((s: { is_subject: boolean }) => !s.is_subject);

    const avgScoreDimensions = (() => {
      if (nonSubjectScores.length === 0) return null;
      const dims = ['unit_types_score', 'unit_amenities_score', 'property_score', 'property_amenities_score', 'location_score', 'brand_strength_score'] as const;
      return dims.map((dim) => {
        const vals = nonSubjectScores.map((s: Record<string, number | null>) => s[dim]).filter((v: number | null): v is number => v !== null);
        return {
          dimension: dim.replace(/_score$/, '').replace(/_/g, ' '),
          average: vals.length > 0 ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2)) : 0,
          count: vals.length,
        };
      });
    })();

    const topScoredProperties = nonSubjectScores
      .filter((s: { overall_score: number | null }) => s.overall_score !== null)
      .sort((a: { overall_score: number | null }, b: { overall_score: number | null }) =>
        (b.overall_score ?? 0) - (a.overall_score ?? 0)
      )
      .slice(0, 10)
      .map((s: { property_name: string; overall_score: number | null }) => ({
        property_name: s.property_name,
        overall_score: s.overall_score,
      }));

    // 7. Valuation analytics
    const { data: allValuations, error: valError } = await supabaseAdmin
      .from('feasibility_valuations')
      .select('valuation_type, total_units, noi, noi_margin, cap_rate, indicated_value, total_revenue, study_id');

    if (valError) throw valError;

    const valuationsList = allValuations || [];
    const valuationSummary = (() => {
      if (valuationsList.length === 0) return null;
      const noiValues = valuationsList.map((v: { noi: number | null }) => v.noi).filter((v: number | null): v is number => v !== null);
      const capValues = valuationsList.map((v: { cap_rate: number | null }) => v.cap_rate).filter((v: number | null): v is number => v !== null);
      const valValues = valuationsList.map((v: { indicated_value: number | null }) => v.indicated_value).filter((v: number | null): v is number => v !== null);
      const revValues = valuationsList.map((v: { total_revenue: number | null }) => v.total_revenue).filter((v: number | null): v is number => v !== null);
      return {
        count: valuationsList.length,
        direct_cap_count: valuationsList.filter((v: { valuation_type: string }) => v.valuation_type === 'direct_cap').length,
        pro_forma_count: valuationsList.filter((v: { valuation_type: string }) => v.valuation_type === 'pro_forma').length,
        avg_noi: noiValues.length > 0 ? Math.round(noiValues.reduce((a: number, b: number) => a + b, 0) / noiValues.length) : null,
        avg_cap_rate: capValues.length > 0 ? parseFloat((capValues.reduce((a: number, b: number) => a + b, 0) / capValues.length * 100).toFixed(1)) : null,
        avg_indicated_value: valValues.length > 0 ? Math.round(valValues.reduce((a: number, b: number) => a + b, 0) / valValues.length) : null,
        avg_revenue: revValues.length > 0 ? Math.round(revValues.reduce((a: number, b: number) => a + b, 0) / revValues.length) : null,
      };
    })();

    // 8. Financing analytics (IRR distribution, cash-on-cash trends)
    const { data: allFinancing, error: finError } = await supabaseAdmin
      .from('feasibility_financing')
      .select('study_id, irr_on_equity, interest_rate, ltc_ratio, total_project_cost, mortgage_amount, payback_period_years, yearly_returns');

    if (finError) throw finError;

    const financingList = allFinancing || [];
    const financingSummary = (() => {
      if (financingList.length === 0) return null;
      const irrValues = financingList
        .map((f: { irr_on_equity: number | null }) => f.irr_on_equity)
        .filter((v: number | null): v is number => v !== null);
      const projCosts = financingList
        .map((f: { total_project_cost: number | null }) => f.total_project_cost)
        .filter((v: number | null): v is number => v !== null);

      const irrDistribution = irrValues.map((irr: number, idx: number) => {
        const fin = financingList[idx] as { study_id: string | null };
        const rep = reportsList.find((r: { study_id: string | null }) => r.study_id === fin.study_id) as { property_name: string } | undefined;
        return {
          study: rep?.property_name || fin.study_id || `Study ${idx + 1}`,
          irr: parseFloat((irr * 100).toFixed(1)),
        };
      }).sort((a: { irr: number }, b: { irr: number }) => b.irr - a.irr);

      // Cash-on-cash by year across all studies
      const cocByYear: Record<number, number[]> = {};
      for (const fin of financingList) {
        const f = fin as { yearly_returns: Array<{ year: number; cash_on_cash: number | null }> | null };
        if (!f.yearly_returns) continue;
        for (const yr of f.yearly_returns) {
          if (yr.cash_on_cash !== null) {
            if (!cocByYear[yr.year]) cocByYear[yr.year] = [];
            cocByYear[yr.year].push(yr.cash_on_cash);
          }
        }
      }
      const cashOnCashTrend = Object.entries(cocByYear)
        .map(([year, vals]) => ({
          year: parseInt(year),
          avg_cash_on_cash: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length * 100).toFixed(1)),
          count: vals.length,
        }))
        .sort((a, b) => a.year - b.year);

      return {
        count: financingList.length,
        avg_irr: irrValues.length > 0
          ? parseFloat((irrValues.reduce((a: number, b: number) => a + b, 0) / irrValues.length * 100).toFixed(1))
          : null,
        avg_project_cost: projCosts.length > 0
          ? Math.round(projCosts.reduce((a: number, b: number) => a + b, 0) / projCosts.length)
          : null,
        irr_distribution: irrDistribution,
        cash_on_cash_trend: cashOnCashTrend,
      };
    })();

    // 9. Development costs analytics
    const { data: allDevCosts, error: devCostError } = await supabaseAdmin
      .from('feasibility_development_costs')
      .select('study_id, line_item, category, per_unit_cost, total_cost');

    if (devCostError) throw devCostError;

    const devCostsList = allDevCosts || [];
    const devCostSummary = (() => {
      if (devCostsList.length === 0) return null;
      const byCat: Record<string, { sumTotal: number; sumPerUnit: number; count: number }> = {};
      for (const dc of devCostsList) {
        const d = dc as { category: string; per_unit_cost: number | null; total_cost: number | null };
        if (d.category === 'total') continue;
        if (!byCat[d.category]) byCat[d.category] = { sumTotal: 0, sumPerUnit: 0, count: 0 };
        if (d.total_cost !== null) byCat[d.category].sumTotal += d.total_cost;
        if (d.per_unit_cost !== null) byCat[d.category].sumPerUnit += d.per_unit_cost;
        byCat[d.category].count++;
      }
      const costByCategory = Object.entries(byCat)
        .map(([category, stats]) => ({
          category: category.replace(/_/g, ' '),
          avg_per_unit: stats.count > 0 ? Math.round(stats.sumPerUnit / stats.count) : 0,
          avg_total: stats.count > 0 ? Math.round(stats.sumTotal / stats.count) : 0,
          count: stats.count,
        }))
        .sort((a, b) => b.avg_total - a.avg_total);

      return { count: devCostsList.length, cost_by_category: costByCategory };
    })();

    // 10. Market data analytics
    const { data: allMarket, error: marketError } = await supabaseAdmin
      .from('feasibility_market_data')
      .select('study_id, radius, population_2020, median_household_income, per_capita_income');

    if (marketError) throw marketError;

    const marketList = allMarket || [];
    const marketSummary = (() => {
      if (marketList.length === 0) return null;
      const byRadius: Record<string, { populations: number[]; incomes: number[] }> = {};
      for (const md of marketList) {
        const m = md as { radius: string; population_2020: number | null; median_household_income: number | null };
        if (!byRadius[m.radius]) byRadius[m.radius] = { populations: [], incomes: [] };
        if (m.population_2020) byRadius[m.radius].populations.push(m.population_2020);
        if (m.median_household_income) byRadius[m.radius].incomes.push(m.median_household_income);
      }
      const demographicComparison = Object.entries(byRadius)
        .map(([radius, stats]) => ({
          radius,
          avg_population: stats.populations.length > 0
            ? Math.round(stats.populations.reduce((a, b) => a + b, 0) / stats.populations.length)
            : null,
          avg_median_income: stats.incomes.length > 0
            ? Math.round(stats.incomes.reduce((a, b) => a + b, 0) / stats.incomes.length)
            : null,
          study_count: Math.max(stats.populations.length, stats.incomes.length),
        }))
        .sort((a, b) => (b.study_count ?? 0) - (a.study_count ?? 0));

      return { count: marketList.length, demographic_comparison: demographicComparison };
    })();

    // 11. Summary stats
    const summary = {
      total_studies: reportsList.length,
      total_comparables: totalComparables || 0,
      total_units: units.length,
      unique_categories: unitMix.length,
      states_covered: regionalRates.length,
      total_property_scores: scores.length,
      total_valuations: valuationsList.length,
      total_financing: financingList.length,
      total_dev_costs: devCostsList.length,
      total_market_data: marketList.length,
    };

    return NextResponse.json({
      success: true,
      analytics: {
        summary,
        adr_by_category: adrByCategory,
        occupancy_scatter: occupancyScatter,
        unit_mix: unitMix,
        regional_rates: regionalRates,
        top_comps: topComps,
        score_dimensions: avgScoreDimensions,
        top_scored_properties: topScoredProperties,
        valuation_summary: valuationSummary,
        financing_summary: financingSummary,
        dev_cost_summary: devCostSummary,
        market_summary: marketSummary,
      },
    });
  } catch (err) {
    console.error('[comparables/analytics] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
