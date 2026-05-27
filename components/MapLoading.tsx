'use client';

import { useTranslations } from 'next-intl';
import MinimalLoadingSpinner from '@/components/MinimalLoadingSpinner';

export default function MapLoading() {
  const t = useTranslations('map');

  return <MinimalLoadingSpinner label={t('loading')} />;
}
