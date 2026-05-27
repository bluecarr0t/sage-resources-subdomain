'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import { useMapContext } from '@/components/MapContext';
import MinimalLoadingSpinner from '@/components/MinimalLoadingSpinner';

/**
 * Loading state for the map canvas (main panel).
 * Parent must be `position: relative` (e.g. MapLayout `<main>`).
 */
export default function MapPageLoadingOverlay() {
  const t = useTranslations('map');
  const { isLoaded, loadError } = useGoogleMaps();
  const { propertiesLoading, hasLoadedOnce } = useMapContext();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (loadError) return null;

  let label: string | null = null;
  if (!isClient) {
    label = t('errors.initializing');
  } else if (!isLoaded) {
    label = t('errors.loadingMaps');
  } else if (propertiesLoading && !hasLoadedOnce) {
    label = t('errors.loadingProperties');
  }

  if (!label) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-neutral-100/40"
      aria-busy="true"
      aria-live="polite"
    >
      <MinimalLoadingSpinner label={label} />
    </div>
  );
}
