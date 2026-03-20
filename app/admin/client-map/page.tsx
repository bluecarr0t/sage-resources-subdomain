'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GoogleMapsProvider, useGoogleMaps } from '@/components/GoogleMapsProvider';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';
import { Button } from '@/components/ui';
import MultiSelect from '@/components/MultiSelect';
import { canonicalReportService, reportServiceLabel } from '@/lib/report-service-display';

interface ReportMarker {
  id: string;
  studyId: string | null;
  propertyName: string;
  reportNumber: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  marketType: string | null;
  reportYear: string | null;
  totalSites: string | number;
  dropboxLink: string;
  status: string;
  hasExactCoordinates: boolean;
  clientName?: string | null;
  clientCompany?: string | null;
  service: string | null;
  hasDocx: boolean;
  hasXlsx: boolean;
}

const RESORT_TYPE_OPTIONS = [
  { value: 'glamping', label: 'Glamping Only' },
  { value: 'rv', label: 'RV Only' },
  { value: 'rv_glamping', label: 'Glamping & RV' },
];

const MAP_HEIGHT_PX = 550;

const mapContainerStyle = {
  width: '100%',
  height: `${MAP_HEIGHT_PX}px`,
};

/** Geographic center of the contiguous US (lower 48); default overview when not focusing a job. */
const CONTIGUOUS_US_CENTER = { lat: 39.8283, lng: -98.5795 };
/** Frames the lower 48 with moderate padding in a typical admin map (~550px tall). */
const CONTIGUOUS_US_OVERVIEW_ZOOM = 4;

function ClientMapContent() {
  const t = useTranslations('admin.clientMap');
  const { isLoaded, loadError } = useGoogleMaps();
  const searchParams = useSearchParams();
  const studyIdParam = searchParams.get('studyId');
  const [reports, setReports] = useState<ReportMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportMarker | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [resortTypeFilter, setResortTypeFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);

  const resortTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reports) {
      const m = (r.marketType || '').toLowerCase();
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    return RESORT_TYPE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      count: counts.get(opt.value) ?? 0,
    }));
  }, [reports]);

  const yearOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reports) {
      const y = r.reportYear?.trim();
      if (!y) continue;
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, count]) => ({ value: year, label: year, count }));
  }, [reports]);

  const serviceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reports) {
      const c = canonicalReportService(r.service) ?? '';
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const notSet = t('serviceNotSet');
    return Array.from(counts.entries())
      .sort(([keyA, countA], [keyB, countB]) => {
        if (countB !== countA) return countB - countA;
        return reportServiceLabel(keyA || null, notSet).localeCompare(
          reportServiceLabel(keyB || null, notSet)
        );
      })
      .map(([k, count]) => ({
        value: k,
        label: reportServiceLabel(k || null, notSet),
        count,
      }));
  }, [reports, t]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (resortTypeFilter.length > 0 && !resortTypeFilter.includes(r.marketType || '')) return false;
      if (yearFilter.length > 0 && !yearFilter.includes(r.reportYear || '')) return false;
      if (serviceFilter.length > 0) {
        const key = canonicalReportService(r.service) ?? '';
        if (!serviceFilter.includes(key)) return false;
      }
      return true;
    });
  }, [reports, resortTypeFilter, yearFilter, serviceFilter]);

  const reportToFocus = useMemo(
    () =>
      studyIdParam
        ? reports.find((r) => r.studyId?.toUpperCase() === studyIdParam.toUpperCase()) ?? null
        : null,
    [reports, studyIdParam]
  );

  const reportsToShow = useMemo(() => {
    const ids = new Set(filteredReports.map((r) => r.id));
    if (reportToFocus && !ids.has(reportToFocus.id)) {
      return [reportToFocus, ...filteredReports];
    }
    return filteredReports;
  }, [filteredReports, reportToFocus]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/admin/client-map/reports');
        const data = await res.json();
        if (data.success && data.reports) {
          setReports(data.reports);
        }
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  /** Collapse legacy filter tokens (e.g. "feasibility study") to canonical keys so checkboxes match options. */
  useEffect(() => {
    if (reports.length === 0) return;
    setServiceFilter((prev) => {
      if (prev.length === 0) return prev;
      const next = [...new Set(prev.map((v) => (v === '' ? '' : canonicalReportService(v) ?? v)))];
      return next.length === prev.length && next.every((x, i) => x === prev[i]) ? prev : next;
    });
  }, [reports]);

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
    },
    []
  );

  /** Pan to marker when opening its InfoWindow; keep current zoom (no jump to street level). */
  const focusMapOnReport = useCallback(
    (report: ReportMarker) => {
      if (!map) return;
      map.panTo({ lat: report.lat, lng: report.lng });
    },
    [map]
  );

  const handleMarkerClick = useCallback(
    (report: ReportMarker) => {
      setSelectedReport(report);
      focusMapOnReport(report);
    },
    [focusMapOnReport]
  );

  useEffect(() => {
    if (map && reportToFocus) {
      setSelectedReport(reportToFocus);
      map.panTo({ lat: reportToFocus.lat, lng: reportToFocus.lng });
      map.setZoom(12);
    }
  }, [map, reportToFocus]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{ height: MAP_HEIGHT_PX }}
      >
        <span className="text-gray-500 dark:text-gray-400">Loading reports...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 dark:bg-red-900/30 rounded-lg"
        style={{ height: MAP_HEIGHT_PX }}
      >
        <span className="text-red-600 dark:text-red-400">Failed to load map. Check Google Maps API key.</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{ height: MAP_HEIGHT_PX }}
      >
        <span className="text-gray-500 dark:text-gray-400">Loading map...</span>
      </div>
    );
  }

  const hasActiveFilters =
    resortTypeFilter.length > 0 || yearFilter.length > 0 || serviceFilter.length > 0;
  const clearFilters = () => {
    setResortTypeFilter([]);
    setYearFilter([]);
    setServiceFilter([]);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="min-w-[200px]">
          <MultiSelect
            id="resort-type-filter"
            label="Resort Type"
            placeholder="All types"
            options={resortTypeOptions}
            selectedValues={resortTypeFilter}
            onToggle={(v) =>
              setResortTypeFilter((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
              )
            }
            onClear={() => setResortTypeFilter([])}
            activeColor="indigo"
          />
        </div>
        <div className="min-w-[200px]">
          <MultiSelect
            id="year-filter"
            label={t('yearFilterLabel')}
            placeholder={t('yearFilterPlaceholder')}
            options={yearOptions}
            selectedValues={yearFilter}
            onToggle={(v) =>
              setYearFilter((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
              )
            }
            onClear={() => setYearFilter([])}
            activeColor="blue"
          />
        </div>
        <div className="min-w-[280px]">
          <MultiSelect
            id="service-filter"
            label={t('serviceFilterLabel')}
            placeholder={t('serviceFilterPlaceholder')}
            options={serviceOptions}
            selectedValues={serviceFilter}
            onToggle={(v) =>
              setServiceFilter((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
              )
            }
            onClear={() => setServiceFilter([])}
            activeColor="orange"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
        <div className="ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 self-center">
          {hasActiveFilters ? (
            <span>
              <span id="filtered-marker-count">{reportsToShow.length}</span> of{' '}
              <span id="total-marker-count">{reports.length}</span> markers
            </span>
          ) : (
            <span>
              <span id="total-marker-count">{reports.length}</span> markers on map
            </span>
          )}
        </div>
      </div>

      <div className="w-full">
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={
              reportToFocus
                ? { lat: reportToFocus.lat, lng: reportToFocus.lng }
                : CONTIGUOUS_US_CENTER
            }
            zoom={
              reportToFocus ? 12 : CONTIGUOUS_US_OVERVIEW_ZOOM
            }
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {reportsToShow.map((report) => (
              <Marker
                key={report.id}
                position={{ lat: report.lat, lng: report.lng }}
                onClick={() => handleMarkerClick(report)}
                title={report.propertyName}
              >
                {/* Anchor InfoWindow to this marker only — avoids Google/React desync from a standalone InfoWindow */}
                {selectedReport?.id === report.id && (
                  <InfoWindow
                    key={report.id}
                    onCloseClick={() => setSelectedReport(null)}
                  >
                    <div className="p-2 min-w-[200px]">
                      {!(report.hasDocx ?? false) && !(report.hasXlsx ?? false) && (
                        <span className="inline-flex w-fit items-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white mb-1">
                          {t('noReportFilesPill')}
                        </span>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {report.propertyName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">{report.reportNumber}</p>
                      <p className="text-sm text-gray-500 mb-2">{report.address}</p>
                      <p className="text-sm text-gray-500 mb-2">
                        {report.type} • {report.totalSites} sites
                      </p>
                      {!report.hasExactCoordinates && (
                        <p className="text-xs text-amber-600 mb-2">{t('approximatePinNotice')}</p>
                      )}
                      <div className="flex flex-col gap-1">
                        {report.studyId && (
                          <Link
                            href={`/admin/reports/${report.studyId}`}
                            className="text-sm text-[#4a624a] hover:underline font-medium"
                          >
                            View Details
                          </Link>
                        )}
                        {report.dropboxLink && report.dropboxLink !== '#' && (
                          <a
                            href={report.dropboxLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#4a624a] hover:underline"
                          >
                            View Report (Dropbox)
                          </a>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
}

export default function ClientMapPage() {
  return (
    <main className="pb-2 sm:pb-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Client Map
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive map of your feasibility study reports
          </p>
        </div>

        <GoogleMapsProvider>
          <ClientMapContent />
        </GoogleMapsProvider>
      </div>
    </main>
  );
}
