'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import {
  ArrowLeft,
  Star,
  MapPin,
  Building2,
  TrendingUp,
  Users,
  BarChart3,
  Shield,
  DollarSign,
  Activity,
  Download,
  List,
} from 'lucide-react';
import { qualityScoreToDisplay } from '@/lib/feasibility-utils';

/** Detect titles that are mis-extracted descriptions rather than resort names */
function isMisExtractedTitle(title: string | null): boolean {
  if (!title || title.length > 60) return true;
  const lower = title.toLowerCase();
  return /^(with|the|a|an)\s/.test(lower) || lower.includes(' the proposed ');
}

function displayTitle(report: { title: string | null; study_id: string | null }): string {
  if (report.title && !isMisExtractedTitle(report.title)) return report.title;
  return report.study_id ? `Job ${report.study_id}` : 'Feasibility Study';
}

interface Report {
  id: string;
  title: string | null;
  property_name: string;
  location: string | null;
  state: string | null;
  city: string | null;
  study_id: string | null;
  market_type: string | null;
  total_sites: number | null;
  created_at: string;
  comp_count: number;
  comp_unit_count: number;
  resort_name: string | null;
  resort_type: string | null;
  county: string | null;
  lot_size_acres: number | null;
  parcel_number: string | null;
  report_purpose: string | null;
  unit_descriptions: Array<{ type: string; quantity: number | null; description: string | null }> | null;
  csv_file_path: string | null;
}

interface CompUnit {
  id: string;
  property_name: string;
  unit_type: string;
  unit_category: string | null;
  num_units: number | null;
  low_adr: number | null;
  peak_adr: number | null;
  avg_annual_adr: number | null;
  low_monthly_rate: number | null;
  peak_monthly_rate: number | null;
  low_occupancy: number | null;
  peak_occupancy: number | null;
  quality_score: number | null;
}

interface Comparable {
  id: string;
  comp_name: string;
  overview: string | null;
  amenities: string | null;
  amenity_keywords: string[] | null;
  distance_miles: number | null;
  total_sites: number | null;
  quality_score: number | null;
  property_type: string | null;
  feasibility_comp_units: CompUnit[];
}

interface Summary {
  id: string;
  summary_type: string;
  label: string | null;
  num_units: number | null;
  low_adr: number | null;
  peak_adr: number | null;
  low_monthly_rate: number | null;
  peak_monthly_rate: number | null;
  low_occupancy: number | null;
  peak_occupancy: number | null;
  quality_score: number | null;
}

interface PropertyScore {
  id: string;
  property_name: string;
  overall_score: number | null;
  is_subject: boolean;
  unit_types_score: number | null;
  unit_types_description: string | null;
  unit_amenities_score: number | null;
  unit_amenities_description: string | null;
  property_score: number | null;
  property_description: string | null;
  property_amenities_score: number | null;
  property_amenities_description: string | null;
  location_score: number | null;
  location_description: string | null;
  brand_strength_score: number | null;
  brand_strength_description: string | null;
  occupancy_notes: string | null;
}

interface ProFormaUnit {
  id: string;
  unit_type: string;
  unit_category: string | null;
  unit_count: number | null;
  adr_growth_rate: number | null;
  yearly_data: Array<{
    year: number;
    adr: number | null;
    occupancy: number | null;
    site_nights: number | null;
    revenue: number | null;
  }>;
}

interface Valuation {
  id: string;
  valuation_type: string;
  total_units: number | null;
  occupancy_rate: number | null;
  average_daily_rate: number | null;
  annual_lodging_revenue: number | null;
  total_revenue: number | null;
  total_expenses: number | null;
  total_expenses_with_reserves: number | null;
  noi: number | null;
  noi_margin: number | null;
  cap_rate: number | null;
  indicated_value: number | null;
  value_per_unit: number | null;
  as_is_value: number | null;
  stabilization_cost: number | null;
  terminal_cap_rate: number | null;
  projected_sale_price: number | null;
  discount_rate: number | null;
  market_rental_rates: Array<{
    unit_type: string;
    daily_rate: number | null;
    weekly_rate: number | null;
    monthly_rate: number | null;
  }> | null;
  expense_breakdown: Array<{
    category: string;
    amount: number | null;
    per_unit: number | null;
    pct_of_revenue: number | null;
  }> | null;
  yearly_projections: Array<{
    year: number;
    total_revenue: number | null;
    total_expenses: number | null;
    noi: number | null;
    noi_margin: number | null;
  }> | null;
}

interface Financing {
  id: string;
  interest_rate: number | null;
  loan_term_years: number | null;
  ltc_ratio: number | null;
  equity_pct: number | null;
  mortgage_amount: number | null;
  annual_debt_service: number | null;
  total_development_cost: number | null;
  land_cost: number | null;
  total_project_cost: number | null;
  payback_period_years: number | null;
  irr_on_equity: number | null;
  yearly_returns: Array<{
    year: number;
    noi: number | null;
    net_income_to_equity: number | null;
    cash_on_cash: number | null;
    dcr: number | null;
  }> | null;
}

interface DevelopmentCost {
  id: string;
  line_item: string;
  category: string;
  per_unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
}

interface RateProjection {
  id: string;
  unit_type: string;
  is_subject: boolean;
  low_rate: number | null;
  peak_rate: number | null;
  avg_rate: number | null;
  quality_score: number | null;
  source: string | null;
  rate_category: string | null;
}

interface OccupancyProjection {
  id: string;
  unit_type: string;
  stabilized_low_occ: number | null;
  stabilized_peak_occ: number | null;
  weighted_annual_occ: number | null;
  low_months: number | null;
  peak_months: number | null;
  ramp_up: Array<{ year: number; occupancy: number | null }> | null;
}

interface MarketData {
  id: string;
  radius: string;
  population_2020: number | null;
  population_projected: number | null;
  population_growth_rate: number | null;
  households_2020: number | null;
  avg_household_size: number | null;
  median_household_income: number | null;
  per_capita_income: number | null;
}

function formatCurrency(val: number | null): string {
  if (val === null) return '-';
  return `$${Math.round(val).toLocaleString()}`;
}

function formatPercent(val: number | null): string {
  if (val === null) return '-';
  return `${Math.round(val * 100)}%`;
}

/** Handles both 0-1 (decimal) and 0-100 (percent) occupancy formats */
function formatOccupancyPercent(val: number | null): string {
  if (val === null) return '-';
  return val > 1 ? `${Math.round(val)}%` : `${Math.round(val * 100)}%`;
}

function formatLargeCurrency(val: number | null): string {
  if (val === null) return '-';
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${Math.round(val / 1_000)}K`;
  return `$${val.toLocaleString()}`;
}

function ScoreBar({ score, label, max = 5 }: { score: number | null; label: string; max?: number }) {
  if (score === null) return null;
  const pct = (score / max) * 100;
  const color =
    pct >= 80 ? 'bg-green-500' :
    pct >= 60 ? 'bg-emerald-500' :
    pct >= 40 ? 'bg-amber-500' :
    'bg-red-400';

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-[130px] text-gray-600 dark:text-gray-400 text-xs truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-medium text-gray-800 dark:text-gray-200 text-xs">{score.toFixed(1)}</span>
    </div>
  );
}

function QualityStars({ score }: { score: number | null }) {
  const display = qualityScoreToDisplay(score);
  if (display === null) return <span className="text-gray-400">-</span>;
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.round(display)
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">
        {display.toFixed(1)}
      </span>
    </span>
  );
}

export default function StudyDetailPage() {
  const params = useParams();
  const studyId = params.studyId as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [allUnits, setAllUnits] = useState<CompUnit[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [propertyScores, setPropertyScores] = useState<PropertyScore[]>([]);
  const [proFormaUnits, setProFormaUnits] = useState<ProFormaUnit[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [financing, setFinancing] = useState<Financing | null>(null);
  const [developmentCosts, setDevelopmentCosts] = useState<DevelopmentCost[]>([]);
  const [rateProjections, setRateProjections] = useState<RateProjection[]>([]);
  const [occupancyProjections, setOccupancyProjections] = useState<OccupancyProjection[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadStudy = async () => {
    if (!studyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/comparables/${studyId}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to load job');
        return;
      }
      setReport(data.study.report);
      setComparables(data.study.comparables || []);
      setAllUnits(data.study.all_units || []);
      setSummaries(data.study.summaries || []);
      setPropertyScores(data.study.property_scores || []);
      setProFormaUnits(data.study.pro_forma_units || []);
      setValuations(data.study.valuations || []);
      setFinancing(data.study.financing || null);
      setDevelopmentCosts(data.study.development_costs || []);
      setRateProjections(data.study.rate_projections || []);
      setOccupancyProjections(data.study.occupancy_projections || []);
      setMarketData(data.study.market_data || []);
    } catch {
      setError('Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studyId) {
      setLoading(false);
      setError('Job Number is missing');
      return;
    }
    loadStudy();
  }, [studyId]);

  if (loading) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-20 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading job...</p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-20 text-center">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">
            {error || 'Job not found'}
          </p>
          <Button variant="secondary" onClick={() => router.push('/admin/comps')}>
            Back to Comps
          </Button>
        </div>
      </main>
    );
  }

  const phaseSummaries = summaries.filter((s) => s.summary_type === 'phase');
  const marketSummaries = summaries.filter((s) => s.summary_type.startsWith('market_'));

  const sections = [
    { id: 'market-summary', label: 'Market Summary', visible: marketSummaries.length > 0 },
    { id: 'phase-projections', label: 'Phase Projections', visible: phaseSummaries.length > 0 },
    { id: 'property-comparables', label: 'Property comps', visible: true },
    { id: 'valuation', label: 'Valuation', visible: valuations.length > 0 },
    { id: 'pro-forma', label: 'Pro Forma Units', visible: proFormaUnits.length > 0 },
    { id: 'financing', label: 'Financing', visible: !!financing },
    { id: 'development-costs', label: 'Development Costs', visible: developmentCosts.length > 0 },
    { id: 'rate-projections', label: 'Rate Projections', visible: rateProjections.length > 0 },
    { id: 'occupancy-projections', label: 'Occupancy Projections', visible: occupancyProjections.length > 0 },
    { id: 'market-profile', label: 'Market Demographics', visible: marketData.length > 0 },
  ].filter((s) => s.visible);

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/comps')}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Comps
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {displayTitle(report)}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {report.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {report.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {report.comp_count} comps
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  {report.comp_unit_count} unit records
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {report.csv_file_path && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/api/admin/comparables/${report.study_id}/download`;
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download .XLSX
                </Button>
              )}
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300 rounded-full">
                {report.study_id}
              </span>
            </div>
          </div>
        </div>

        {/* Table of contents */}
        {sections.length > 1 && (
          <Card className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <List className="w-4 h-4 text-sage-600" />
              On this page
            </h2>
            <nav className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="px-3 py-1.5 text-sm text-sage-600 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-900/30 rounded hover:underline"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </Card>
        )}

        {/* Market Summary Stats */}
        {marketSummaries.length > 0 && (
          <Card id="market-summary" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sage-600" />
              Market Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Stat</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Units</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Low ADR</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Peak ADR</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Low Occ.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Peak Occ.</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {marketSummaries.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {s.label || s.summary_type.replace('market_', '')}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{s.num_units ?? '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(s.low_adr)}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(s.peak_adr)}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatOccupancyPercent(s.low_occupancy)}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatOccupancyPercent(s.peak_occupancy)}</td>
                      <td className="px-3 py-2 text-center">{qualityScoreToDisplay(s.quality_score)?.toFixed(1) ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Phase Projections */}
        {phaseSummaries.length > 0 && (
          <Card id="phase-projections" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Phase Projections
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {phaseSummaries.map((phase) => (
                <div
                  key={phase.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    {phase.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Units</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{phase.num_units ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Quality</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{qualityScoreToDisplay(phase.quality_score)?.toFixed(1) ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">ADR Range</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {formatCurrency(phase.low_adr)} - {formatCurrency(phase.peak_adr)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Occupancy</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {formatOccupancyPercent(phase.low_occupancy)} - {formatOccupancyPercent(phase.peak_occupancy)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Property comps */}
        <Card id="property-comparables" className="mb-6 scroll-mt-24">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-sage-600" />
            Property comps ({comparables.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {comparables.map((comp) => (
              <div key={comp.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {comp.comp_name}
                  </h3>
                  <QualityStars score={comp.quality_score} />
                </div>
                {comp.overview && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {comp.overview}
                  </p>
                )}
                {comp.amenities && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 line-clamp-2">
                    {comp.amenities}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {comp.total_sites !== null && (
                    <span>{comp.total_sites} sites</span>
                  )}
                  {comp.distance_miles !== null && (
                    <span>{comp.distance_miles} mi away</span>
                  )}
                  {comp.property_type && (
                    <span className="px-2 py-0.5 bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 rounded text-[10px] font-medium uppercase">
                      {comp.property_type}
                    </span>
                  )}
                </div>
                {comp.amenity_keywords && comp.amenity_keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                    {comp.amenity_keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Valuations (Direct Cap or Pro Forma summary) */}
        {valuations.length > 0 && valuations.map((val) => (
          <Card key={val.id} id="valuation" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-sage-600" />
              {val.valuation_type === 'direct_cap' ? 'Direct Capitalization' : 'Pro Forma Valuation'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {val.indicated_value !== null && (
                <div className="p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Indicated Value</p>
                  <p className="text-xl font-bold text-sage-700 dark:text-sage-300">{formatLargeCurrency(val.indicated_value)}</p>
                </div>
              )}
              {val.noi !== null && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">NOI</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatLargeCurrency(val.noi)}</p>
                </div>
              )}
              {val.cap_rate !== null && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cap Rate / OAR</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatPercent(val.cap_rate)}</p>
                </div>
              )}
              {val.total_units !== null && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Units</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{val.total_units}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm mb-6">
              {val.total_revenue !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatLargeCurrency(val.total_revenue)}</p>
                </div>
              )}
              {val.total_expenses !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatLargeCurrency(val.total_expenses)}</p>
                </div>
              )}
              {val.noi_margin !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">NOI Margin</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatPercent(val.noi_margin)}</p>
                </div>
              )}
              {val.average_daily_rate !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Average Daily Rate</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(val.average_daily_rate)}</p>
                </div>
              )}
              {val.occupancy_rate !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Occupancy</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatOccupancyPercent(val.occupancy_rate)}</p>
                </div>
              )}
              {val.as_is_value !== null && val.as_is_value !== val.indicated_value && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">As-Is Value</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatLargeCurrency(val.as_is_value)}</p>
                </div>
              )}
              {val.value_per_unit !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Value / Unit</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(val.value_per_unit)}</p>
                </div>
              )}
              {val.stabilization_cost !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Stabilization Cost</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">({formatLargeCurrency(val.stabilization_cost)})</p>
                </div>
              )}
            </div>

            {/* Market Rental Rates */}
            {val.market_rental_rates && val.market_rental_rates.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Market Rental Rate Conclusions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Unit Type</th>
                        <th className="text-right px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Daily</th>
                        <th className="text-right px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Weekly</th>
                        <th className="text-right px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Monthly</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {val.market_rental_rates.map((rate, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200">{rate.unit_type}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{formatCurrency(rate.daily_rate)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{formatCurrency(rate.weekly_rate)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{formatCurrency(rate.monthly_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Yearly Projections */}
            {val.yearly_projections && val.yearly_projections.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Annual Projections</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-center px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Year</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Revenue</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Expenses</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">NOI</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {val.yearly_projections.map((yp) => (
                        <tr key={yp.year}>
                          <td className="px-2 py-1.5 text-center text-gray-700 dark:text-gray-300">{yp.year}</td>
                          <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{formatLargeCurrency(yp.total_revenue)}</td>
                          <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{formatLargeCurrency(yp.total_expenses)}</td>
                          <td className="px-2 py-1.5 text-right font-medium text-green-700 dark:text-green-400">{formatLargeCurrency(yp.noi)}</td>
                          <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{yp.noi_margin !== null ? formatPercent(yp.noi_margin) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        ))}

        {/* Pro Forma Units */}
        {proFormaUnits.length > 0 && (
          <Card id="pro-forma" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-sage-600" />
              Pro Forma Unit Projections ({proFormaUnits.length} unit types)
            </h2>
            <div className="space-y-4">
              {proFormaUnits.map((pfu) => (
                <div key={pfu.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{pfu.unit_type}</h3>
                    {pfu.unit_category && (
                      <span className="text-[10px] font-medium bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 px-2 py-0.5 rounded">
                        {pfu.unit_category.replace(/_/g, ' ')}
                      </span>
                    )}
                    {pfu.unit_count !== null && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">{pfu.unit_count} units</span>
                    )}
                    {pfu.adr_growth_rate !== null && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">ADR growth: {formatPercent(pfu.adr_growth_rate)}</span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-center px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Year</th>
                          <th className="text-right px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400">ADR</th>
                          <th className="text-right px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Occupancy</th>
                          <th className="text-right px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Site Nights</th>
                          <th className="text-right px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {pfu.yearly_data.map((yd) => (
                          <tr key={yd.year}>
                            <td className="px-2 py-1 text-center text-gray-700 dark:text-gray-300">{yd.year}</td>
                            <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">{formatCurrency(yd.adr)}</td>
                            <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">{yd.occupancy !== null ? formatOccupancyPercent(yd.occupancy) : '-'}</td>
                            <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">{yd.site_nights?.toLocaleString() ?? '-'}</td>
                            <td className="px-2 py-1 text-right font-medium text-gray-900 dark:text-gray-100">{formatLargeCurrency(yd.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Financing Summary */}
        {financing && (
          <Card id="financing" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-sage-600" />
              Financing Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {financing.irr_on_equity !== null && (
                <div className="p-3 bg-sage-50 dark:bg-sage-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">IRR on Equity</p>
                  <p className="text-xl font-bold text-sage-700 dark:text-sage-300">{formatPercent(financing.irr_on_equity)}</p>
                </div>
              )}
              {financing.mortgage_amount !== null && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mortgage</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatLargeCurrency(financing.mortgage_amount)}</p>
                </div>
              )}
              {financing.total_project_cost !== null && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Project Cost</p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatLargeCurrency(financing.total_project_cost)}</p>
                </div>
              )}
              {financing.annual_debt_service !== null && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual Debt Service</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{formatLargeCurrency(financing.annual_debt_service)}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-6">
              {financing.interest_rate !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Interest Rate</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatPercent(financing.interest_rate)}</p>
                </div>
              )}
              {financing.loan_term_years !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loan Term</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{financing.loan_term_years} years</p>
                </div>
              )}
              {financing.ltc_ratio !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">LTC Ratio</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatPercent(financing.ltc_ratio)}</p>
                </div>
              )}
              {financing.equity_pct !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Equity %</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatPercent(financing.equity_pct)}</p>
                </div>
              )}
              {financing.payback_period_years !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Payback Period</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{financing.payback_period_years} years</p>
                </div>
              )}
              {financing.land_cost !== null && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Land Cost</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{formatLargeCurrency(financing.land_cost)}</p>
                </div>
              )}
            </div>
            {financing.yearly_returns && financing.yearly_returns.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Yearly Returns</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-center px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Year</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">NOI</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Net Income to Equity</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Cash on Cash</th>
                        <th className="text-right px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">DCR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {financing.yearly_returns.map((yr) => (
                        <tr key={yr.year}>
                          <td className="px-2 py-1.5 text-center text-gray-700 dark:text-gray-300">{yr.year}</td>
                          <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{formatLargeCurrency(yr.noi)}</td>
                          <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{formatLargeCurrency(yr.net_income_to_equity)}</td>
                          <td className="px-2 py-1.5 text-right font-medium text-green-700 dark:text-green-400">{yr.cash_on_cash !== null ? formatPercent(yr.cash_on_cash) : '-'}</td>
                          <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{yr.dcr?.toFixed(2) ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Development Costs */}
        {developmentCosts.length > 0 && (
          <Card id="development-costs" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sage-600" />
              Development Costs ({developmentCosts.length} items)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Line Item</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Per Unit</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {developmentCosts.map((dc) => (
                    <tr key={dc.id} className={dc.category === 'total' ? 'font-semibold bg-gray-50 dark:bg-gray-800/30' : ''}>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{dc.line_item}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {dc.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(dc.per_unit_cost)}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatLargeCurrency(dc.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Rate Projections */}
        {rateProjections.length > 0 && (
          <Card id="rate-projections" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sage-600" />
              Rate Projections ({rateProjections.length} entries)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Source / Unit Type</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Low Rate</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Peak Rate</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Avg Rate</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rateProjections.map((rp) => (
                    <tr key={rp.id} className={rp.is_subject ? 'bg-sage-50/50 dark:bg-sage-900/10 font-semibold' : ''}>
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                        {rp.unit_type}
                        {rp.is_subject && (
                          <span className="ml-2 text-[10px] font-medium bg-sage-200 dark:bg-sage-800 text-sage-800 dark:text-sage-200 px-2 py-0.5 rounded">
                            SUBJECT
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400 text-xs">
                        {rp.rate_category || '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(rp.low_rate)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(rp.peak_rate)}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(rp.avg_rate)}</td>
                      <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{qualityScoreToDisplay(rp.quality_score)?.toFixed(1) ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Occupancy Projections */}
        {occupancyProjections.length > 0 && (
          <Card id="occupancy-projections" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-sage-600" />
              Occupancy Projections ({occupancyProjections.length} unit types)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {occupancyProjections.map((op) => (
                <div
                  key={op.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">{op.unit_type}</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Stabilized Low</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{formatOccupancyPercent(op.stabilized_low_occ)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Stabilized Peak</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{formatOccupancyPercent(op.stabilized_peak_occ)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Weighted Annual</p>
                      <p className="font-medium text-sage-700 dark:text-sage-300">{formatOccupancyPercent(op.weighted_annual_occ)}</p>
                    </div>
                  </div>
                  {op.ramp_up && op.ramp_up.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ramp-Up</p>
                      <div className="flex gap-2">
                        {op.ramp_up.map((r) => (
                          <div key={r.year} className="flex-1 text-center">
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">Yr {r.year}</div>
                            <div className="h-16 flex items-end justify-center">
                              <div
                                className="w-full bg-sage-400 dark:bg-sage-600 rounded-t"
                                style={{ height: `${Math.min(100, (r.occupancy ?? 0) * 100)}%` }}
                              />
                            </div>
                            <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                              {r.occupancy !== null ? `${Math.round(r.occupancy * 100)}%` : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Market Demographics */}
        {marketData.length > 0 && (
          <Card id="market-profile" className="mb-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sage-600" />
              Market Demographics
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Radius</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Pop. (2020)</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Pop. (Projected)</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Growth</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Households</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Avg HH Size</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Median HH Income</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Per Capita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {marketData.map((md) => (
                    <tr key={md.id}>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{md.radius}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{md.population_2020?.toLocaleString() ?? '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{md.population_projected?.toLocaleString() ?? '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{md.population_growth_rate !== null ? `${(md.population_growth_rate * 100).toFixed(2)}%` : '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{md.households_2020?.toLocaleString() ?? '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{md.avg_household_size?.toFixed(2) ?? '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{md.median_household_income !== null ? formatCurrency(md.median_household_income) : '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{md.per_capita_income !== null ? formatCurrency(md.per_capita_income) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Unit Rate Table */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sage-600" />
          Unit rate comps ({allUnits.length})
        </h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Property</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Unit Type</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300"># Units</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Low ADR</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Peak ADR</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Avg ADR</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Low Occ.</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Peak Occ.</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {allUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200 truncate max-w-[160px]">
                      {unit.property_name}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                      {unit.unit_type}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {unit.unit_category && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 rounded">
                          {unit.unit_category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{unit.num_units ?? '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(unit.low_adr)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(unit.peak_adr)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(unit.avg_annual_adr)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatOccupancyPercent(unit.low_occupancy)}</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{formatOccupancyPercent(unit.peak_occupancy)}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{qualityScoreToDisplay(unit.quality_score)?.toFixed(1) ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
