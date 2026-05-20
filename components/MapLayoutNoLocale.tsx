'use client';

import { useMapContext } from '@/components/MapContext';
import {
  EDITORIAL_H1_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_SIDEBAR_BG_STYLE,
} from '@/components/editorial/EditorialPageShell';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import MapLoading from './MapLoading';

const DynamicGooglePropertyMapSidebar = dynamic(() => import('@/components/GooglePropertyMap'), {
  ssr: false,
  loading: () => null,
});

const DynamicGooglePropertyMap = dynamic(() => import('@/components/GooglePropertyMap'), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function MapLayoutNoLocale() {
  const { isFullscreen, toggleFullscreen } = useMapContext();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100/40 md:flex-row">
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
                <Link href="/" className="transition-colors hover:text-neutral-900">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="mx-2 text-neutral-400">
                /
              </li>
              <li className="text-neutral-700" aria-current="page">
                Map
              </li>
            </ol>
          </nav>

          <section>
            <h1 className={EDITORIAL_H1_CLASS}>Glamping Properties Map</h1>
          </section>
        </div>

        <section className="relative flex-1 overflow-visible px-4 pb-4 pt-2 md:overflow-y-auto md:px-5 md:pb-5">
          <DynamicGooglePropertyMapSidebar showMap={false} />
        </section>

        <div className="mt-auto border-t border-sage-200/80 px-4 py-4 md:px-5">
          <p className="text-center text-xs font-light leading-relaxed text-neutral-500">
            Powered by{' '}
            <a
              href="https://sageoutdooradvisory.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={EDITORIAL_LINK_CLASS}
            >
              Sage Outdoor Advisory
            </a>
          </p>
        </div>
      </aside>

      <main
        className={`relative flex-1 overflow-hidden ${
          isFullscreen ? 'min-h-screen h-screen' : 'md:min-h-screen md:h-screen'
        }`}
        style={isFullscreen ? { minHeight: '100vh', height: '100vh' } : undefined}
      >
        <DynamicGooglePropertyMap showMap={true} />

        <button
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 z-30 rounded-lg border border-neutral-200 bg-white/90 p-3 text-neutral-700 shadow-md transition-colors hover:bg-white md:hidden"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
