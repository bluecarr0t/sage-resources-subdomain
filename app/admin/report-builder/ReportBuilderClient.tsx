'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Select } from '@/components/ui';
import { FilePlus, Loader2, Plus, Trash2, X, Clock, CheckCircle2, FileText, FileSpreadsheet, List } from 'lucide-react';
import { UNIT_TYPES } from '@/lib/unit-types';
import { US_STATES_OPTIONS, isValidUsZip } from '@/lib/us-states';
import { REPORT_MARKET_TYPE_OPTIONS, isValidStudyIdFormat } from '@/lib/report-constants';
import { generateUniqueId } from '@/lib/random-id';

const REQUEST_TIMEOUT_MS = 180_000;

interface ProgressStep {
  label: string;
  /** Estimated duration in seconds */
  duration: number;
}

const PROGRESS_STEPS_BASE: ProgressStep[] = [
  { label: 'Enriching property data & benchmarks', duration: 8 },
  { label: 'Fetching comparable properties', duration: 10 },
  { label: 'Generating executive summary', duration: 15 },
  { label: 'Generating letter of transmittal', duration: 8 },
  { label: 'Generating SWOT analysis', duration: 8 },
  { label: 'Assembling DOCX & XLSX', duration: 6 },
  { label: 'Uploading to storage', duration: 5 },
];

const PROGRESS_STEPS_WEB: ProgressStep[] = [
  { label: 'Enriching property data & benchmarks', duration: 8 },
  { label: 'Searching web for market context', duration: 12 },
  { label: 'Researching comparable properties', duration: 15 },
  { label: 'Querying past Sage reports', duration: 5 },
  { label: 'Generating executive summary', duration: 15 },
  { label: 'Generating letter of transmittal', duration: 8 },
  { label: 'Generating SWOT analysis', duration: 8 },
  { label: 'Assembling DOCX & XLSX', duration: 6 },
  { label: 'Uploading to storage', duration: 5 },
];

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

interface UnitMixRow {
  id: string;
  type: string;
  count: number;
}

function createUnitRow(): UnitMixRow {
  return {
    id: generateUniqueId(),
    type: UNIT_TYPES[0] ?? 'Cabin',
    count: 1,
  };
}

const REPORT_SERVICE_OPTIONS = [
  'Feasibility Study',
  'Appraisal',
  'Market Analysis',
  'Revenue Projection',
  'Valuation',
  'Feasibility Study Update',
];

export default function ReportBuilderClient() {
  const [propertyName, setPropertyName] = useState('');
  const [service, setService] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [acres, setAcres] = useState<string>('');
  const [marketType, setMarketType] = useState('glamping');
  const [includeWebResearch, setIncludeWebResearch] = useState(true);
  const [clientEntity, setClientEntity] = useState('');
  const [clientContactName, setClientContactName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCityStateZip, setClientCityStateZip] = useState('');
  const [parcelNumber, setParcelNumber] = useState('');
  const [amenitiesDescription, setAmenitiesDescription] = useState('');
  const [studyId, setStudyId] = useState('');
  const [unitMix, setUnitMix] = useState<UnitMixRow[]>([createUnitRow()]);
  const [addUnitMixLater, setAddUnitMixLater] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; studyId?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const progressStartRef = useRef<number | null>(null);

  const steps = includeWebResearch ? PROGRESS_STEPS_WEB : PROGRESS_STEPS_BASE;
  const totalEstimatedSec = steps.reduce((sum, s) => sum + s.duration, 0);

  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      setElapsedMs(0);
      progressStartRef.current = null;
      return;
    }
    progressStartRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - (progressStartRef.current ?? 0);
      setElapsedMs(elapsed);

      let cumulative = 0;
      let step = 0;
      for (let i = 0; i < steps.length; i++) {
        cumulative += steps[i].duration * 1000;
        if (elapsed < cumulative) {
          step = i;
          break;
        }
        step = i;
      }
      setProgressStep(step);
    }, 500);
    return () => clearInterval(interval);
  }, [loading, steps]);

  // Focus error region when error is set (accessibility)
  useEffect(() => {
    if (error) {
      errorRef.current?.focus();
    }
  }, [error]);

  const addUnitRow = useCallback(() => {
    setUnitMix((prev) => [...prev, createUnitRow()]);
  }, []);

  const removeUnitRow = useCallback((id: string) => {
    setUnitMix((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const updateUnitRow = useCallback((id: string, field: 'type' | 'count', value: string | number) => {
    setUnitMix((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]:
                field === 'count'
                  ? typeof value === 'number'
                    ? Math.max(0, value)
                    : Math.max(0, parseInt(String(value), 10) || 0)
                  : value,
            }
          : r
      )
    );
  }, []);

  const buildPayload = useCallback(
    () => {
      const trimmedName = propertyName.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim();
      const trimmedZip = zipCode.trim();
      const trimmedStudyId = studyId.trim();
      const validUnitMix = addUnitMixLater
        ? []
        : unitMix
            .filter((r) => r.type && r.count > 0)
            .map((r) => ({ type: r.type, count: r.count }));
      const acresNum = acres ? parseFloat(acres) : undefined;
      return {
        property_name: trimmedName,
        service: service.trim() || undefined,
        address_1: address1.trim() || undefined,
        city: trimmedCity,
        state: trimmedState,
        zip_code: trimmedZip || undefined,
        acres: acresNum,
        unit_mix: validUnitMix,
        client_entity: clientEntity.trim() || undefined,
        client_contact_name: clientContactName.trim() || undefined,
        client_address: clientAddress.trim() || undefined,
        client_city_state_zip: clientCityStateZip.trim() || undefined,
        parcel_number: parcelNumber.trim() || undefined,
        amenities_description: amenitiesDescription.trim() || undefined,
        study_id: trimmedStudyId || undefined,
        market_type: marketType,
        include_web_research: includeWebResearch,
        format: 'docx',
      };
    },
    [
      propertyName,
      service,
      address1,
      city,
      state,
      zipCode,
      acres,
      unitMix,
      addUnitMixLater,
      clientEntity,
      clientContactName,
      clientAddress,
      clientCityStateZip,
      parcelNumber,
      amenitiesDescription,
      studyId,
      marketType,
      includeWebResearch,
    ]
  );

  const validateForm = useCallback((): string | null => {
    const trimmedName = propertyName.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedZip = zipCode.trim();
    const trimmedStudyId = studyId.trim();

    if (!trimmedName || !trimmedCity || !trimmedState) {
      return 'Property name, city, and state are required.';
    }
    if (trimmedZip && !isValidUsZip(trimmedZip)) {
      return 'ZIP code must be 5 digits or 5+4 format (e.g. 12345 or 12345-6789).';
    }
    const acresNum = acres ? parseFloat(acres) : undefined;
    if (acresNum != null && (Number.isNaN(acresNum) || acresNum < 0)) {
      return 'Acres must be a non-negative number.';
    }
    if (trimmedStudyId && !isValidStudyIdFormat(trimmedStudyId)) {
      return 'Job number must be blank (auto-generate), DRAFT-YYYYMMDD-xxxx, or NN-NNN[A]?-NN (e.g. 25-100A-01).';
    }
    return null;
  }, [propertyName, city, state, zipCode, acres, studyId]);

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }

    abortRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortRef.current?.abort(), REQUEST_TIMEOUT_MS);
    setLoading(true);

    try {
      const payload = buildPayload();
      const res = await fetch('/api/admin/reports/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortRef.current.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);
      abortRef.current = null;

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Generation failed');
        }
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const docxBlob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const docxFilename = match?.[1] ?? 'report-draft.docx';
      const studyIdFromHeader = res.headers.get('X-Study-Id');

      triggerDownload(docxBlob, docxFilename);

      // Download the XLSX file too (generated alongside the DOCX)
      if (studyIdFromHeader) {
        try {
          const xlsxRes = await fetch(
            `/api/admin/reports/study/${encodeURIComponent(studyIdFromHeader)}/download-xlsx`,
            { credentials: 'include' },
          );
          if (xlsxRes.ok) {
            const xlsxBlob = await xlsxRes.blob();
            const xlsxDisp = xlsxRes.headers.get('content-disposition');
            const xlsxMatch = xlsxDisp?.match(/filename="?([^";]+)"?/);
            const xlsxFilename = xlsxMatch?.[1] ?? `${studyIdFromHeader}-template.xlsx`;
            setTimeout(() => triggerDownload(xlsxBlob, xlsxFilename), 500);
          }
        } catch {
          // XLSX download is best-effort; DOCX is the primary output
        }
      }

      setSuccess({
        message: 'Report draft generated — DOCX and XLSX downloaded.',
        studyId: studyIdFromHeader ?? undefined,
      });
      setError(null);
      setPropertyName('');
      setService('');
      setAddress1('');
      setCity('');
      setState('');
      setZipCode('');
      setAcres('');
      setClientEntity('');
      setClientContactName('');
      setClientAddress('');
      setClientCityStateZip('');
      setParcelNumber('');
      setAmenitiesDescription('');
      setStudyId('');
      setUnitMix([createUnitRow()]);
    } catch (err) {
      setSuccess(null);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Generation can take 60–120 seconds with web research. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Generation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const totalUnits = unitMix.reduce((sum, r) => sum + (r.count > 0 ? r.count : 0), 0);

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8" aria-busy={loading}>
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {loading ? steps[progressStep]?.label : ''}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Report Builder
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter property details to generate an AI-assisted feasibility study draft. The system
              will enrich with regional benchmarks and produce a downloadable DOCX and XLSX.
            </p>
          </div>
          <Link
            href="/admin/report-builder/generated"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sage-600 text-white hover:bg-sage-700 focus:ring-2 focus:ring-sage-600 focus:ring-offset-2 transition-colors shrink-0"
          >
            <List className="w-4 h-4" />
            View Generated Reports
          </Link>
        </div>

        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-start justify-between gap-2"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800/50 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-start justify-between gap-2"
            role="status"
            aria-live="polite"
          >
            <span>
              {success.message}
              {success.studyId && (
                <>
                  {' '}
                  <Link
                    href={`/admin/reports/${success.studyId}`}
                    className="underline font-medium hover:no-underline"
                  >
                    View report
                  </Link>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="shrink-0 p-1 rounded hover:bg-green-100 dark:hover:bg-green-800/50 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Dismiss success"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Property Name"
                name="property_name"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Mountain View Glamping Resort"
                required
              />
              <Select
                label="Service"
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="">Select</option>
                {REPORT_SERVICE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Street Address (optional)"
              name="address_1"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="e.g. 123 Main St"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                required
              />
              <Select
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              >
                <option value="">Select state</option>
                {US_STATES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Input
                label="ZIP Code"
                name="zip_code"
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="12345 or 12345-6789"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Acres"
                name="acres"
                type="number"
                min={0}
                step={0.1}
                value={acres}
                onChange={(e) => setAcres(e.target.value)}
                placeholder="e.g. 25"
              />

              <Select
                label="Market Type"
                value={marketType}
                onChange={(e) => setMarketType(e.target.value)}
              >
                {REPORT_MARKET_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit Mix
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addUnitMixLater}
                      onChange={(e) => setAddUnitMixLater(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Add it later
                    </span>
                  </label>
                </div>
                {!addUnitMixLater && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addUnitRow}
                    className="flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add unit type
                  </Button>
                )}
              </div>
              {!addUnitMixLater && (
                <>
                  <div className="space-y-3">
                    {unitMix.map((row, idx) => (
                      <div key={row.id} className="flex gap-3 items-end">
                        <div className="flex-1 min-w-0">
                          <Select
                            id={`unit-type-${row.id}`}
                            value={row.type}
                            onChange={(e) => updateUnitRow(row.id, 'type', e.target.value)}
                            aria-label={`Unit type for row ${idx + 1}`}
                          >
                            {UNIT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="w-24">
                          <Input
                            id={`unit-count-${row.id}`}
                            type="number"
                            min={0}
                            value={row.count}
                            onChange={(e) =>
                              updateUnitRow(row.id, 'count', parseInt(e.target.value, 10) || 0)
                            }
                            placeholder="Count"
                            aria-label={`Unit count for row ${idx + 1}, ${row.type}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => removeUnitRow(row.id)}
                          disabled={unitMix.length === 1}
                          aria-label={`Remove row ${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Total units: {totalUnits}
                  </p>
                </>
              )}
              {addUnitMixLater && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Unit mix will be added later.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Client Entity (optional)"
                name="client_entity"
                value={clientEntity}
                onChange={(e) => setClientEntity(e.target.value)}
                placeholder="e.g. ABC Development LLC"
              />

              <Input
                label="Client Contact Name (optional)"
                name="client_contact_name"
                value={clientContactName}
                onChange={(e) => setClientContactName(e.target.value)}
                placeholder="e.g. Mr. John Smith"
              />

              <Input
                label="Client Address (optional)"
                name="client_address"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Suite 200"
              />

              <Input
                label="Client City, State, ZIP (optional)"
                name="client_city_state_zip"
                value={clientCityStateZip}
                onChange={(e) => setClientCityStateZip(e.target.value)}
                placeholder="e.g. Chicago, IL 60615"
              />

              <Input
                label="Parcel Number (optional)"
                name="parcel_number"
                value={parcelNumber}
                onChange={(e) => setParcelNumber(e.target.value)}
                placeholder="e.g. 144 009.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Property & client brief (optional)
              </label>
              <textarea
                name="amenities_description"
                value={amenitiesDescription}
                onChange={(e) => setAmenitiesDescription(e.target.value)}
                placeholder="Describe the parcel, property, planned amenities, client goals, and any context you want the AI to use for initial research and report generation."
                rows={5}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This open description is used by the AI to guide research and to tailor the executive summary, letter of transmittal, and SWOT. Include parcel details, planned amenities, client priorities, and any other context.
              </p>
            </div>

            <Input
              label="Job Number (Optional)"
              name="study_id"
              value={studyId}
              onChange={(e) => setStudyId(e.target.value)}
              placeholder="e.g. 25-100A-01 (leave blank to auto-generate DRAFT-YYYYMMDD-xxxx)"
            />

            <div className="flex items-start gap-3">
              <input
                id="include-web-research"
                type="checkbox"
                checked={includeWebResearch}
                onChange={(e) => setIncludeWebResearch(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                aria-describedby="include-web-research-description"
              />
              <div>
                <label
                  htmlFor="include-web-research"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Include web research
                </label>
                <p
                  id="include-web-research-description"
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  Fetch tourism and market context from the web to supplement benchmarks. Adds ~10–20
                  seconds.
                </p>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                    Generating…
                  </>
                ) : (
                  <>
                    <FilePlus className="w-5 h-5" aria-hidden />
                    Generate Draft
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generates both DOCX report and XLSX workbook for download.
              </p>

              {loading && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                  {/* Elapsed / Estimated */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" aria-hidden />
                      Elapsed: <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{formatElapsed(elapsedMs)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      Est. ~{totalEstimatedSec > 60 ? `${Math.ceil(totalEstimatedSec / 60)} min` : `${totalEstimatedSec}s`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(95, (elapsedMs / (totalEstimatedSec * 1000)) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Step list */}
                  <div className="space-y-1.5">
                    {steps.map((step, i) => {
                      const isActive = i === progressStep;
                      const isDone = i < progressStep;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            isActive
                              ? 'text-blue-700 dark:text-blue-300 font-medium'
                              : isDone
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : isActive ? (
                            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          ) : (
                            <span className="w-3.5 h-3.5 shrink-0 rounded-full border border-current" />
                          )}
                          {step.label}
                          {isActive && <span className="text-gray-400 dark:text-gray-500 ml-auto">~{step.duration}s</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Output files indicator */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> DOCX report</span>
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> XLSX workbook</span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
