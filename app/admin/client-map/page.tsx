'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoogleMapsProvider, useGoogleMaps } from '@/components/GoogleMapsProvider';
import { Card } from '@/components/ui';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

interface ReportMarker {
  id: string;
  propertyName: string;
  reportNumber: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  totalSites: string | number;
  dropboxLink: string;
  status: string;
  hasExactCoordinates: boolean;
  clientName?: string | null;
  clientCompany?: string | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = { lat: 39.8283, lng: -98.5795 };

function ClientMapContent() {
  const { isLoaded, loadError } = useGoogleMaps();
  const [reports, setReports] = useState<ReportMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportMarker | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

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

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

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

  return (
    <div className="space-y-4">
      <Card padding="sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Client Reports Map
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {reports.length} report{reports.length !== 1 ? 's' : ''} with location
          data
        </p>
      </Card>

      <div className="w-full">
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={
              reports.length > 0
                ? { lat: reports[0].lat, lng: reports[0].lng }
                : defaultCenter
            }
            zoom={reports.length > 0 ? 4 : 3}
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {reports.map((report) => (
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
                  {selectedReport.dropboxLink && selectedReport.dropboxLink !== '#' && (
                    <a
                      href={selectedReport.dropboxLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#4a624a] hover:underline"
                    >
                      View Report
                    </a>
                  )}
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
