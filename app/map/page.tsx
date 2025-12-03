'use client';

import dynamic from 'next/dynamic';
import { MapProvider } from '@/components/MapContext';
import GooglePropertyMap from '@/components/GooglePropertyMap';

// Dynamically import Google Maps component to prevent SSR issues
const DynamicGooglePropertyMap = dynamic(() => Promise.resolve(GooglePropertyMap), {
  ssr: false,
  loading: () => null, // No loading state - let the component handle it
});

export default function MapPage() {
  return (
    <MapProvider>
      <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
        {/* Left Sidebar - Narrow Column */}
        <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shadow-sm relative z-20">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <a
              href="https://sageoutdooradvisory.com/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
            >
              <svg
                className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Site</span>
            </a>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Glamping Properties
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Explore properties across the United States and Canada. Click on markers to view property details.
            </p>
          </div>
          
          {/* Filters Section */}
          <div className="p-6 space-y-6 flex-1 relative overflow-visible">
            <DynamicGooglePropertyMap showMap={false} />
          </div>
        </aside>

        {/* Right Column - Map (Full Height) */}
        <main className="flex-1 relative overflow-hidden">
          <DynamicGooglePropertyMap showMap={true} />
        </main>
      </div>
    </MapProvider>
  );
}

