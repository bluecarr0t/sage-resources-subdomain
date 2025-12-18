'use client';

import { useMapContext } from '@/components/MapContext';
import { useTranslations } from 'next-intl';

/**
 * Map Controls Component
 * Handles fullscreen toggle and other map controls
 */
export default function MapControls() {
  const { isFullscreen, toggleFullscreen } = useMapContext();
  const t = useTranslations('map');

  return (
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
  );
}
