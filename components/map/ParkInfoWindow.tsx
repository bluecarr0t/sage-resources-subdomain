'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NationalParkWithCoords } from '@/lib/types/national-parks';
import { getFullStateName } from './utils/stateUtils';
import { getGooglePhotoUrl } from './utils/photoUtils';

interface ParkInfoWindowProps {
  selectedPark: NationalParkWithCoords;
  parkGooglePlacesData: {
    photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
    rating?: number;
    userRatingCount?: number;
  } | null;
  loadingParkPlacesData: boolean;
  currentParkPhotoIndex: number;
  setCurrentParkPhotoIndex: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
}

export default function ParkInfoWindow({
  selectedPark,
  parkGooglePlacesData,
  loadingParkPlacesData,
  currentParkPhotoIndex,
  setCurrentParkPhotoIndex,
  onClose,
}: ParkInfoWindowProps) {
  const t = useTranslations('map');
  const pathname = usePathname();

  const parkName = selectedPark.name.includes('National Park')
    ? selectedPark.name
    : `${selectedPark.name} National Park`;
  const stateLabel = selectedPark.state ? ` in ${getFullStateName(selectedPark.state)}` : '';
  const photos = parkGooglePlacesData?.photos;
  const hasPhotos = photos && Array.isArray(photos) && photos.length > 0;
  const safeIndex = hasPhotos ? Math.max(0, Math.min(currentParkPhotoIndex, photos!.length - 1)) : 0;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPhotos) return;
    setCurrentParkPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos!.length - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPhotos) return;
    setCurrentParkPhotoIndex((prev) => (prev < photos!.length - 1 ? prev + 1 : 0));
  };

  const pathSegments = pathname.split('/').filter(Boolean);
  const locale = pathSegments[0] || 'en';

  return (
    <div className="max-w-xs p-2">
      {loadingParkPlacesData && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading photos...</p>
        </div>
      )}

      {!loadingParkPlacesData && hasPhotos && (() => {
        const currentPhoto = photos![safeIndex];
        const photoUrl = getGooglePhotoUrl(currentPhoto, true);
        const altText = `Photo of ${parkName}${stateLabel} - Image ${safeIndex + 1} of ${photos!.length}`;

        return (
          <div className="mb-3 -mx-2 -mt-2 relative">
            <div
              className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gray-100 group"
              style={{ aspectRatio: '16/9' }}
            >
              <Image
                src={photoUrl}
                alt={altText}
                fill
                sizes="320px"
                className="object-cover"
                priority
                unoptimized
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const container = target.closest('.mb-3') as HTMLElement;
                  if (container) container.style.display = 'none';
                }}
              />

              {photos!.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20"
                    aria-label="Previous photo"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20"
                    aria-label="Next photo"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {photos!.length > 1 && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded z-10">
                  {safeIndex + 1} / {photos!.length}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <h3 className="font-bold text-lg mb-2 text-gray-900">{parkName}</h3>

      {selectedPark.state && (
        <p className="text-sm text-gray-600 mb-2">{getFullStateName(selectedPark.state)}</p>
      )}

      {selectedPark.date_established && (
        <p className="text-sm text-gray-700 mb-2">
          <span className="font-semibold">{t('infoWindow.park.established')}:</span> {selectedPark.date_established}
        </p>
      )}

      {selectedPark.acres && (
        <p className="text-sm text-gray-700 mb-2">
          <span className="font-semibold">{t('infoWindow.park.size')}:</span> {selectedPark.acres.toLocaleString()}{' '}
          {t('infoWindow.park.acres')}
        </p>
      )}

      {selectedPark.recreation_visitors_2021 && (
        <p className="text-sm text-gray-700 mb-2">
          <span className="font-semibold">{t('infoWindow.park.visitors')}:</span>{' '}
          {parseInt(selectedPark.recreation_visitors_2021, 10).toLocaleString()}
        </p>
      )}

      {selectedPark.description && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-3">{selectedPark.description}</p>
      )}

      {selectedPark.slug && (
        <Link
          href={`/${locale}/property/${selectedPark.slug}`}
          className="inline-block text-sm text-blue-600 hover:text-blue-800 underline font-medium mt-2 border-t border-gray-200 pt-2 w-full text-center"
        >
          {t('infoWindow.park.viewMore')}
        </Link>
      )}
    </div>
  );
}
