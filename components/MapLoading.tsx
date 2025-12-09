'use client';

import { useTranslations } from 'next-intl';

export default function MapLoading() {
  const t = useTranslations('map');
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00b6a6] mx-auto mb-4"></div>
        <p className="text-gray-600">{t('loading')}</p>
      </div>
    </div>
  );
}
