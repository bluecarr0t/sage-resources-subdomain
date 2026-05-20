'use client';

import { useMapContext } from '@/components/MapContext';
import {
  EDITORIAL_H1_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_SIDEBAR_BG_STYLE,
} from '@/components/editorial/EditorialPageShell';
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
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100/40 md:flex-row">
      {/* Left Sidebar - Hidden on mobile when fullscreen */}
      <aside
        className={`relative z-20 flex w-full flex-col overflow-y-auto border-r border-sage-200/80 text-neutral-900 transition-transform duration-300 md:max-h-screen md:w-80 lg:w-96 ${
          isFullscreen ? 'hidden md:flex' : 'flex'
        }`}
        style={EDITORIAL_SIDEBAR_BG_STYLE}
      >
        <div className="border-b border-sage-200/80 px-4 pb-3 pt-4 md:px-5 md:pt-5">
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex items-center text-[11px] font-light uppercase tracking-widest text-neutral-500">
              <li>
                <Link href={`/${locale}`} className="transition-colors hover:text-neutral-900">
                  {tCommon('navigation.home')}
                </Link>
              </li>
              <li aria-hidden="true" className="mx-2 text-neutral-400">
                /
              </li>
              <li className="text-neutral-700" aria-current="page">
                {tCommon('navigation.map')}
              </li>
            </ol>
          </nav>

          <section className="mb-4">
            <h1 className={EDITORIAL_H1_CLASS}>{t('title')}</h1>
          </section>

          <section>
            <DynamicLocationSearch locale={locale} variant="editorial" />
          </section>
        </div>

        <section className="relative flex-1 overflow-visible px-4 pb-4 pt-2 md:overflow-y-auto md:px-5 md:pb-5">
          <DynamicGooglePropertyMapSidebar showMap={false} />
        </section>

        <div className="mt-auto border-t border-sage-200/80 px-4 py-4 md:px-5">
          <p className="text-center text-xs font-light leading-relaxed text-neutral-500">
            {t('poweredBy')}{' '}
            <a
              href="https://sageoutdooradvisory.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={EDITORIAL_LINK_CLASS}
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
