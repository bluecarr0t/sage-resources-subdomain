'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Users,
  Download,
  FileText,
  FileSpreadsheet,
  BarChart3,
  Calendar,
  Briefcase,
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ReportDetail {
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
  resort_name: string | null;
  resort_type: string | null;
  county: string | null;
  lot_size_acres: number | null;
  parcel_number: string | null;
  report_purpose: string | null;
  address_1: string | null;
  zip_code: string | null;
  executive_summary: string | null;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats?: string[];
  } | null;
  authors: string[] | null;
  report_date: string | null;
  client_entity: string | null;
  client_name: string | null;
  client_company: string | null;
  has_docx: boolean;
  has_comparables: boolean;
  docx_file_path: string | null;
  csv_file_path: string | null;
  comp_count: number | null;
  comp_unit_count: number | null;
  latitude: number | null;
  longitude: number | null;
}

/** Known template/census dates — do not display as report date */
const TEMPLATE_DATE_ISO = new Set(['2010-12-01', '2010-01-01', '2000-01-01']);

function isDisplayableReportDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const iso = d.toISOString().split('T')[0];
  return !TEMPLATE_DATE_ISO.has(iso);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMarketType(type: string | null | undefined) {
  const map: Record<string, string> = {
    rv: 'RV Park',
    'rv-park': 'RV Park',
    campground: 'Campground',
    glamping: 'Glamping',
    mixed: 'Mixed Use',
    outdoor_hospitality: 'Outdoor Hospitality',
  };
  return map[(type || '').toLowerCase()] || type || 'N/A';
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studyId = params.studyId as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reExtracting, setReExtracting] = useState(false);
  const [reExtractSuccess, setReExtractSuccess] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports/study/${studyId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load report');
        return;
      }
      setReport(data.report);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studyId) loadReport();
  }, [studyId]);

  const hasAnyFile = report?.csv_file_path || report?.docx_file_path;

  const handleReExtract = async () => {
    if (!hasAnyFile || !studyId) return;
    setReExtracting(true);
    setError(null);
    setReExtractSuccess(false);
    try {
      const res = await fetch(`/api/admin/comparables/${studyId}/re-extract`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Re-extraction failed');
        return;
      }
      await loadReport();
      setReExtractSuccess(true);
      setTimeout(() => setReExtractSuccess(false), 4000);
    } catch {
      setError('Re-extraction failed');
    } finally {
      setReExtracting(false);
    }
  };

  if (loading) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto py-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-[#4a624a] rounded-full animate-spin mb-4" />
          Loading report...
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="p-8 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-center">
            <p className="text-red-700 dark:text-red-300 font-medium">{error || 'Report not found'}</p>
            <Button variant="secondary" className="mt-4" onClick={() => router.push('/admin/past-reports')}>
              Go to Past Reports
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const hasSWOT = report.swot && (
    report.swot.strengths.length > 0 ||
    report.swot.weaknesses.length > 0 ||
    report.swot.opportunities.length > 0 ||
    (report.swot.threats?.length ?? 0) > 0
  );

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {reExtractSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Re-extraction completed successfully. Data has been refreshed.</span>
          </div>
        )}
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {report.property_name || report.title || 'Untitled Report'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                {report.study_id && (
                  <span className="px-2 py-0.5 bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 rounded font-mono text-xs">
                    {report.study_id}
                  </span>
                )}
                {(report.city || report.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[report.city, report.state].filter(Boolean).join(', ')}
                  </span>
                )}
                {isDisplayableReportDate(report.report_date) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(report.report_date)}
                  </span>
                )}
                {report.market_type && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {formatMarketType(report.market_type)}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons - below report details */}
            <div className="flex flex-wrap gap-2">
              {report.has_comparables && (
                <Link href={`/admin/comparables/${report.study_id}`}>
                  <Button variant="primary" size="sm">
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    View Comps & Financial Data
                  </Button>
                </Link>
              )}
              {(report.csv_file_path || report.docx_file_path) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReExtract}
                  disabled={reExtracting}
                  className="flex items-center gap-1.5"
                >
                  {reExtracting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {reExtracting ? 'Re-extracting...' : 'Re-extract'}
                </Button>
              )}
              {report.csv_file_path && (
                <a href={`/api/admin/comparables/${report.study_id}/download`}>
                  <Button variant="secondary" size="sm">
                    <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                    Download XLSX
                  </Button>
                </a>
              )}
              {report.has_docx && report.docx_file_path && (
                <a href={`/api/admin/reports/study/${report.study_id}/download-docx`}>
                  <Button variant="secondary" size="sm">
                    <Download className="w-4 h-4 mr-1.5" />
                    Download DOCX
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Executive Summary */}
            {report.executive_summary && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sage-500" />
                  Executive Summary
                </h2>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {report.executive_summary}
                </div>
              </Card>
            )}

            {/* SWOT Analysis */}
            {hasSWOT && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-sage-500" />
                  SWOT Analysis
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  {report.swot!.strengths.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {report.swot!.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {report.swot!.weaknesses.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Weaknesses
                      </h3>
                      <ul className="space-y-2">
                        {report.swot!.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {report.swot!.opportunities.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4" />
                        Opportunities
                      </h3>
                      <ul className="space-y-2">
                        {report.swot!.opportunities.map((o, i) => (
                          <li key={i} className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Threats */}
                  {(report.swot!.threats?.length ?? 0) > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Threats
                      </h3>
                      <ul className="space-y-2">
                        {report.swot!.threats!.map((t, i) => (
                          <li key={i} className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Report Purpose / Scope of Work */}
            {report.report_purpose && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-sage-500" />
                  Scope of Work
                </h2>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {report.report_purpose}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Client Info */}
            {(report.client_name || report.client_entity || report.client_company) && (
              <Card>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sage-500" />
                  Client Information
                </h2>
                <div className="space-y-2 text-sm">
                  {report.client_name && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Name</span>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{report.client_name}</p>
                    </div>
                  )}
                  {report.client_entity && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Entity</span>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{report.client_entity}</p>
                    </div>
                  )}
                  {report.client_company && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Company</span>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{report.client_company}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Property Details */}
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sage-500" />
                Property Details
              </h2>
              <div className="space-y-3 text-sm">
                {report.address_1 && (
                  <DetailRow label="Address" value={report.address_1} />
                )}
                {(report.city || report.state) && (
                  <DetailRow
                    label="Location"
                    value={[report.city, report.state, report.zip_code].filter(Boolean).join(', ')}
                  />
                )}
                {report.county && (
                  <DetailRow label="County" value={report.county} />
                )}
                {report.lot_size_acres && (
                  <DetailRow label="Lot Size" value={`${report.lot_size_acres} acres`} />
                )}
                {report.parcel_number && (
                  <DetailRow label="Parcel #" value={report.parcel_number} />
                )}
                {report.total_sites && (
                  <DetailRow label="Total Units/Sites" value={report.total_sites.toString()} />
                )}
                {report.market_type && (
                  <DetailRow label="Market Type" value={formatMarketType(report.market_type)} />
                )}
                {report.resort_type && (
                  <DetailRow label="Resort Type" value={report.resort_type} />
                )}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sage-500" />
                Data Available
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">XLSX Workbook</span>
                  {report.csv_file_path ? (
                    <span className="text-green-600 dark:text-green-400 text-xs font-medium">Uploaded</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">Not uploaded</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">DOCX Report</span>
                  {report.has_docx ? (
                    <span className="text-green-600 dark:text-green-400 text-xs font-medium">Uploaded</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">Not uploaded</span>
                  )}
                </div>
                {report.comp_count != null && report.comp_count > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Comparables</span>
                    <span className="text-gray-900 dark:text-gray-100 text-xs font-medium">{report.comp_count}</span>
                  </div>
                )}
                {report.comp_unit_count != null && report.comp_unit_count > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Unit Types</span>
                    <span className="text-gray-900 dark:text-gray-100 text-xs font-medium">{report.comp_unit_count}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Map Preview */}
            {report.latitude && report.longitude && (
              <Card>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sage-500" />
                  Location
                </h2>
                <Link href="/admin/client-map" className="text-sage-600 dark:text-sage-400 hover:underline text-xs">
                  View on Client Map
                </Link>
              </Card>
            )}
          </div>
        </div>

        {/* No DOCX content message */}
        {!report.executive_summary && !hasSWOT && !report.report_purpose && (
          <Card className="mt-6">
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                No narrative report data available
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Upload a .docx file to see executive summary, SWOT analysis, and more.
              </p>
              <Link href="/admin/upload-reports">
                <Button variant="secondary" size="sm" className="mt-4">
                  Upload Report
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{label}</span>
      <p className="text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
