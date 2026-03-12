'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Select } from '@/components/ui';
import { FilePlus, FileSpreadsheet, Loader2, Plus, Trash2, X } from 'lucide-react';
import { UNIT_TYPES } from '@/lib/unit-types';
import { US_STATES, isValidUsZip } from '@/lib/us-states';
import { REPORT_MARKET_TYPE_OPTIONS, isValidStudyIdFormat } from '@/lib/report-constants';
import { generateUniqueId } from '@/lib/random-id';

const REQUEST_TIMEOUT_MS = 90_000;

const PROGRESS_STEPS = [
  'Enriching data…',
  'Generating summary…',
  'Assembling document…',
] as const;

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

export default function CreateReportDraftClient() {
  const [propertyName, setPropertyName] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [acres, setAcres] = useState<string>('');
  const [marketType, setMarketType] = useState('outdoor_hospitality');
  const [includeWebResearch, setIncludeWebResearch] = useState(false);
  const [clientEntity, setClientEntity] = useState('');
  const [clientContactName, setClientContactName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCityStateZip, setClientCityStateZip] = useState('');
  const [parcelNumber, setParcelNumber] = useState('');
  const [amenitiesDescription, setAmenitiesDescription] = useState('');
  const [studyId, setStudyId] = useState('');
  const [unitMix, setUnitMix] = useState<UnitMixRow[]>([createUnitRow()]);
  const [loading, setLoading] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; studyId?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const progressStartRef = useRef<number | null>(null);

  // Multi-step progress indicator: cycle steps every 15s
  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      progressStartRef.current = null;
      return;
    }
    progressStartRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - (progressStartRef.current ?? 0);
      const step = Math.min(Math.floor(elapsed / 15_000), PROGRESS_STEPS.length - 1);
      setProgressStep(step);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

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
    (format: 'docx' | 'xlsx') => {
      const trimmedName = propertyName.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim();
      const trimmedZip = zipCode.trim();
      const trimmedStudyId = studyId.trim();
      const validUnitMix = unitMix
        .filter((r) => r.type && r.count > 0)
        .map((r) => ({ type: r.type, count: r.count }));
      const acresNum = acres ? parseFloat(acres) : undefined;
      return {
        property_name: trimmedName,
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
        include_web_research: format === 'docx' ? includeWebResearch : false,
        format,
      };
    },
    [
      propertyName,
      address1,
      city,
      state,
      zipCode,
      acres,
      unitMix,
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
      return 'Study ID must be blank (auto-generate), DRAFT-YYYYMMDD-xxxx, or NN-NNN[A]?-NN (e.g. 25-100A-01).';
    }
    return null;
  }, [propertyName, city, state, zipCode, acres, studyId]);

  const handleExportXlsx = useCallback(async () => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setExportingXlsx(true);
    try {
      const payload = buildPayload('xlsx');
      const res = await fetch('/api/admin/reports/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || 'Export failed');
        }
        throw new Error(await res.text() || 'Export failed');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? 'report-template.xlsx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingXlsx(false);
    }
  }, [validateForm, buildPayload]);

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
      const payload = buildPayload('docx');
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

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? 'report-draft.docx';
      const studyIdFromHeader = res.headers.get('X-Study-Id');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess({
        message: 'Report draft generated and downloaded successfully.',
        studyId: studyIdFromHeader ?? undefined,
      });
      setError(null);
      setPropertyName('');
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
          setError('Request timed out. Generation can take 30–60 seconds. Please try again.');
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
        {loading ? PROGRESS_STEPS[progressStep] : ''}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create Report Draft
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter property details to generate an AI-assisted feasibility study draft. The system
            will enrich with regional benchmarks and produce a downloadable DOCX.
          </p>
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
            <Input
              label="Property Name"
              name="property_name"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g. Mountain View Glamping Resort"
              required
            />

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
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit Mix
                </label>
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
              </div>
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
            </div>

            <Input
              label="Client Entity"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amenities Description (optional)
              </label>
              <textarea
                name="amenities_description"
                value={amenitiesDescription}
                onChange={(e) => setAmenitiesDescription(e.target.value)}
                placeholder="e.g. clubhouse, general store, pool, hiking trails"
                rows={3}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400"
              />
            </div>

            <Input
              label="Study ID (optional)"
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
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
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
                  seconds. Requires TAVILY_API_KEY.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                    {PROGRESS_STEPS[progressStep]}
                  </>
                ) : (
                  <>
                    <FilePlus className="w-5 h-5" aria-hidden />
                    Generate Draft
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading || exportingXlsx}
                onClick={handleExportXlsx}
                className="flex items-center justify-center gap-2"
              >
                {exportingXlsx ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                ) : (
                  <FileSpreadsheet className="w-5 h-5" aria-hidden />
                )}
                {exportingXlsx ? 'Exporting…' : 'Export XLSX'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
