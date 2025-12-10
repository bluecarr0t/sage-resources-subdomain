'use client';

import dynamic from 'next/dynamic';
import GoogleSheetMap from '@/components/GoogleSheetMap';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import { useSearchParams } from 'next/navigation';

// Dynamically import to prevent SSR issues
const DynamicGoogleSheetMap = dynamic(() => Promise.resolve(GoogleSheetMap), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

interface PageProps {
  params: {
    sheetId: string;
  };
}

export default function GoogleSheetMapPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const { sheetId } = params;
  const sheetName = searchParams.get('sheetName') || undefined;
  const mapTitle = searchParams.get('title') || 'Property Map';
  const mapDescription = searchParams.get('description') || 'Explore locations on the map. Click on markers to view details.';

  return (
    <GoogleMapsProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {mapTitle}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {mapDescription}
              </p>
            </div>
            <DynamicGoogleSheetMap
              sheetId={sheetId}
              sheetName={sheetName}
              mapTitle={mapTitle}
              mapDescription={mapDescription}
            />
          </div>
        </div>
      </div>
    </GoogleMapsProvider>
  );
}

