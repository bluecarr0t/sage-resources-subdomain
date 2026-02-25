/**
 * API Route: Get full detail for a single feasibility study
 * GET /api/admin/comparables/:studyId
 *
 * Returns the report metadata, all comparables with their units,
 * and the study summaries / phase projections.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

export async function GET(
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

    // Get the report
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, title, property_name, location, state, city, study_id, market_type, total_sites, created_at, comp_count, comp_unit_count, resort_name, resort_type, county, lot_size_acres, parcel_number, report_purpose, unit_descriptions, csv_file_path')
      .eq('study_id', studyId)
      .maybeSingle();

    if (reportError) throw reportError;

    if (!report) {
      return NextResponse.json(
        { success: false, message: 'Study not found' },
        { status: 404 }
      );
    }

    // Get comparables with their units
    const { data: comparables, error: compError } = await supabaseAdmin
      .from('feasibility_comparables')
      .select(`
        *,
        feasibility_comp_units(*)
      `)
      .eq('report_id', report.id)
      .order('quality_score', { ascending: false });

    if (compError) throw compError;

    // Get summaries
    const { data: summaries, error: summError } = await supabaseAdmin
      .from('feasibility_study_summaries')
      .select('*')
      .eq('report_id', report.id)
      .order('summary_type');

    if (summError) throw summError;

    // Get all units for the study (including ones not linked to comparables)
    const { data: allUnits, error: unitsError } = await supabaseAdmin
      .from('feasibility_comp_units')
      .select('*')
      .eq('report_id', report.id)
      .order('property_name')
      .order('unit_type');

    if (unitsError) throw unitsError;

    // Get property scores (Best Comps)
    const { data: propertyScores, error: scoresError } = await supabaseAdmin
      .from('feasibility_property_scores')
      .select('*')
      .eq('report_id', report.id)
      .order('overall_score', { ascending: false });

    if (scoresError) throw scoresError;

    // Get pro forma units
    const { data: proFormaUnits, error: pfError } = await supabaseAdmin
      .from('feasibility_pro_forma_units')
      .select('*')
      .eq('report_id', report.id)
      .order('unit_type');

    if (pfError) throw pfError;

    // Get valuations
    const { data: valuations, error: valError } = await supabaseAdmin
      .from('feasibility_valuations')
      .select('*')
      .eq('report_id', report.id);

    if (valError) throw valError;

    // Get financing
    const { data: financing, error: finError } = await supabaseAdmin
      .from('feasibility_financing')
      .select('*')
      .eq('report_id', report.id)
      .maybeSingle();

    if (finError) throw finError;

    // Get development costs
    const { data: developmentCosts, error: devCostError } = await supabaseAdmin
      .from('feasibility_development_costs')
      .select('*')
      .eq('report_id', report.id)
      .order('category')
      .order('line_item');

    if (devCostError) throw devCostError;

    // Get rate projections
    const { data: rateProjections, error: rateProjError } = await supabaseAdmin
      .from('feasibility_rate_projections')
      .select('*')
      .eq('report_id', report.id)
      .order('rate_category')
      .order('unit_type');

    if (rateProjError) throw rateProjError;

    // Get occupancy projections
    const { data: occupancyProjections, error: occProjError } = await supabaseAdmin
      .from('feasibility_occupancy_projections')
      .select('*')
      .eq('report_id', report.id)
      .order('unit_type');

    if (occProjError) throw occProjError;

    // Get market data
    const { data: marketData, error: marketError } = await supabaseAdmin
      .from('feasibility_market_data')
      .select('*')
      .eq('report_id', report.id)
      .order('radius');

    if (marketError) throw marketError;

    return NextResponse.json({
      success: true,
      study: {
        report,
        comparables: comparables || [],
        summaries: summaries || [],
        all_units: allUnits || [],
        property_scores: propertyScores || [],
        pro_forma_units: proFormaUnits || [],
        valuations: valuations || [],
        financing: financing || null,
        development_costs: developmentCosts || [],
        rate_projections: rateProjections || [],
        occupancy_projections: occupancyProjections || [],
        market_data: marketData || [],
      },
    });
  } catch (err) {
    console.error('[comparables/studyId] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch study detail' },
      { status: 500 }
    );
  }
}
