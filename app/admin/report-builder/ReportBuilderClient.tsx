'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, Input, Select } from '@/components/ui';
import {
  FilePlus,
  Loader2,
  Plus,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  List,
  Upload,
} from 'lucide-react';
import { UNIT_TYPES } from '@/lib/unit-types';
import { US_STATES_OPTIONS, isValidUsZip } from '@/lib/us-states';
import { REPORT_MARKET_TYPE_OPTIONS, isValidStudyIdFormat } from '@/lib/report-constants';
import { generateUniqueId } from '@/lib/random-id';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import type { EngagementLetterExtract } from '@/lib/ai-report-builder/engagement-letter-fields';
import { consumeDraftProgressNdjson } from '@/lib/ai-report-builder/draft-ndjson-client';
import type { DraftProgressEvent } from '@/lib/ai-report-builder/draft-progress-events';
import type { StdbParseResult } from '@/lib/ai-report-builder/stdb-import';
import type { FeasibilityAssumptions } from '@/lib/feasibility-model';
import {
  markAssumptionsReviewed,
  patchUnitAssumption,
  type AssumptionEvidence,
} from '@/lib/ai-report-builder/assumption-helpers';

const REQUEST_TIMEOUT_MS = 300_000;

interface ProgressStep {
  label: string;
  /** Estimated duration in seconds (fallback timer only) */
  duration: number;
  phases?: string[];
}

const PROGRESS_STEPS_BASE: ProgressStep[] = [
  { label: 'Enriching property data & benchmarks', duration: 8, phases: ['enrich'] },
  { label: 'STDB / market profile', duration: 3, phases: ['stdb'] },
  { label: 'Assumptions & financial model', duration: 10, phases: ['assumptions', 'model'] },
  {
    label: 'Generating report sections',
    duration: 40,
    phases: ['section:executive_summary', 'section:swot', 'section:area_analysis'],
  },
  { label: 'Assembling DOCX & XLSX', duration: 15, phases: ['assemble_docx', 'assemble_xlsx'] },
  { label: 'QA & uploading to storage', duration: 8, phases: ['qa', 'upload'] },
];

const PROGRESS_STEPS_WEB: ProgressStep[] = [
  { label: 'Enriching property data & benchmarks', duration: 8, phases: ['enrich'] },
  { label: 'Web research & comps (inside enrich)', duration: 20, phases: ['enrich'] },
  { label: 'STDB / market profile', duration: 3, phases: ['stdb'] },
  { label: 'Assumptions & financial model', duration: 10, phases: ['assumptions', 'model'] },
  {
    label: 'Generating report sections',
    duration: 45,
    phases: ['section:executive_summary', 'section:demand_indicators', 'section:supply_competition'],
  },
  { label: 'Assembling DOCX & XLSX', duration: 15, phases: ['assemble_docx', 'assemble_xlsx'] },
  { label: 'QA & uploading to storage', duration: 8, phases: ['qa', 'upload'] },
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
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCityStateZip, setClientCityStateZip] = useState('');
  const [parcelNumber, setParcelNumber] = useState('');
  const [resortType, setResortType] = useState('');
  const [intendedUseOfStudy, setIntendedUseOfStudy] = useState('');
  const [engagementDate, setEngagementDate] = useState('');
  const [amenitiesDescription, setAmenitiesDescription] = useState('');
  const [studyId, setStudyId] = useState('');
  const [unitMix, setUnitMix] = useState<UnitMixRow[]>([createUnitRow()]);
  const [addUnitMixLater, setAddUnitMixLater] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; studyId?: string } | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [engagementFileName, setEngagementFileName] = useState<string | null>(null);
  /** Manual intake fields are hidden until PDF parse or "add manually". */
  const [showManualForm, setShowManualForm] = useState(false);
  const [streamDriven, setStreamDriven] = useState(false);
  const [draftMode, setDraftMode] = useState(true);
  const [stdbWaiver, setStdbWaiver] = useState(false);
  const [stdbParse, setStdbParse] = useState<StdbParseResult | null>(null);
  const [stdbFileName, setStdbFileName] = useState<string | null>(null);
  const [stdbLoading, setStdbLoading] = useState(false);
  const [landCost, setLandCost] = useState('');
  const [loanToCost, setLoanToCost] = useState('0.75');
  const [interestRatePct, setInterestRatePct] = useState('9.5');
  const [millLevyPct, setMillLevyPct] = useState('');
  const [intakeConfirmed, setIntakeConfirmed] = useState(false);
  const [assumptions, setAssumptions] = useState<FeasibilityAssumptions | null>(null);
  const [assumptionEvidence, setAssumptionEvidence] = useState<AssumptionEvidence | null>(null);
  const [assumptionsReviewed, setAssumptionsReviewed] = useState(false);
  const [proposeLoading, setProposeLoading] = useState(false);
  const engagementInputRef = useRef<HTMLInputElement>(null);
  const stdbInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const progressStartRef = useRef<number | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const steps = includeWebResearch ? PROGRESS_STEPS_WEB : PROGRESS_STEPS_BASE;
  const totalEstimatedSec = steps.reduce((sum, s) => sum + s.duration, 0);

  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      setElapsedMs(0);
      progressStartRef.current = null;
      setStreamDriven(false);
      return;
    }
    progressStartRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - (progressStartRef.current ?? 0);
      setElapsedMs(elapsed);
      if (streamDriven) return;

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
  }, [loading, steps, streamDriven]);

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

  const applyEngagementExtract = useCallback((extract: EngagementLetterExtract) => {
    if (extract.property_name) setPropertyName(extract.property_name);
    if (extract.service) setService(extract.service);
    if (extract.address_1) setAddress1(extract.address_1);
    if (extract.city) setCity(extract.city);
    if (extract.state) setState(extract.state);
    if (extract.zip_code) setZipCode(extract.zip_code);
    if (extract.market_type) setMarketType(extract.market_type);
    if (extract.parcel_number) setParcelNumber(extract.parcel_number);
    if (extract.client_entity) setClientEntity(extract.client_entity);
    if (extract.client_contact_name) setClientContactName(extract.client_contact_name);
    if (extract.client_phone) setClientPhone(extract.client_phone);
    if (extract.client_email) setClientEmail(extract.client_email);
    if (extract.client_address) setClientAddress(extract.client_address);
    if (extract.client_city_state_zip) setClientCityStateZip(extract.client_city_state_zip);
    if (extract.resort_type_raw) setResortType(extract.resort_type_raw);
    if (extract.intended_use_of_study) setIntendedUseOfStudy(extract.intended_use_of_study);
    if (extract.engagement_date) setEngagementDate(extract.engagement_date);
    if (extract.amenities_description) setAmenitiesDescription(extract.amenities_description);
    // Engagement letters rarely include unit counts — leave unit mix for analyst
    setAddUnitMixLater(true);
  }, []);

  const handleEngagementUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);
      setParseNotice(null);
      setSuccess(null);
      setParseLoading(true);
      setEngagementFileName(file.name);

      try {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/admin/reports/parse-engagement-letter', {
          method: 'POST',
          credentials: 'include',
          body,
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
          extract?: EngagementLetterExtract;
          source_filename?: string;
        };
        if (!res.ok || !data.success || !data.extract) {
          throw new Error(data.error || 'Failed to parse engagement letter');
        }

        applyEngagementExtract(data.extract);
        setShowManualForm(true);
        setIntakeConfirmed(false);
        setAssumptions(null);
        setAssumptionEvidence(null);
        setAssumptionsReviewed(false);
        const missing: string[] = [];
        if (!data.extract.property_name) missing.push('property name');
        if (!data.extract.address_1) missing.push('address');
        if (!data.extract.city) missing.push('city');
        if (!data.extract.state) missing.push('state');
        if (!data.extract.market_type) missing.push('market type (RV/glamping)');
        const warnBits = [
          ...(data.extract.warnings ?? []),
          missing.length ? `Missing: ${missing.join(', ')} — please fill in` : null,
          'Confirm address, market type, unit mix, and STDB before generating. Unit mix is usually not on the engagement letter.',
        ].filter(Boolean);
        setParseNotice(warnBits.join(' '));
        requestAnimationFrame(() => {
          formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } catch (err) {
        setEngagementFileName(null);
        setError(err instanceof Error ? err.message : 'Failed to parse engagement letter');
      } finally {
        setParseLoading(false);
        if (engagementInputRef.current) engagementInputRef.current.value = '';
      }
    },
    [applyEngagementExtract]
  );

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
        client_phone: clientPhone.trim() || undefined,
        client_email: clientEmail.trim() || undefined,
        client_address: clientAddress.trim() || undefined,
        client_city_state_zip: clientCityStateZip.trim() || undefined,
        parcel_number: parcelNumber.trim() || undefined,
        resort_type: resortType.trim() || undefined,
        intended_use_of_study: intendedUseOfStudy.trim() || undefined,
        engagement_date: engagementDate.trim() || undefined,
        amenities_description: amenitiesDescription.trim() || undefined,
        study_id: trimmedStudyId || undefined,
        market_type: marketType,
        include_web_research: includeWebResearch,
        format: 'docx',
        stream: true,
        draft_mode: draftMode,
        stdb_waiver: stdbWaiver,
        stdb_parse: stdbParse ?? undefined,
        land_cost: landCost ? parseFloat(landCost) : undefined,
        loan_to_cost: loanToCost ? parseFloat(loanToCost) : undefined,
        interest_rate_pct: interestRatePct ? parseFloat(interestRatePct) : undefined,
        mill_levy_pct: millLevyPct ? parseFloat(millLevyPct) : undefined,
        assumptions:
          assumptions && assumptionsReviewed
            ? markAssumptionsReviewed(assumptions, draftMode ? 'analyst_set' : 'locked')
            : assumptions ?? undefined,
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
      clientPhone,
      clientEmail,
      clientAddress,
      clientCityStateZip,
      parcelNumber,
      resortType,
      intendedUseOfStudy,
      engagementDate,
      amenitiesDescription,
      studyId,
      marketType,
      includeWebResearch,
      draftMode,
      stdbWaiver,
      stdbParse,
      landCost,
      loanToCost,
      interestRatePct,
      millLevyPct,
      assumptions,
      assumptionsReviewed,
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
    if (!address1.trim()) {
      return 'Street address is required for accurate radius comps and maps.';
    }
    if (!intakeConfirmed) {
      return 'Confirm the intake checklist (address, market type, unit mix) before generating.';
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
    const unitTotal = addUnitMixLater
      ? 0
      : unitMix.reduce((sum, r) => sum + (r.count > 0 ? r.count : 0), 0);
    if (!draftMode && unitTotal <= 0) {
      return 'Unit mix is required for full (non-draft) generate so XLSX model drivers can be written.';
    }
    if (!stdbParse && !stdbWaiver) {
      return 'Upload an STDB Market Profile export or check “Waive STDB import” before generating.';
    }
    if (!draftMode && !assumptionsReviewed) {
      return 'Review and lock ★ assumptions (Propose from market data → confirm) before full generate.';
    }
    if (!draftMode && !assumptions) {
      return 'Propose assumptions from market data before full (non-draft) generate.';
    }
    return null;
  }, [
    propertyName,
    city,
    state,
    zipCode,
    acres,
    studyId,
    address1,
    intakeConfirmed,
    draftMode,
    unitMix,
    addUnitMixLater,
    stdbParse,
    stdbWaiver,
    assumptionsReviewed,
    assumptions,
  ]);

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

  const advanceProgressForPhase = useCallback(
    (phase: string) => {
      setStreamDriven(true);
      let best = 0;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].phases?.includes(phase)) best = Math.max(best, i);
      }
      setProgressStep((prev) => Math.max(prev, best));
    },
    [steps]
  );

  const handleStdbUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    setStdbLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/reports/import-stdb', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        parse?: StdbParseResult;
      };
      if (!res.ok || !data.success || !data.parse) {
        throw new Error(data.error || 'STDB import failed');
      }
      setStdbParse(data.parse);
      setStdbFileName(file.name);
      setStdbWaiver(false);
    } catch (err) {
      setStdbParse(null);
      setStdbFileName(null);
      setError(err instanceof Error ? err.message : 'STDB import failed');
    } finally {
      setStdbLoading(false);
      if (stdbInputRef.current) stdbInputRef.current.value = '';
    }
  }, []);

  const handleProposeAssumptions = useCallback(async () => {
    setProposeLoading(true);
    setError(null);
    try {
      const acresNum = acres ? parseFloat(acres) : undefined;
      const validUnitMix = addUnitMixLater
        ? []
        : unitMix
            .filter((r) => r.type && r.count > 0)
            .map((r) => ({ type: r.type, count: r.count }));
      const res = await fetch('/api/admin/reports/propose-assumptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          property_name: propertyName.trim(),
          city: city.trim(),
          state: state.trim(),
          address_1: address1.trim() || undefined,
          zip_code: zipCode.trim() || undefined,
          acres: acresNum,
          market_type: marketType,
          unit_mix: validUnitMix,
          include_web_research: includeWebResearch,
          land_cost: landCost ? parseFloat(landCost) : undefined,
          loan_to_cost: loanToCost ? parseFloat(loanToCost) : undefined,
          interest_rate_pct: interestRatePct ? parseFloat(interestRatePct) : undefined,
          mill_levy_pct: millLevyPct ? parseFloat(millLevyPct) : undefined,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        assumptions?: FeasibilityAssumptions;
        evidence?: AssumptionEvidence;
      };
      if (!res.ok || !data.success || !data.assumptions) {
        throw new Error(data.error || 'Failed to propose assumptions');
      }
      setAssumptions(data.assumptions);
      setAssumptionEvidence(data.evidence ?? null);
      setAssumptionsReviewed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose assumptions');
    } finally {
      setProposeLoading(false);
    }
  }, [
    acres,
    addUnitMixLater,
    unitMix,
    propertyName,
    city,
    state,
    address1,
    zipCode,
    marketType,
    includeWebResearch,
    landCost,
    loanToCost,
    interestRatePct,
    millLevyPct,
  ]);

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
    setStreamDriven(false);

    try {
      const payload = buildPayload();
      const res = await fetch('/api/admin/reports/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortRef.current.signal,
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/x-ndjson')) {
        let resultEv: Extract<DraftProgressEvent, { type: 'result' }> | null = null;
        let errorMsg: string | null = null;
        const consumed = await consumeDraftProgressNdjson(
          res,
          abortRef.current.signal,
          (ev) => {
            if (ev.type === 'phase' && (ev.status === 'complete' || ev.status === 'started')) {
              advanceProgressForPhase(ev.step);
            }
            if (ev.type === 'result') resultEv = ev;
            if (ev.type === 'error') errorMsg = ev.message;
          }
        );
        clearTimeout(timeoutId);
        abortRef.current = null;
        if (!consumed.ok) throw new Error(consumed.message);
        if (errorMsg) throw new Error(errorMsg);
        if (!resultEv) throw new Error('Generation finished without a result');

        const result = resultEv as Extract<DraftProgressEvent, { type: 'result' }>;
        if (result.assumptions) {
          setAssumptions(result.assumptions);
        }
        if (result.docxUrl) {
          const docxRes = await fetch(result.docxUrl);
          if (docxRes.ok) {
            triggerDownload(await docxRes.blob(), `${result.studyId}-report.docx`);
          }
        }
        if (result.xlsxUrl) {
          setTimeout(async () => {
            try {
              const xlsxRes = await fetch(result.xlsxUrl!);
              if (xlsxRes.ok) {
                triggerDownload(await xlsxRes.blob(), `${result.studyId}-template.xlsx`);
              }
            } catch {
              /* best-effort */
            }
          }, 500);
        }

        const qaBlocked = result.qa && !result.qa.passed && !draftMode;
        const qaNote =
          result.qa && !result.qa.passed
            ? ` QA flags: ${result.qa.flags.join('; ')}.`
            : result.qa?.passed
              ? ' QA passed.'
              : '';
        const diag = result.docxDiagnostics;
        const diagNote = diag
          ? ` Assemble: identity×${diag.identityReplacements}, placeholders=${diag.imagesPlaceholdered}, fingerprints=${diag.sampleFingerprintsRemaining.length ? diag.sampleFingerprintsRemaining.join(', ') : 'none'}.`
          : '';
        const taskNote =
          result.analystTasks?.length
            ? ` Analyst tasks: ${result.analystTasks.slice(0, 3).join(' | ')}`
            : '';
        setSuccess({
          message: qaBlocked
            ? `Ship blocked by QA.${qaNote}${taskNote}`
            : `Report draft generated — DOCX and XLSX ready.${qaNote}${diagNote}${taskNote}`,
          studyId: result.studyId,
        });
      } else {
        clearTimeout(timeoutId);
        abortRef.current = null;
        if (!res.ok) {
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
        if (studyIdFromHeader) {
          try {
            const xlsxRes = await fetch(
              `/api/admin/reports/study/${encodeURIComponent(studyIdFromHeader)}/download-xlsx`,
              { credentials: 'include' }
            );
            if (xlsxRes.ok) {
              const xlsxBlob = await xlsxRes.blob();
              setTimeout(
                () => triggerDownload(xlsxBlob, `${studyIdFromHeader}-template.xlsx`),
                500
              );
            }
          } catch {
            /* best-effort */
          }
        }
        setSuccess({
          message: 'Report draft generated — DOCX and XLSX downloaded.',
          studyId: studyIdFromHeader ?? undefined,
        });
      }

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
      setClientPhone('');
      setClientEmail('');
      setClientAddress('');
      setClientCityStateZip('');
      setParcelNumber('');
      setResortType('');
      setIntendedUseOfStudy('');
      setEngagementDate('');
      setAmenitiesDescription('');
      setStudyId('');
      setUnitMix([createUnitRow()]);
      setAddUnitMixLater(false);
      setEngagementFileName(null);
      setParseNotice(null);
      setShowManualForm(false);
      setStdbParse(null);
      setStdbFileName(null);
      setLandCost('');
      setMillLevyPct('');
    } catch (err) {
      setSuccess(null);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError(
            'Request timed out. Generation can take up to 5 minutes with web research. Please try again.'
          );
        } else {
          setError(err.message);
        }
      } else {
        setError('Generation failed');
      }
    } finally {
      clearTimeout(timeoutId);
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
        <div className={`${adminPageHeadingMargin} flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4`}>
          <div>
            <h1 className={`${adminPageTitle} mb-1`}>
              Report Builder
            </h1>
            <p className={adminPageDescription}>
              Start from a signed Feasibility Study engagement letter PDF. The system extracts
              client and property details, enriches with regional benchmarks, and produces a
              downloadable DOCX and XLSX.
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

        {parseNotice && (
          <div
            className="mb-6 p-4 bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 text-sage-900 dark:text-sage-100 rounded-lg flex items-start justify-between gap-2"
            role="status"
          >
            <span className="text-sm">
              {engagementFileName ? (
                <strong className="font-medium">{engagementFileName}: </strong>
              ) : null}
              {parseNotice}
            </span>
            <button
              type="button"
              onClick={() => setParseNotice(null)}
              className="shrink-0 p-1 rounded hover:bg-sage-100 dark:hover:bg-sage-800/50 focus:outline-none focus:ring-2 focus:ring-sage-500"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <Card className="p-8 mb-6">
          <div className="flex flex-col items-center text-center gap-5">
            <div className="rounded-full bg-sage-100 dark:bg-sage-900/40 p-4">
              <Upload className="w-8 h-8 text-sage-700 dark:text-sage-300" aria-hidden />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Upload engagement letter PDF
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use the standard Sage Feasibility Study engagement letter. We extract resort,
                client, parcel, and study scope, then open the form for review.
              </p>
              {engagementFileName && showManualForm ? (
                <p className="text-sm text-sage-800 dark:text-sage-200 font-medium">
                  Loaded: {engagementFileName}
                </p>
              ) : null}
            </div>
            <input
              ref={engagementInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              id="engagement-letter-upload"
              disabled={parseLoading || loading}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void handleEngagementUpload(f);
              }}
            />
            <Button
              type="button"
              disabled={parseLoading || loading}
              className="inline-flex items-center gap-2 min-w-[12rem] justify-center"
              onClick={() => engagementInputRef.current?.click()}
            >
              {parseLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Parsing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" aria-hidden />
                  {showManualForm ? 'Upload a different PDF' : 'Upload PDF'}
                </>
              )}
            </Button>
            {!showManualForm ? (
              <button
                type="button"
                className="text-sm text-gray-600 dark:text-gray-400 underline-offset-2 hover:underline hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sage-500 rounded px-1"
                disabled={parseLoading || loading}
                onClick={() => {
                  setShowManualForm(true);
                  setParseNotice(null);
                  requestAnimationFrame(() => {
                    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
              >
                Instead, add manually
              </button>
            ) : (
              <button
                type="button"
                className="text-sm text-gray-600 dark:text-gray-400 underline-offset-2 hover:underline hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sage-500 rounded px-1"
                disabled={parseLoading || loading}
                onClick={() => {
                  setShowManualForm(false);
                  setParseNotice(null);
                  setEngagementFileName(null);
                }}
              >
                Hide form and start from PDF again
              </button>
            )}
          </div>
        </Card>

        {showManualForm ? (
        <div ref={formTopRef}>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {engagementFileName ? 'Review extracted details' : 'Enter property details'}
              </h2>
            </div>

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
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-700 dark:bg-gray-700"
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
                label="Client Phone (optional)"
                name="client_phone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="e.g. 2166500625"
              />

              <Input
                label="Client Email (optional)"
                name="client_email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="e.g. client@example.com"
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
                label="Resort Type (optional)"
                name="resort_type"
                value={resortType}
                onChange={(e) => setResortType(e.target.value)}
                placeholder="e.g. Glamping- Wellness"
              />

              <Input
                label="Engagement Date (optional)"
                name="engagement_date"
                value={engagementDate}
                onChange={(e) => setEngagementDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="Parcel Number (optional)"
                name="parcel_number"
                value={parcelNumber}
                onChange={(e) => setParcelNumber(e.target.value)}
                placeholder="e.g. 144 009.00"
              />

              <Input
                label="Purpose of Report (optional)"
                name="intended_use_of_study"
                value={intendedUseOfStudy}
                onChange={(e) => setIntendedUseOfStudy(e.target.value)}
                placeholder="e.g. Decision making, Financing and Investor Support"
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
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400"
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

            <div className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ★ Assumptions &amp; STDB
              </h3>
              <label className="inline-flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={intakeConfirmed}
                  onChange={(e) => setIntakeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span>
                  I confirmed address, market type (RV/glamping), acreage/parcels, and unit mix
                  after engagement-letter parse.
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Land cost ($)"
                  name="land_cost"
                  value={landCost}
                  onChange={(e) => setLandCost(e.target.value)}
                  placeholder="e.g. 500000"
                />
                <Input
                  label="Loan-to-cost (0–1)"
                  name="loan_to_cost"
                  value={loanToCost}
                  onChange={(e) => setLoanToCost(e.target.value)}
                  placeholder="0.75"
                />
                <Input
                  label="Interest rate (%)"
                  name="interest_rate_pct"
                  value={interestRatePct}
                  onChange={(e) => setInterestRatePct(e.target.value)}
                  placeholder="9.5"
                />
                <Input
                  label="Mill levy (%)"
                  name="mill_levy_pct"
                  value={millLevyPct}
                  onChange={(e) => setMillLevyPct(e.target.value)}
                  placeholder="e.g. 4.98"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  STDB export (Market Profile)
                </label>
                <input
                  ref={stdbInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="block w-full text-sm text-gray-600 dark:text-gray-300"
                  onChange={(e) => handleStdbUpload(e.target.files?.[0] ?? null)}
                  disabled={stdbLoading || loading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Upload Site To Do Business export (CSV/XLSX) for 60/120/180 drive-time rings.{' '}
                  {stdbFileName
                    ? `Loaded: ${stdbFileName}`
                    : 'Required unless waived (haversine fallback is less accurate).'}
                  {stdbLoading ? ' Uploading…' : ''}
                </p>
              </div>

              <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={proposeLoading || loading || !propertyName.trim() || !city.trim() || !state.trim()}
                    onClick={() => void handleProposeAssumptions()}
                    className="flex items-center gap-2"
                  >
                    {proposeLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                        Proposing…
                      </>
                    ) : (
                      'Propose ★ assumptions from market data'
                    )}
                  </Button>
                  {assumptions && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {assumptions.units.length} unit row(s) proposed
                    </span>
                  )}
                </div>
                {assumptionEvidence && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p>
                      <span className="font-medium text-gray-800 dark:text-gray-200">Rates:</span>{' '}
                      {assumptionEvidence.ratesSource}
                    </p>
                    <p>
                      <span className="font-medium text-gray-800 dark:text-gray-200">Occ:</span>{' '}
                      {assumptionEvidence.occSource}
                    </p>
                    <p>
                      Comps: {assumptionEvidence.compCount} (past {assumptionEvidence.pastReportCompCount},
                      web {assumptionEvidence.webCompCount})
                      {assumptionEvidence.stvrSummary
                        ? ` · STVR ${assumptionEvidence.stvrSummary}`
                        : ''}
                    </p>
                    <pre className="whitespace-pre-wrap rounded bg-neutral-50 dark:bg-neutral-900/50 p-2 text-[11px]">
                      {assumptionEvidence.pivotSummary}
                    </pre>
                  </div>
                )}
                {assumptions?.units?.map((u) => (
                  <div
                    key={u.value.unitType}
                    className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end"
                  >
                    <Input
                      label={`${u.value.unitType} qty`}
                      value={String(u.value.quantity)}
                      onChange={(e) =>
                        setAssumptions((prev) =>
                          prev
                            ? patchUnitAssumption(prev, u.value.unitType, {
                                quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            : prev
                        )
                      }
                    />
                    <Input
                      label="Low ADR"
                      value={String(Math.round(u.value.lowAdr))}
                      onChange={(e) =>
                        setAssumptions((prev) =>
                          prev
                            ? patchUnitAssumption(prev, u.value.unitType, {
                                lowAdr: parseFloat(e.target.value) || 0,
                              })
                            : prev
                        )
                      }
                    />
                    <Input
                      label="Peak ADR"
                      value={String(Math.round(u.value.peakAdr))}
                      onChange={(e) =>
                        setAssumptions((prev) =>
                          prev
                            ? patchUnitAssumption(prev, u.value.unitType, {
                                peakAdr: parseFloat(e.target.value) || 0,
                              })
                            : prev
                        )
                      }
                    />
                    <Input
                      label="Low occ (0–1)"
                      value={String(u.value.lowOccupancy)}
                      onChange={(e) =>
                        setAssumptions((prev) =>
                          prev
                            ? patchUnitAssumption(prev, u.value.unitType, {
                                lowOccupancy: parseFloat(e.target.value) || 0,
                              })
                            : prev
                        )
                      }
                    />
                    <Input
                      label="Peak occ (0–1)"
                      value={String(u.value.peakOccupancy)}
                      onChange={(e) =>
                        setAssumptions((prev) =>
                          prev
                            ? patchUnitAssumption(prev, u.value.unitType, {
                                peakOccupancy: parseFloat(e.target.value) || 0,
                              })
                            : prev
                        )
                      }
                    />
                  </div>
                ))}
                {assumptions && (
                  <label className="inline-flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={assumptionsReviewed}
                      onChange={(e) => setAssumptionsReviewed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <span>
                      I reviewed ★ rates/occupancy against the evidence above (required to ship
                      outside draft mode).
                    </span>
                  </label>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={draftMode}
                    onChange={(e) => setDraftMode(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Draft mode (allow proposed ★ assumptions; XLSX drivers skipped if unit mix empty)
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={stdbWaiver}
                    onChange={(e) => setStdbWaiver(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Waive STDB import for this draft
                </label>
              </div>
              {!draftMode && totalUnits <= 0 && (
                <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-md px-3 py-2">
                  Full generate requires a unit mix (types + counts), STDB upload or waiver, and
                  reviewed assumptions. Ship mode blocks upload if QA fails.
                </p>
              )}
              {draftMode && totalUnits <= 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Draft without unit mix: narrative DOCX will generate; XLSX model drivers will be
                  skipped until unit counts are entered.
                </p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <input
                id="include-web-research"
                type="checkbox"
                checked={includeWebResearch}
                onChange={(e) => setIncludeWebResearch(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-700 dark:bg-gray-700"
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
                <div className="rounded-lg border border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40 p-4 space-y-3">
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
                  <div className="pt-2 border-t border-neutral-200/75 dark:border-neutral-800 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> DOCX report</span>
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> XLSX workbook</span>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Card>
        </div>
        ) : null}
      </div>
    </main>
  );
}
