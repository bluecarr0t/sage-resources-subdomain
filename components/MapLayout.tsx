'use client';

import { useMemo, useState } from 'react';
import { useMapContext } from '@/components/MapContext';
import { createLocaleLinks } from '@/lib/locale-links';
import {
  EDITORIAL_MAP_SIDEBAR_H1_CLASS,
  EDITORIAL_LINK_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import MapLoading from './MapLoading';
import MapEmbedOpenFullLink from '@/components/map/MapEmbedOpenFullLink';

// Single dynamic import — one Maps bundle for sidebar + main (avoids double download)
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
  /** Override sidebar H1 (state/city hub pages) */
  pageTitle?: string;
  /** SEO intro copy for state hub pages */
  hubIntro?: string;
  hubIntroSecondary?: string;
}

export default function MapLayout({
  locale,
  pageTitle,
  hubIntro,
  hubIntroSecondary,
}: MapLayoutProps) {
  const { isFullscreen, toggleFullscreen, clientWorkOnly, embedMode } = useMapContext();
  const [embedPanelOpen, setEmbedPanelOpen] = useState(false);
  const t = useTranslations('map');
  const mapTitle = pageTitle ?? (clientWorkOnly ? t('layers.clientWork.label') : t('title'));
  const tCommon = useTranslations('common');
  const links = useMemo(() => createLocaleLinks(locale), [locale]);

  const rootHeightClass = embedMode ? 'h-full min-h-[480px]' : 'h-screen';

  const filterPanel = (
    <>
      <div className="border-b border-sage-200/80 px-4 pb-3 pt-4 md:px-5 md:pt-5">
        {embedMode ? (
          <div className="mb-3 flex items-start justify-between gap-2">
            <h1 className={EDITORIAL_MAP_SIDEBAR_H1_CLASS}>{mapTitle}</h1>
            <button
              type="button"
              onClick={() => setEmbedPanelOpen(false)}
              className="shrink-0 rounded-md border border-neutral-200 bg-white/90 px-2 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-white"
              aria-label={t('embed.closeFilters')}
            >
              {t('embed.closeFilters')}
            </button>
          </div>
        ) : (
          <>
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
              <h1 className={EDITORIAL_MAP_SIDEBAR_H1_CLASS}>{mapTitle}</h1>
              {hubIntro ? (
                <p className="mt-4 text-xs font-light leading-relaxed text-neutral-600">{hubIntro}</p>
              ) : null}
              {hubIntroSecondary ? (
                <p className="mt-3 text-[11px] font-light leading-relaxed text-neutral-500">
                  {hubIntroSecondary}
                </p>
              ) : null}
              {hubIntro ? (
                <p className="mt-4 text-[11px] font-light leading-relaxed">
                  <Link
                    href={links.guide('feasibility-studies-complete-guide')}
                    className={EDITORIAL_LINK_CLASS}
                  >
                    {t('hubFeasibilityLink')}
                  </Link>
                  <span className="text-neutral-400"> · </span>
                  <Link
                    href={links.glossaryTerm('feasibility-study')}
                    className={EDITORIAL_LINK_CLASS}
                  >
                    {t('hubGlossaryLink')}
                  </Link>
                </p>
              ) : null}
            </section>
          </>
        )}
        {!clientWorkOnly ? (
          <section>
            <DynamicLocationSearch locale={locale} variant="editorial" />
          </section>
        ) : null}
      </div>

      <section className="relative flex-1 overflow-visible px-4 pb-4 pt-2 md:overflow-y-auto md:px-5 md:pb-5">
        <DynamicGooglePropertyMap showMap={false} />
      </section>

      {!embedMode ? (
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
      ) : null}
    </>
  );

  return (
    <div
      className={`relative flex ${rootHeightClass} flex-col overflow-hidden bg-neutral-100/40 md:flex-row`}
    >
      {embedMode && embedPanelOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-neutral-900/30"
          aria-label={t('embed.closeFilters')}
          onClick={() => setEmbedPanelOpen(false)}
        />
      ) : null}

      {embedMode ? (
        <aside
          id="map-embed-filters"
          className={`fixed inset-y-0 left-0 z-40 flex w-[min(100%,20rem)] flex-col overflow-y-auto border-r border-sage-200/80 bg-[#faf9f3] text-neutral-900 shadow-xl transition-transform duration-300 md:w-80 lg:w-96 ${
            embedPanelOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
          aria-hidden={!embedPanelOpen}
        >
          {filterPanel}
        </aside>
      ) : (
        <aside
          className={`relative z-20 flex w-full flex-col overflow-y-auto border-r border-sage-200/80 bg-[#faf9f3] text-neutral-900 transition-transform duration-300 md:max-h-screen md:w-80 lg:w-96 ${
            isFullscreen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {filterPanel}
        </aside>
      )}

      <main
        className={`relative flex-1 overflow-hidden ${
          embedMode || isFullscreen ? 'min-h-0 h-full' : 'md:min-h-screen md:h-screen'
        }`}
        style={
          embedMode
            ? { width: '100%', height: '100%', minHeight: '100%' }
            : isFullscreen
              ? {
                  minHeight: '100vh',
                  height: '100vh',
                  width: '100%',
                  aspectRatio: '16/9',
                }
              : {
                  width: '100%',
                  aspectRatio: '16/9',
                }
        }
      >
        <DynamicGooglePropertyMap showMap={true} />

        {embedMode ? (
          <>
            <button
              type="button"
              onClick={() => setEmbedPanelOpen(true)}
              className="absolute left-4 top-4 z-30 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 text-sm font-medium text-neutral-800 shadow-md transition-colors hover:bg-white"
              aria-expanded={embedPanelOpen}
              aria-controls="map-embed-filters"
            >
              {clientWorkOnly ? t('embed.openAbout') : t('embed.openFilters')}
            </button>
            <p className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center pb-3">
              <span className="pointer-events-auto rounded-lg border border-neutral-200/90 bg-white/95 px-3 py-2 text-center text-sm font-medium shadow-md">
                <MapEmbedOpenFullLink locale={locale} className="text-neutral-800 hover:text-neutral-950" />
              </span>
            </p>
          </>
        ) : (
          <button
            onClick={toggleFullscreen}
            className="absolute right-4 top-4 z-30 rounded-lg border border-gray-200 bg-white p-3 text-gray-700 shadow-lg transition-colors hover:bg-gray-50 md:hidden"
            aria-label={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
            title={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
          >
            {isFullscreen ? (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
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
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
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
        )}
      </main>
    </div>
  );
}
