'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SageProperty } from '@/lib/types/sage';
import { slugifyPropertyName } from '@/lib/properties';
import { getGooglePhotoUrl } from './utils/photoUtils';

interface PropertyInfoWindowProps {
  selectedProperty: (SageProperty & { coordinates: [number, number] }) | null;
  propertyForDisplay: any;
  parsedPhotos: Array<{ name: string; widthPx?: number; heightPx?: number }> | null;
  currentPhotoUrl: string | null;
  currentPhotoIndex: number;
  setCurrentPhotoIndex: React.Dispatch<React.SetStateAction<number>>;
  loadingPropertyDetails: boolean;
  onClose: () => void;
}

export default function PropertyInfoWindow({
  selectedProperty,
  propertyForDisplay,
  parsedPhotos,
  currentPhotoUrl,
  currentPhotoIndex,
  setCurrentPhotoIndex,
  loadingPropertyDetails,
  onClose,
}: PropertyInfoWindowProps) {
  const t = useTranslations('map');
  const pathname = usePathname();

  if (!selectedProperty || !propertyForDisplay) return null;

  const safeIndex = parsedPhotos
    ? Math.max(0, Math.min(currentPhotoIndex, parsedPhotos.length - 1))
    : 0;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!parsedPhotos) return;
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : parsedPhotos.length - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!parsedPhotos) return;
    setCurrentPhotoIndex((prev) => (prev < parsedPhotos.length - 1 ? prev + 1 : 0));
  };

  const propertyName = propertyForDisplay.property_name || t('infoWindow.property.default');
  const city = propertyForDisplay.city || '';
  const state = propertyForDisplay.state || '';
  const location = city && state ? ` in ${city}, ${state}` : state ? ` in ${state}` : '';
  const altText = parsedPhotos
    ? `Photo of ${propertyName} glamping property${location} - Image ${safeIndex + 1} of ${parsedPhotos.length}`
    : '';

  const propertySlug =
    propertyForDisplay.slug ||
    (propertyForDisplay.property_name
      ? slugifyPropertyName(propertyForDisplay.property_name)
      : propertyForDisplay.site_name
        ? slugifyPropertyName(propertyForDisplay.site_name)
        : null);

  const pathSegments = pathname.split('/').filter(Boolean);
  const locale = pathSegments[0] || 'en';

  return (
    <div className="max-w-xs p-2">
      {loadingPropertyDetails &&
        (!propertyForDisplay || (!propertyForDisplay.property_name && !propertyForDisplay.site_name)) && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading details...</p>
          </div>
        )}

      {parsedPhotos && currentPhotoUrl && (
        <div className="mb-3 -mx-2 -mt-2 relative">
          <div
            className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gray-100 group"
            style={{ aspectRatio: '16/9' }}
          >
            <Image
              key={`${selectedProperty?.id}-${currentPhotoIndex}-${currentPhotoUrl}`}
              src={currentPhotoUrl}
              alt={altText}
              fill
              sizes="320px"
              className="object-cover"
              priority
              unoptimized
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const currentPhoto = parsedPhotos[safeIndex];
                const photoName = currentPhoto?.name;
                if (!photoName || photoName === 'null' || photoName === 'undefined' || photoName.trim() === '') {
                  const container = target.closest('.mb-3') as HTMLElement;
                  if (container) container.style.display = 'none';
                } else {
                  target.style.opacity = '0.3';
                  target.alt = 'Failed to load image';
                }
              }}
            />

            {parsedPhotos.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20"
                  aria-label={t('infoWindow.photo.previous')}
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20"
                  aria-label={t('infoWindow.photo.next')}
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {parsedPhotos.length > 1 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded z-10">
                {safeIndex + 1} / {parsedPhotos.length}
              </div>
            )}
          </div>
        </div>
      )}

      <h3 className="font-bold text-lg mb-2 text-gray-900">
        {propertyForDisplay.property_name || propertyForDisplay.site_name || t('infoWindow.property.unnamed')}
      </h3>

      {(() => {
        const addressParts = [];
        if (propertyForDisplay.address)
          addressParts.push(propertyForDisplay.address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
        if (propertyForDisplay.city) addressParts.push(propertyForDisplay.city);
        if (propertyForDisplay.state) addressParts.push(propertyForDisplay.state);
        const fullAddress = addressParts.join(', ');
        return fullAddress ? (
          <p className="text-sm text-gray-600 mb-2 truncate" title={fullAddress}>
            {fullAddress}
          </p>
        ) : null;
      })()}

      {(propertyForDisplay as any).all_unit_types && (propertyForDisplay as any).all_unit_types.length > 0 && (
        <p className="text-sm text-gray-700 mb-2">
          <span className="font-semibold">{t('infoWindow.property.unitTypes')}:</span>{' '}
          {(propertyForDisplay as any).all_unit_types.join(', ')}
        </p>
      )}

      {(!(propertyForDisplay as any).all_unit_types || (propertyForDisplay as any).all_unit_types.length === 0) &&
        propertyForDisplay.unit_type && (
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">{t('infoWindow.property.unitTypes')}:</span>{' '}
            {propertyForDisplay.unit_type}
          </p>
        )}

      {((propertyForDisplay as any).google_rating || (propertyForDisplay as any).google_user_rating_total) && (
        <div className="flex items-center gap-2 mb-2">
          {(propertyForDisplay as any).google_rating && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-sm font-semibold text-gray-900">
                {(propertyForDisplay as any).google_rating.toFixed(1)}
              </span>
            </div>
          )}
          {(propertyForDisplay as any).google_user_rating_total && (
            <span className="text-sm text-gray-600">
              ({(propertyForDisplay as any).google_user_rating_total.toLocaleString()}{' '}
              {(propertyForDisplay as any).google_user_rating_total === 1
                ? t('infoWindow.property.reviews.one')
                : t('infoWindow.property.reviews.other')}
              )
            </span>
          )}
        </div>
      )}

      {propertySlug && (
        <Link
          href={`/${locale}/property/${propertySlug}`}
          className="inline-block text-sm text-blue-600 hover:text-blue-800 underline font-medium mt-2 border-t border-gray-200 pt-2 w-full text-center"
        >
          {t('infoWindow.property.viewMore')}
        </Link>
      )}
    </div>
  );
}
