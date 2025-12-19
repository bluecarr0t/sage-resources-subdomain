'use client';

import { useMapContext } from '@/components/MapContext';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import MapLoading from './MapLoading';

// Dynamically import Google Maps component for sidebar (no loading animation)
const DynamicGooglePropertyMapSidebar = dynamic(() => import('@/components/GooglePropertyMap'), {
  ssr: false,
  loading: () => null, // No loading animation in sidebar
});

// Dynamically import Google Maps component for map (with loading animation)
const DynamicGooglePropertyMap = dynamic(() => import('@/components/GooglePropertyMap'), {
  ssr: false,
  loading: () => <MapLoading />,
});

// Dynamically import LocationSearch component
const DynamicLocationSearch = dynamic(() => import('@/components/LocationSearch'), {
  ssr: false,
  loading: () => null, // No loading animation
});

interface MapLayoutProps {
  locale: string;
}

export default function MapLayout({ locale }: MapLayoutProps) {
  const { isFullscreen, toggleFullscreen } = useMapContext();
  const t = useTranslations('map');
  const tCommon = useTranslations('common');

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
      {/* Left Sidebar - Hidden on mobile when fullscreen */}
      <aside 
        className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shadow-sm relative z-20 md:max-h-screen transition-transform duration-300 ${
          isFullscreen ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-1.5 text-sm text-gray-600">
              <li>
                <Link
                  href={`/${locale}`}
                  className="hover:text-gray-900 transition-colors"
                >
                  {tCommon('navigation.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium" aria-current="page">
                {tCommon('navigation.map')}
              </li>
            </ol>
          </nav>
          
          {/* SEO Content Section */}
          <section className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('title')}
            </h1>
          </section>
          
          {/* Location Search Section */}
          <section className="mb-0">
            <DynamicLocationSearch locale={locale} variant="compact" />
          </section>
        </div>
        
        {/* Filters Section */}
        <section className="pt-2 pb-4 px-4 md:pt-0 md:pb-6 md:px-6 space-y-6 flex-1 relative overflow-visible md:overflow-y-auto">
          <DynamicGooglePropertyMapSidebar showMap={false} />
        </section>
        
        {/* Footer */}
        <div className="py-2 px-4 border-t border-gray-200 mt-auto">
          <p className="text-xs text-gray-500 text-center">
            {t('poweredBy')}{' '}
            <a
              href="https://sageoutdooradvisory.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 underline transition-colors"
            >
              {tCommon('siteName')}
            </a>
          </p>
        </div>
      </aside>

      {/* Right Column - Map (Full Height) */}
      <main 
        className={`flex-1 relative overflow-hidden ${
          isFullscreen 
            ? 'min-h-screen h-screen' 
            : 'md:min-h-screen md:h-screen'
        }`}
        style={isFullscreen 
          ? { 
              minHeight: '100vh', 
              height: '100vh',
              width: '100%',
              aspectRatio: '16/9' // Prevent layout shift
            } 
          : {
              width: '100%',
              aspectRatio: '16/9' // Prevent layout shift
            }
        }
      >
        <DynamicGooglePropertyMap showMap={true} />
        
        {/* Fullscreen Toggle Button - Mobile Only */}
        <button
          onClick={toggleFullscreen}
          className="md:hidden absolute top-4 right-4 z-30 bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-lg shadow-lg border border-gray-200 transition-colors"
          aria-label={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
          title={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
        >
          {isFullscreen ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          )}
        </button>
      </main>
    </div>
  );
}
