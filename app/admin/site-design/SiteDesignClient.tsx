'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LayoutGrid, Plus, Trash2, Download, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SQFT_PER_ACRE, computeResults } from '@/lib/site-design/calculator';
import { buildSiteDesignExportData } from '@/lib/site-design/export';
import { buildSiteDesignUrlParams, parseSitesFromUrl } from '@/lib/site-design/url-state';
import type { SiteTypeConfig } from '@/lib/site-design/types';

const PRESETS = {
  standard: {
    grossAcres: 50,
    usablePct: 75,
    roadWidth: 24,
    blockEfficiency: 0.9,
    operatingNights: 365,
    operatingExpenseRatio: 45,
    capRate: 9 as number | '',
    siteTypes: [
      { id: '1', name: 'Back-in standard', width: 35, depth: 70, adr: 85, occupancy: 65, count: 250, devCost: 25000 },
      { id: '2', name: 'Back-in deluxe', width: 40, depth: 80, adr: 95, occupancy: 60, count: 120, devCost: 35000 },
      { id: '3', name: 'Pull-thru', width: 45, depth: 90, adr: 110, occupancy: 70, count: 55, devCost: 45000 },
    ] as SiteTypeConfig[],
  },
  goldenValley: {
    grossAcres: 40,
    usablePct: 70,
    roadWidth: 26,
    blockEfficiency: 0.85,
    operatingNights: 365,
    operatingExpenseRatio: 48,
    capRate: 10 as number | '',
    siteTypes: [
      { id: 'gv1', name: 'Back-in standard', width: 32, depth: 65, adr: 75, occupancy: 60, count: 220, devCost: 22000 },
      { id: 'gv2', name: 'Back-in deluxe', width: 35, depth: 70, adr: 85, occupancy: 55, count: 95, devCost: 30000 },
      { id: 'gv3', name: 'Pull-thru', width: 40, depth: 80, adr: 95, occupancy: 65, count: 45, devCost: 40000 },
    ] as SiteTypeConfig[],
  },
  bigRig: {
    grossAcres: 60,
    usablePct: 72,
    roadWidth: 28,
    blockEfficiency: 0.88,
    operatingNights: 365,
    operatingExpenseRatio: 42,
    capRate: 8 as number | '',
    siteTypes: [
      { id: 'br1', name: 'Back-in standard', width: 35, depth: 70, adr: 85, occupancy: 65, count: 100, devCost: 25000 },
      { id: 'br2', name: 'Pull-thru standard', width: 45, depth: 90, adr: 110, occupancy: 70, count: 180, devCost: 45000 },
      { id: 'br3', name: 'Pull-thru premium', width: 50, depth: 100, adr: 130, occupancy: 72, count: 70, devCost: 55000 },
    ] as SiteTypeConfig[],
  },
};

const EMPTY_STATE = {
  grossAcres: '' as number | '',
  usablePct: '' as number | '',
  roadWidth: '' as number | '',
  blockEfficiency: '' as number | '',
  operatingNights: '' as number | '',
  operatingExpenseRatio: '' as number | '',
  capRate: '' as number | '',
  autoFillRemainingLand: true,
  siteTypes: [] as SiteTypeConfig[],
};

export default function SiteDesignClient() {
  const t = useTranslations('siteDesign');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlWriteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef(true);

  const [grossAcres, setGrossAcres] = useState<number | ''>(EMPTY_STATE.grossAcres);
  const [usablePct, setUsablePct] = useState<number | ''>(EMPTY_STATE.usablePct);
  const [roadWidth, setRoadWidth] = useState<number | ''>(EMPTY_STATE.roadWidth);
  const [blockEfficiency, setBlockEfficiency] = useState<number | ''>(EMPTY_STATE.blockEfficiency);
  const [operatingNights, setOperatingNights] = useState<number | ''>(EMPTY_STATE.operatingNights);
  const [operatingExpenseRatio, setOperatingExpenseRatio] = useState<number | ''>(EMPTY_STATE.operatingExpenseRatio);
  const [capRate, setCapRate] = useState<number | ''>(EMPTY_STATE.capRate);
  const [autoFillRemainingLand, setAutoFillRemainingLand] = useState<boolean>(
    EMPTY_STATE.autoFillRemainingLand
  );
  const [siteTypes, setSiteTypes] = useState<SiteTypeConfig[]>(EMPTY_STATE.siteTypes);
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS | ''>('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareWarning, setShareWarning] = useState<string | null>(null);

  const results = useMemo(
    () =>
      computeResults(
        grossAcres === '' ? 0 : grossAcres,
        usablePct === '' ? 0 : usablePct,
        roadWidth === '' ? 18 : roadWidth,
        blockEfficiency === '' ? 0.9 : blockEfficiency,
        operatingNights === '' ? 365 : operatingNights,
        operatingExpenseRatio === '' ? 0 : operatingExpenseRatio,
        capRate === '' ? null : capRate,
        siteTypes,
        { autoFillRemainingLand }
      ),
    [
      grossAcres,
      usablePct,
      roadWidth,
      blockEfficiency,
      operatingNights,
      operatingExpenseRatio,
      capRate,
      siteTypes,
      autoFillRemainingLand,
    ]
  );

  const generateId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `site-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const addSiteType = () => {
    setSiteTypes((prev) => {
      const template = prev[0];
      const base = template
        ? {
            width: template.width,
            depth: template.depth,
            adr: template.adr,
            occupancy: template.occupancy,
            devCost: template.devCost,
          }
        : { width: 35, depth: 70, adr: 85, occupancy: 65, devCost: 25000 };
      return [
        ...prev,
        {
          id: generateId(),
          name: `Site type ${prev.length + 1}`,
          ...base,
          count: '' as const,
        },
      ];
    });
    setActivePreset('');
  };

  const removeSiteType = (id: string) => {
    setSiteTypes((prev) => prev.filter((s) => s.id !== id));
    setActivePreset('');
  };

  const updateSiteType = (id: string, field: keyof SiteTypeConfig, value: string | number) => {
    setSiteTypes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
    setActivePreset('');
  };

  const clearToEmpty = useCallback(() => {
    setGrossAcres(EMPTY_STATE.grossAcres);
    setUsablePct(EMPTY_STATE.usablePct);
    setRoadWidth(EMPTY_STATE.roadWidth);
    setBlockEfficiency(EMPTY_STATE.blockEfficiency);
    setOperatingNights(EMPTY_STATE.operatingNights);
    setOperatingExpenseRatio(EMPTY_STATE.operatingExpenseRatio);
    setCapRate(EMPTY_STATE.capRate);
    setAutoFillRemainingLand(EMPTY_STATE.autoFillRemainingLand);
    setSiteTypes(EMPTY_STATE.siteTypes);
    setShareWarning(null);
    setActivePreset('');
  }, []);

  const loadPreset = useCallback((key: keyof typeof PRESETS) => {
    const p = PRESETS[key];
    setGrossAcres(p.grossAcres);
    setUsablePct(p.usablePct);
    setRoadWidth(p.roadWidth);
    setBlockEfficiency(p.blockEfficiency);
    setOperatingNights(p.operatingNights);
    setOperatingExpenseRatio(p.operatingExpenseRatio);
    setCapRate(p.capRate);
    setAutoFillRemainingLand(true);
    setSiteTypes(p.siteTypes.map((s) => ({ ...s })));
    setShareWarning(null);
    setActivePreset(key);
  }, []);

  useEffect(() => {
    const preset = searchParams.get('preset')?.toLowerCase();
    if (preset === 'standard' || preset === 'goldenvalley' || preset === 'bigrig') {
      const key = preset === 'goldenvalley' ? 'goldenValley' : preset === 'bigrig' ? 'bigRig' : 'standard';
      loadPreset(key);
      isInitialMountRef.current = false;
      return;
    }
    const acres = searchParams.get('acres');
    const usable = searchParams.get('usable');
    const road = searchParams.get('road');
    const efficiency = searchParams.get('efficiency');
    const nights = searchParams.get('nights');
    const opex = searchParams.get('opex');
    const cap = searchParams.get('cap');
    const autoFill = searchParams.get('autofill');
    const sitesParam = searchParams.get('sites');

    const hasParams = acres || usable || road || efficiency || nights || opex || cap || autoFill || sitesParam;
    if (!hasParams) {
      isInitialMountRef.current = false;
      return;
    }

    if (acres) {
      const n = parseFloat(acres);
      if (!isNaN(n) && n >= 0) setGrossAcres(n);
    }
    if (usable) {
      const n = parseFloat(usable);
      if (!isNaN(n) && n >= 0 && n <= 100) setUsablePct(n);
    }
    if (road) {
      const n = parseFloat(road);
      if (!isNaN(n) && n >= 18 && n <= 40) setRoadWidth(n);
    }
    if (efficiency) {
      const n = parseFloat(efficiency);
      if (!isNaN(n) && n >= 0.7 && n <= 1) setBlockEfficiency(n);
    }
    if (nights) {
      const n = parseInt(nights, 10);
      if (!isNaN(n) && n >= 1 && n <= 365) setOperatingNights(n);
    }
    if (opex) {
      const n = parseFloat(opex);
      if (!isNaN(n) && n >= 0 && n <= 100) setOperatingExpenseRatio(n);
    }
    if (cap !== null && cap !== undefined) {
      if (cap === '') setCapRate('');
      else {
        const n = parseFloat(cap);
        if (!isNaN(n) && n >= 1 && n <= 20) setCapRate(n);
      }
    }
    if (autoFill === '0') {
      setAutoFillRemainingLand(false);
    } else if (autoFill === '1') {
      setAutoFillRemainingLand(true);
    }
    const parsedSites = parseSitesFromUrl(sitesParam);
    if (parsedSites && parsedSites.length > 0) {
      setSiteTypes(parsedSites);
      setActivePreset('');
    }
    isInitialMountRef.current = false;
  }, [searchParams, loadPreset]);

  useEffect(() => {
    if (isInitialMountRef.current) return;
    if (urlWriteTimeoutRef.current) clearTimeout(urlWriteTimeoutRef.current);
    urlWriteTimeoutRef.current = setTimeout(() => {
      const { params, didOmitSites } = buildSiteDesignUrlParams({
        activePreset,
        grossAcres,
        usablePct,
        roadWidth,
        blockEfficiency,
        operatingNights,
        operatingExpenseRatio,
        capRate,
        autoFillRemainingLand,
        siteTypes,
      });
      setShareWarning(didOmitSites ? t('shareWarningSitesOmitted') : null);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      urlWriteTimeoutRef.current = null;
    }, 300);
    return () => {
      if (urlWriteTimeoutRef.current) clearTimeout(urlWriteTimeoutRef.current);
    };
  }, [
    pathname,
    router,
    grossAcres,
    usablePct,
    roadWidth,
    blockEfficiency,
    operatingNights,
    operatingExpenseRatio,
    capRate,
    autoFillRemainingLand,
    siteTypes,
    activePreset,
    t,
  ]);

  const handleExport = useCallback(async () => {
    setExportError(null);
    setExporting(true);
    try {
      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default ?? xlsxModule;
      if (!XLSX?.utils) {
        throw new Error('xlsx library failed to load');
      }
      const { inputsRows, siteTypeRows, resultsRows, breakdownRows, fileName } =
        buildSiteDesignExportData({
          grossAcres,
          usablePct,
          roadWidth,
          blockEfficiency,
          operatingNights,
          operatingExpenseRatio,
          capRate,
          autoFillRemainingLand,
          siteTypes,
          results,
        });

      const wsInputs = XLSX.utils.json_to_sheet([...inputsRows, {}, ...siteTypeRows]);
      const wsResults = XLSX.utils.json_to_sheet([...resultsRows, {}, ...breakdownRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsInputs, 'Inputs');
      XLSX.utils.book_append_sheet(wb, wsResults, 'Results');
      XLSX.writeFile(wb, fileName);
    } catch {
      setExportError(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  }, [
    grossAcres,
    usablePct,
    roadWidth,
    blockEfficiency,
    operatingNights,
    operatingExpenseRatio,
    capRate,
    autoFillRemainingLand,
    siteTypes,
    results,
    t,
  ]);

  const resultsLiveRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (resultsLiveRef.current) {
      resultsLiveRef.current.textContent = t('resultsUpdated', {
        sites: results.totalSites,
        revenue: results.annualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      });
    }
  }, [results.totalSites, results.annualRevenue, t]);

  const validation = useMemo(() => ({
    grossAcres: grossAcres !== '' && grossAcres < 1,
    usablePct: usablePct !== '' && (usablePct < 0 || usablePct > 100),
    operatingNights: operatingNights !== '' && (operatingNights < 1 || operatingNights > 365),
    operatingExpenseRatio: operatingExpenseRatio !== '' && (operatingExpenseRatio < 0 || operatingExpenseRatio > 100),
    capRate: capRate !== '' && (capRate < 1 || capRate > 20),
  }), [grossAcres, usablePct, operatingNights, operatingExpenseRatio, capRate]);

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-2xl min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
                <LayoutGrid className="w-8 h-8 text-sage-500" aria-hidden />
                {t('title')}
              </h1>
              <p className="mt-1.5 text-base text-gray-600 dark:text-gray-400 max-w-xl">
                {t('subtitle')}
              </p>
              <Link
                href="/admin/rv-site-setup/methodology"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-sage-600 dark:text-sage-400 hover:underline"
              >
                <FileText className="w-4 h-4 shrink-0" />
                {t('viewMethodology')}
              </Link>
            </div>
            <div className="flex flex-nowrap items-center gap-2 shrink-0">
              <select
                value={activePreset}
                onChange={(e) => {
                  const v = e.target.value as keyof typeof PRESETS | '';
                  if (v) loadPreset(v);
                  else clearToEmpty();
                }}
                className="w-[10rem] pl-3 pr-5 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                aria-label={t('selectPreset')}
              >
                <option value="">{t('selectPreset')}</option>
                <option value="standard">{t('presetStandard')}</option>
                <option value="goldenValley">{t('presetGoldenValley')}</option>
                <option value="bigRig">{t('presetBigRig')}</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center whitespace-nowrap shrink-0 min-w-[7rem]"
              >
                <Download className="w-4 h-4 mr-2 shrink-0" />
                {exporting ? t('exporting') : t('export')}
              </Button>
            </div>
          </div>
        </header>

        {exportError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          >
            {exportError}
          </div>
        )}
        {shareWarning && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          >
            {shareWarning}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <Card className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('parcelAndRoad')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,10rem)_1fr] lg:grid-cols-[minmax(0,10rem)_1fr_1fr] gap-4 max-w-3xl">
              <Input
                type="number"
                label={t('grossAcreage')}
                min={1}
                max={1000}
                value={grossAcres === '' ? '' : grossAcres}
                error={validation.grossAcres ? t('validationGrossAcreage') : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setGrossAcres(v === '' ? '' : Math.max(0, parseFloat(v) || 0));
                  setActivePreset('');
                }}
              />
              <Input
                type="number"
                label={t('usablePercent')}
                min={0}
                max={100}
                step={1}
                value={usablePct === '' ? '' : usablePct}
                error={validation.usablePct ? t('validationUsablePercent') : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setUsablePct(v === '' ? '' : Math.max(0, Math.min(100, parseFloat(v) || 0)));
                  setActivePreset('');
                }}
              />
              <Input
                type="number"
                label={t('roadWidth')}
                tooltip={t('roadWidthHelp')}
                min={18}
                max={40}
                value={roadWidth === '' ? '' : roadWidth}
                onChange={(e) => {
                  const v = e.target.value;
                  setRoadWidth(v === '' ? '' : Math.max(18, Math.min(40, parseFloat(v) || 18)));
                  setActivePreset('');
                }}
              />
              <Input
                type="number"
                label={t('blockEfficiency')}
                tooltip={t('blockEfficiencyHelp')}
                min={0.7}
                max={1}
                step={0.05}
                value={blockEfficiency === '' ? '' : blockEfficiency}
                onChange={(e) => {
                  const v = e.target.value;
                  setBlockEfficiency(
                    v === '' ? '' : Math.max(0.7, Math.min(1, parseFloat(v) || 0.9))
                  );
                  setActivePreset('');
                }}
              />
              <Input
                type="number"
                label={t('operatingNights')}
                tooltip={t('operatingNightsHelp')}
                min={1}
                max={365}
                value={operatingNights === '' ? '' : operatingNights}
                error={validation.operatingNights ? t('validationOperatingNights') : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setOperatingNights(
                    v === '' ? '' : Math.max(1, Math.min(365, parseInt(v, 10) || 365))
                  );
                  setActivePreset('');
                }}
              />
              <Input
                type="number"
                label={t('operatingExpenseRatio')}
                tooltip={t('operatingExpenseRatioHelp')}
                min={0}
                max={100}
                value={operatingExpenseRatio === '' ? '' : operatingExpenseRatio}
                error={validation.operatingExpenseRatio ? t('validationOperatingExpenseRatio') : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setOperatingExpenseRatio(
                    v === '' ? '' : Math.max(0, Math.min(100, parseFloat(v) || 0))
                  );
                  setActivePreset('');
                }}
              />
              <Input
                type="number"
                label={t('capRate')}
                tooltip={t('capRateHelp')}
                min={1}
                max={20}
                step={0.5}
                placeholder="—"
                value={capRate === '' ? '' : capRate}
                error={validation.capRate ? t('validationCapRate') : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  setCapRate(
                    v === '' ? '' : Math.max(1, Math.min(20, parseFloat(v) || 1))
                  );
                  setActivePreset('');
                }}
              />
            </div>

            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pt-4">
              {t('siteTypes')}
            </h2>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={autoFillRemainingLand}
                onChange={(e) => {
                  setAutoFillRemainingLand(e.target.checked);
                  setActivePreset('');
                }}
                className="h-4 w-4 rounded border-gray-300 text-sage-600 focus:ring-sage-500 dark:border-gray-600 dark:bg-gray-900"
              />
              {t('autoFillRemainingLand')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              {t('autoFillRemainingLandHelp')}
            </p>
            <div className="space-y-4">
              {siteTypes.map((st) => (
                <div
                  key={st.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      label={t('siteType')}
                      value={st.name}
                      onChange={(e) => updateSiteType(st.id, 'name', e.target.value)}
                      className="flex-1"
                    />
                    {siteTypes.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSiteType(st.id)}
                        className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label={t('removeSiteType')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Input
                      type="number"
                      label={t('width')}
                      min={20}
                      max={60}
                      value={st.width}
                      onChange={(e) =>
                        updateSiteType(st.id, 'width', Math.max(0, parseFloat(e.target.value) || 0))
                      }
                    />
                    <Input
                      type="number"
                      label={t('depth')}
                      min={40}
                      max={120}
                      value={st.depth}
                      onChange={(e) =>
                        updateSiteType(st.id, 'depth', Math.max(0, parseFloat(e.target.value) || 0))
                      }
                    />
                    <Input
                      type="number"
                      label={t('adr')}
                      min={0}
                      value={st.adr}
                      onChange={(e) =>
                        updateSiteType(st.id, 'adr', Math.max(0, parseFloat(e.target.value) || 0))
                      }
                    />
                    <Input
                      type="number"
                      label={t('occupancy')}
                      min={0}
                      max={100}
                      value={st.occupancy}
                      error={(st.occupancy < 0 || st.occupancy > 100) ? t('validationOccupancy') : undefined}
                      onChange={(e) =>
                        updateSiteType(
                          st.id,
                          'occupancy',
                          Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        )
                      }
                    />
                    <Input
                      type="number"
                      label={t('count')}
                      tooltip={t('countHelp')}
                      min={0}
                      placeholder="—"
                      value={st.count === '' ? '' : st.count}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateSiteType(
                          st.id,
                          'count',
                          v === '' ? '' : Math.max(0, Math.round(parseFloat(v) || 0))
                        );
                      }}
                    />
                    <Input
                      type="number"
                      label={t('devCost')}
                      tooltip={t('devCostHelp')}
                      min={0}
                      value={st.devCost}
                      onChange={(e) =>
                        updateSiteType(
                          st.id,
                          'devCost',
                          Math.max(0, parseInt(String(e.target.value), 10) || 0)
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              <Button variant="secondary" onClick={addSiteType} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                {t('addSiteType')}
              </Button>
            </div>
          </Card>

          {/* Results */}
          <Card
            padding="sm"
            className="lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
            aria-live="polite"
            aria-atomic="true"
          >
            <div
              ref={resultsLiveRef}
              className="sr-only"
              aria-live="polite"
              aria-atomic="true"
            />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('results')}
            </h2>
            {results.overCapacity && (
              <div
                role="alert"
                className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm mb-3"
              >
                {t('overCapacityWarning', {
                  sqft: Math.round(results.overCapacitySqft).toLocaleString(),
                  acres: results.overCapacityAcres.toFixed(2),
                })}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-base">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('netUsableAcres')}</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">{results.netUsableAcres.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('totalSites')}</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {results.totalSites}
                  {(!results.hasCounts || results.hasPartialFill) && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                      {!results.hasCounts ? t('autoFilledHint') : t('partialFillHint')}
                    </span>
                  )}
                </dd>
              </div>
              {!results.hasCounts && results.bestTypeName && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('autoFilledExplanation')}
                    {results.bestTypeRevenuePerSqFt != null && (
                      <span className="block mt-1 font-medium text-gray-700 dark:text-gray-300">
                        {results.bestTypeName}: ${results.bestTypeRevenuePerSqFt.toFixed(2)} {t('revenuePerSqFt')}
                      </span>
                    )}
                  </p>
                </div>
              )}
              {results.hasPartialFill && results.partialFillTypeName && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('partialFillExplanation')}
                    <span className="block mt-1 font-medium text-gray-700 dark:text-gray-300">
                      {t('partialFillType')}: {results.partialFillTypeName}
                    </span>
                  </p>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('annualRevenue')}</dt>
                <dd className="text-lg font-semibold text-sage-600 dark:text-sage-400">
                  ${results.annualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('revenuePerAcre')}</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ${results.revenuePerAcre.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('landUsed')}</dt>
                <dd className="text-base font-medium text-gray-700 dark:text-gray-300">
                  {t('landUsedFormat', {
                    used: (results.totalLandUsed / SQFT_PER_ACRE).toFixed(2),
                    available: (results.usableForSites / SQFT_PER_ACRE).toFixed(2),
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('noi')}</dt>
                <dd className="text-lg font-semibold text-sage-600 dark:text-sage-400">
                  ${results.noi.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('noiPerAcre')}</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ${results.noiPerAcre.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('totalDevCost')}</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ${results.totalDevCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </dd>
              </div>
              {results.estimatedValue != null && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('estimatedValue')}</dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    ${results.estimatedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </dd>
                </div>
              )}
            </dl>

            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('siteMixBreakdown')}
              </h3>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {results.siteCountBreakdown
                  .filter((b) => b.count > 0)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">{b.name}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('sitesCount', { count: b.count })}
                        {b.isAutoFilled && (
                          <span className="ml-1.5 text-xs text-sage-600 dark:text-sage-400">
                            ({t('autoFilled')})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('perSiteType')}
              </h3>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {results.siteCalcs.map((sc) => {
                  const breakdown = results.siteCountBreakdown.find((b) => b.id === sc.id);
                  const displayCount = breakdown?.count ?? 0;
                  return (
                    <div
                      key={sc.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">{sc.name}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {Math.round(sc.effectiveSqftPerSite).toLocaleString()} sq ft
                        {displayCount > 0 && ` · ${t('sitesCount', { count: displayCount })}`}
                        {displayCount === 0 && ` · Max ${sc.maxSites}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
