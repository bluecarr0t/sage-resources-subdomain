'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GoogleMapsProvider, useGoogleMaps } from '@/components/GoogleMapsProvider';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Button } from '@/components/ui';
import MultiSelect from '@/components/MultiSelect';

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
  unitTypes: string[];
  totalSites: string | number;
  dropboxLink: string;
  status: string;
  hasExactCoordinates: boolean;
  clientName?: string | null;
  clientCompany?: string | null;
}

const RESORT_TYPE_OPTIONS = [
  { value: 'glamping', label: 'Glamping Only' },
  { value: 'rv', label: 'RV Only' },
  { value: 'rv_glamping', label: 'Glamping & RV' },
];

const UNIT_TYPE_OPTIONS = [
  'Treehouse',
  'Dome',
  'Cabin',
  'RV Site',
  'Lodge',
  'Safari Tent',
  'Yurt',
  'Tiny Home',
  'A-Frame',
  'Glamping Pod',
  'Vintage Trailer',
  'Bell Tent',
];

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = { lat: 39.8283, lng: -98.5795 };

function ClientMapContent() {
  const { isLoaded, loadError } = useGoogleMaps();
  const searchParams = useSearchParams();
  const studyIdParam = searchParams.get('studyId');
  const [reports, setReports] = useState<ReportMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportMarker | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [resortTypeFilter, setResortTypeFilter] = useState<string[]>([]);
  const [unitTypeFilter, setUnitTypeFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>([]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const r of reports) {
      const y = r.reportYear?.trim();
      if (y) years.add(y);
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (resortTypeFilter.length > 0 && !resortTypeFilter.includes(r.marketType || '')) return false;
      if (unitTypeFilter.length > 0) {
        const reportUnitTypes = (r.unitTypes || []).map((u) => u.toLowerCase().trim());
        const filterSet = new Set(unitTypeFilter.map((f) => f.toLowerCase()));
        const hasMatch = reportUnitTypes.some((u) => filterSet.has(u));
        if (!hasMatch) return false;
      }
      if (yearFilter.length > 0 && !yearFilter.includes(r.reportYear || '')) return false;
      return true;
    });
  }, [reports, resortTypeFilter, unitTypeFilter, yearFilter]);

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

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
    },
    []
  );

  useEffect(() => {
    if (map && reportToFocus) {
      map.panTo({ lat: reportToFocus.lat, lng: reportToFocus.lng });
      map.setZoom(12);
      setSelectedReport(reportToFocus);
    }
  }, [map, reportToFocus]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-gray-500 dark:text-gray-400">Loading reports...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-red-50 dark:bg-red-900/30 rounded-lg">
        <span className="text-red-600 dark:text-red-400">Failed to load map. Check Google Maps API key.</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-gray-500 dark:text-gray-400">Loading map...</span>
      </div>
    );
  }

  const hasActiveFilters = resortTypeFilter.length > 0 || unitTypeFilter.length > 0 || yearFilter.length > 0;
  const clearFilters = () => {
    setResortTypeFilter([]);
    setUnitTypeFilter([]);
    setYearFilter([]);
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
            options={RESORT_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
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
            id="unit-type-filter"
            label="Unit Type"
            placeholder="All unit types"
            options={UNIT_TYPE_OPTIONS.map((ut) => ({ value: ut, label: ut }))}
            selectedValues={unitTypeFilter}
            onToggle={(v) =>
              setUnitTypeFilter((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
              )
            }
            onClear={() => setUnitTypeFilter([])}
            activeColor="green"
          />
        </div>
        <div className="min-w-[200px]">
          <MultiSelect
            id="year-filter"
            label="Year Report Completed"
            placeholder="All years"
            options={yearOptions.map((y) => ({ value: y, label: y }))}
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
                : reportsToShow.length > 0
                  ? { lat: reportsToShow[0].lat, lng: reportsToShow[0].lng }
                  : defaultCenter
            }
            zoom={reportToFocus ? 12 : reportsToShow.length > 0 ? 4 : 3}
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {reportsToShow.map((report) => (
              <Marker
                key={report.id}
                position={{ lat: report.lat, lng: report.lng }}
                onClick={() => setSelectedReport(report)}
                title={report.propertyName}
              />
            ))}

            {selectedReport && (
              <InfoWindow
                position={{ lat: selectedReport.lat, lng: selectedReport.lng }}
                onCloseClick={() => setSelectedReport(null)}
              >
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {selectedReport.propertyName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {selectedReport.reportNumber}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    {selectedReport.address}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {selectedReport.type} • {selectedReport.totalSites} sites
                  </p>
                  {!selectedReport.hasExactCoordinates && (
                    <p className="text-xs text-amber-600 mb-2">
                      Approximate location (state center)
                    </p>
                  )}
                  <div className="flex flex-col gap-1">
                    {selectedReport.studyId && (
                      <Link
                        href={`/admin/reports/${selectedReport.studyId}`}
                        className="text-sm text-[#4a624a] hover:underline font-medium"
                      >
                        View Details
                      </Link>
                    )}
                    {selectedReport.dropboxLink && selectedReport.dropboxLink !== '#' && (
                      <a
                        href={selectedReport.dropboxLink}
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
          </GoogleMap>
        </div>
      </div>
    </div>
  );
}

export default function ClientMapPage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
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
