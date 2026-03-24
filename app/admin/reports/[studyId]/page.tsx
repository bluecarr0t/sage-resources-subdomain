'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, Modal, ModalContent, Input, Select } from '@/components/ui';
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
  Upload,
  Pencil,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { UNIT_TYPES } from '@/lib/unit-types';
import { AMENITIES } from '@/lib/amenities';

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
  service: string | null;
  unit_descriptions: Array<{ type: string; quantity: number | null; description: string | null }> | null;
  key_amenities: string[] | null;
  has_docx: boolean;
  has_xlsx: boolean;
  has_comparables: boolean;
  docx_file_path: string | null;
  xlsx_file_path: string | null;
  cost_analysis_file_path?: string | null;
  csv_file_path: string | null;
  comp_count: number | null;
  comp_unit_count: number | null;
  latitude: number | null;
  longitude: number | null;
}

/** Parse date string as local midnight to avoid timezone shift */
function parseLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr + 'T00:00:00');
}

function isDisplayableReportDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  if (year < 2015 || year > 2035) return false;
  return true;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMarketType(type: string | null | undefined) {
  const map: Record<string, string> = {
    rv: 'RV',
    rv_glamping: 'RV & Glamping',
    glamping: 'Glamping',
    marina: 'Marina',
    landscape_hotel: 'Landscape Hotel',
  };
  return map[(type || '').toLowerCase()] || type || 'N/A';
}

function formatService(service: string | null | undefined) {
  const map: Record<string, string> = {
    feasibility_study: 'Feasibility Study',
    appraisal: 'Appraisal',
    revenue_projection: 'Revenue Projection',
    market_study: 'Market Study',
    update: 'Update',
  };
  return map[(service || '').toLowerCase()] || service || 'N/A';
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
  const [uploadingDocx, setUploadingDocx] = useState(false);
  const [uploadDocxSuccess, setUploadDocxSuccess] = useState(false);
  const [uploadingXlsx, setUploadingXlsx] = useState(false);
  const [uploadXlsxSuccess, setUploadXlsxSuccess] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [selectedUnitTypes, setSelectedUnitTypes] = useState<string[]>([]);
  const [customUnitTypeInput, setCustomUnitTypeInput] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenityInput, setCustomAmenityInput] = useState('');

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

  useEffect(() => {
    if (editModalOpen && report) {
      const types = (report.unit_descriptions || [])
        .map((d) => d.type?.trim())
        .filter(Boolean);
      setSelectedUnitTypes(types);
      setSelectedAmenities((report.key_amenities || []).filter(Boolean));
    }
  }, [editModalOpen, report]);

  const hasAnyFile = report?.csv_file_path || report?.docx_file_path;

  const uploadDocxInputRef = useRef<HTMLInputElement>(null);
  const uploadXlsxInputRef = useRef<HTMLInputElement>(null);

  const MAX_DOCX_MB = 100;
  const MAX_XLSX_MB = 50;

  const handleUploadDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studyId) return;
    e.target.value = '';
    const base = file.name.replace(/\.[^.]+$/, '').trim();
    const match = base.match(/^(\d{2}-\d{3}[A-Z]?-\d{2})\b/i) || base.match(/\b(\d{2}-\d{3}[A-Z]?-\d{2})\b/i);
    const fileStudyId = match ? match[1] : '';
    if (fileStudyId.toUpperCase() !== studyId.toUpperCase()) {
      setError(`Filename job number (${fileStudyId || 'not found'}) does not match this report (${studyId}). Use a DOCX file whose filename contains the job number.`);
      return;
    }
    if (file.size > MAX_DOCX_MB * 1024 * 1024) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_DOCX_MB}MB. Try compressing the DOCX or reducing embedded images.`);
      return;
    }
    setUploadingDocx(true);
    setError(null);
    setUploadDocxSuccess(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/reports/study/${studyId}/upload-docx`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Upload failed');
        return;
      }
      await loadReport();
      setUploadDocxSuccess(true);
      setTimeout(() => setUploadDocxSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingDocx(false);
    }
  };

  const handleUploadXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studyId) return;
    e.target.value = '';
    const base = file.name.replace(/\.[^.]+$/, '').trim();
    const match = base.match(/^(\d{2}-\d{3}[A-Z]?-\d{2})\b/i) || base.match(/\b(\d{2}-\d{3}[A-Z]?-\d{2})\b/i);
    const fileStudyId = match ? match[1] : '';
    if (fileStudyId.toUpperCase() !== studyId.toUpperCase()) {
      setError(`Filename job number (${fileStudyId || 'not found'}) does not match this report (${studyId}). Use an XLSX file whose filename contains the job number.`);
      return;
    }
    if (file.size > MAX_XLSX_MB * 1024 * 1024) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_XLSX_MB}MB.`);
      return;
    }
    setUploadingXlsx(true);
    setError(null);
    setUploadXlsxSuccess(false);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await fetch('/api/admin/comparables/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || data.error || 'Upload failed');
        return;
      }
      const results = data.results as Array<{ success?: boolean; error?: string }> | undefined;
      const firstResult = results?.[0];
      if (firstResult && !firstResult.success) {
        setError(firstResult.error || 'Upload failed');
        return;
      }
      await loadReport();
      setUploadXlsxSuccess(true);
      setTimeout(() => setUploadXlsxSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingXlsx(false);
    }
  };

  const handleRegenerate = async () => {
    if (!studyId) return;
    setReExtracting(true);
    setError(null);
    setReExtractSuccess(false);
    try {
      const res = await fetch(`/api/admin/reports/study/${studyId}/regenerate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Regeneration failed');
        return;
      }
      await loadReport();
      setReExtractSuccess(true);
      setTimeout(() => setReExtractSuccess(false), 4000);
    } catch {
      setError('Regeneration failed');
    } finally {
      setReExtracting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!studyId || !report) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get('title') as string)?.trim() || null;
    const location = (formData.get('location') as string)?.trim() || null;
    const reportDate = (formData.get('report_date') as string)?.trim() || null;
    const clientEntity = (formData.get('client_entity') as string)?.trim() || null;
    const marketType = (formData.get('market_type') as string) || null;
    const service = (formData.get('service') as string) || null;
    const unitTypes = selectedUnitTypes.filter(Boolean);
    const amenities = selectedAmenities.filter(Boolean);
    const totalSitesRaw = (formData.get('total_sites') as string)?.trim();
    const totalSites = totalSitesRaw ? parseInt(totalSitesRaw, 10) : null;

    setEditSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/study/${studyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          location,
          report_date: reportDate || null,
          client_entity: clientEntity,
          market_type: marketType,
          service: service || null,
          unit_types: unitTypes,
          amenities,
          total_sites: Number.isNaN(totalSites) ? null : totalSites,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to update report');
        return;
      }
      await loadReport();
      setEditModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setEditSaving(false);
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
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {report && (
                <Button variant="secondary" onClick={() => setError(null)}>
                  Try again
                </Button>
              )}
              <Button variant="secondary" onClick={() => router.push('/admin/past-reports')}>
                Go to Past Reports
              </Button>
            </div>
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
        {(reExtractSuccess || uploadDocxSuccess || uploadXlsxSuccess) && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>
              {uploadDocxSuccess ? 'DOCX uploaded successfully. Download DOCX should now work.' : uploadXlsxSuccess ? 'XLSX uploaded successfully. Download XLSX should now work.' : 'Report regenerated successfully. DOCX and XLSX have been updated.'}
            </span>
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
                {report.title || report.property_name || 'Untitled Report'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                {report.study_id && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Job #</span>
                    <span className="px-2 py-0.5 bg-sage-100 dark:bg-sage-800 text-sage-700 dark:text-sage-300 rounded font-mono text-xs">
                      {report.study_id}
                    </span>
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
                <Link href={`/admin/comps/${report.study_id}`}>
                  <Button variant="primary" size="sm" className="flex flex-col items-start gap-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>View Comps & Financial Data</span>
                  </Button>
                </Link>
              )}
              {report.csv_file_path && (
                <a href={`/api/admin/comparables/${report.study_id}/download`}>
                  <Button variant="secondary" size="sm" className="flex flex-col items-start gap-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download XLSX</span>
                  </Button>
                </a>
              )}
              {!report.csv_file_path && (
                <>
                  <input
                    ref={uploadXlsxInputRef}
                    type="file"
                    accept=".xlsx,.xlsm,.xlsxm"
                    className="hidden"
                    onChange={handleUploadXlsx}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => uploadXlsxInputRef.current?.click()}
                    disabled={uploadingXlsx}
                    className="flex flex-col items-start gap-1 border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  >
                    {uploadingXlsx ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingXlsx ? 'Uploading...' : 'Upload .XLSX'}</span>
                  </Button>
                </>
              )}
              {report.has_docx && report.docx_file_path ? (
                <a href={`/api/admin/reports/study/${report.study_id}/download-docx`}>
                  <Button variant="secondary" size="sm" className="flex flex-col items-start gap-1">
                    <Download className="w-4 h-4" />
                    <span>Download DOCX</span>
                  </Button>
                </a>
              ) : (
                <>
                  <input
                    ref={uploadDocxInputRef}
                    type="file"
                    accept=".docx,.doc"
                    className="hidden"
                    onChange={handleUploadDocx}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => uploadDocxInputRef.current?.click()}
                    disabled={uploadingDocx}
                    className="flex flex-col items-start gap-1 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-2"
                  >
                    {uploadingDocx ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingDocx ? 'Uploading...' : 'Upload DOCX'}</span>
                  </Button>
                </>
              )}
              {report.has_xlsx && report.xlsx_file_path && (
                <a href={`/api/admin/reports/study/${report.study_id}/download-xlsx`}>
                  <Button variant="secondary" size="sm" className="flex flex-col items-start gap-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download XLSX</span>
                  </Button>
                </a>
              )}
              {report.cost_analysis_file_path && (
                <a href={`/api/admin/reports/study/${report.study_id}/download-cost-analysis`}>
                  <Button variant="secondary" size="sm" className="flex flex-col items-start gap-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Cost Analysis</span>
                  </Button>
                </a>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                disabled={reExtracting}
                className="flex flex-col items-start gap-1"
              >
                {reExtracting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{reExtracting ? 'Re-generating...' : 'Re-generate'}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditModalOpen(true)}
                className="flex flex-col items-start gap-1"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2/3 width (column 1) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Executive Summary - above Scope of Work in column 1 */}
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
            {report.has_docx && !report.executive_summary && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sage-500" />
                  Executive Summary
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Re-extract the DOCX to populate the executive summary.
                </p>
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

          {/* Sidebar - 1/3 width (column 2) */}
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
                  <div>
                    <DetailRow label="Address" value={report.address_1} />
                    {report.study_id && (
                      <Link
                        href={`/admin/client-map?studyId=${encodeURIComponent(report.study_id)}`}
                        className="text-sage-600 dark:text-sage-400 hover:underline text-xs mt-1 inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        View on Map
                      </Link>
                    )}
                  </div>
                )}
                {!report.address_1 && report.study_id && (
                  <div>
                    <Link
                      href={`/admin/client-map?studyId=${encodeURIComponent(report.study_id)}`}
                      className="text-sage-600 dark:text-sage-400 hover:underline text-xs inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Map
                    </Link>
                  </div>
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
                {report.service && (
                  <DetailRow label="Service" value={formatService(report.service)} />
                )}
                {report.unit_descriptions && report.unit_descriptions.length > 0 && (
                  <DetailRow
                    label="Unit Type"
                    value={report.unit_descriptions.map((d) => d.type).filter(Boolean).join(', ')}
                  />
                )}
                {report.key_amenities && report.key_amenities.length > 0 && (
                  <DetailRow
                    label="Key Amenities"
                    value={report.key_amenities.join(', ')}
                  />
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
                  {report.csv_file_path || report.has_xlsx ? (
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
                    <span className="text-gray-600 dark:text-gray-400">Comps</span>
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

        {/* Edit Report Modal */}
        <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} className="max-w-xl">
          <ModalContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Report
            </h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <Input
                label="Title"
                name="title"
                defaultValue={report.title || report.property_name || ''}
                placeholder="Report title"
              />
              <Input
                label="Location"
                name="location"
                defaultValue={[report.city, report.state, report.zip_code].filter(Boolean).join(', ')}
                placeholder="City, State ZIP"
              />
              <Input
                label="Date Completed"
                name="report_date"
                type="date"
                defaultValue={report.report_date || ''}
              />
              <Input
                label="Entity"
                name="client_entity"
                defaultValue={report.client_entity || ''}
                placeholder="Client entity"
              />
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <Select
                    label="Type"
                    name="market_type"
                    defaultValue={report.market_type || 'glamping'}
                  >
                    <option value="rv">RV</option>
                    <option value="rv_glamping">RV & Glamping</option>
                    <option value="glamping">Glamping</option>
                    <option value="marina">Marina</option>
                    <option value="landscape_hotel">Landscape Hotel</option>
                  </Select>
                </div>
                <div className="flex-1 min-w-0">
                  <Select
                    label="Service"
                    name="service"
                    defaultValue={report.service || ''}
                  >
                    <option value="">—</option>
                    <option value="feasibility_study">Feasibility Study</option>
                    <option value="appraisal">Appraisal</option>
                    <option value="revenue_projection">Revenue Projection</option>
                    <option value="market_study">Market Study</option>
                    <option value="update">Update</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit Type
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUnitTypes.map((ut) => (
                    <span
                      key={ut}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sage-100 dark:bg-sage-800/50 text-sage-800 dark:text-sage-200 text-sm"
                    >
                      {ut}
                      <button
                        type="button"
                        onClick={() => setSelectedUnitTypes((prev) => prev.filter((x) => x !== ut))}
                        className="hover:bg-sage-200 dark:hover:bg-sage-700 rounded p-0.5"
                        aria-label={`Remove ${ut}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !selectedUnitTypes.includes(v)) {
                        setSelectedUnitTypes((prev) => [...prev, v]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">Add from list...</option>
                    {UNIT_TYPES.filter((ut) => !selectedUnitTypes.includes(ut)).map((ut) => (
                      <option key={ut} value={ut}>
                        {ut}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or type custom..."
                    value={customUnitTypeInput}
                    onChange={(e) => setCustomUnitTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = customUnitTypeInput.trim();
                        if (v && !selectedUnitTypes.includes(v)) {
                          setSelectedUnitTypes((prev) => [...prev, v]);
                          setCustomUnitTypeInput('');
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const v = customUnitTypeInput.trim();
                      if (v && !selectedUnitTypes.includes(v)) {
                        setSelectedUnitTypes((prev) => [...prev, v]);
                        setCustomUnitTypeInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amenities
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedAmenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sage-100 dark:bg-sage-800/50 text-sage-800 dark:text-sage-200 text-sm"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => setSelectedAmenities((prev) => prev.filter((x) => x !== a))}
                        className="hover:bg-sage-200 dark:hover:bg-sage-700 rounded p-0.5"
                        aria-label={`Remove ${a}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !selectedAmenities.includes(v)) {
                        setSelectedAmenities((prev) => [...prev, v]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">Add from list...</option>
                    {AMENITIES.filter((a) => !selectedAmenities.includes(a)).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or type custom..."
                    value={customAmenityInput}
                    onChange={(e) => setCustomAmenityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = customAmenityInput.trim();
                        if (v && !selectedAmenities.includes(v)) {
                          setSelectedAmenities((prev) => [...prev, v]);
                          setCustomAmenityInput('');
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-sage-600 focus:border-transparent focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const v = customAmenityInput.trim();
                      if (v && !selectedAmenities.includes(v)) {
                        setSelectedAmenities((prev) => [...prev, v]);
                        setCustomAmenityInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <Input
                label="Total Units/Sites"
                name="total_sites"
                type="number"
                min={0}
                defaultValue={report.total_sites ?? ''}
                placeholder="e.g. 150"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </ModalContent>
        </Modal>

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
