'use client';

import { useTranslations } from 'next-intl';
import type { ClientWorkMapPoint } from '@/lib/map/client-work-locations';

interface ClientWorkInfoWindowProps {
  point: ClientWorkMapPoint;
}

export default function ClientWorkInfoWindow({ point }: ClientWorkInfoWindowProps) {
  const t = useTranslations('map');

  return (
    <div className="max-w-xs p-2">
      <h3 className="font-semibold text-gray-900 mb-2">{point.location}</h3>
      <p className="text-sm text-gray-600 mb-1">
        <span className="font-medium text-gray-700">{t('infoWindow.clientWork.resortType')}:</span>{' '}
        {point.resortType}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-700">{t('infoWindow.clientWork.service')}:</span>{' '}
        {point.service}
      </p>
    </div>
  );
}
