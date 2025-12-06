'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NationalPark } from '@/lib/types/national-parks';
import FloatingHeader from './FloatingHeader';
import { GooglePlacesData } from '@/lib/google-places';

interface NationalParkDetailTemplateProps {
  park: NationalPark;
  slug: string;
  googlePlacesData?: GooglePlacesData | null;
  locale?: string;
}

export default function NationalParkDetailTemplate({
  park,
  slug,
  googlePlacesData,
  locale,
}: NationalParkDetailTemplateProps) {
  const parkName = park.name || 'National Park';
  
  // Use photos from Google Places API if available
  const photos = googlePlacesData?.photos || [];
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Keyboard navigation for photo carousel
  const handlePhotoKeyDown = (e: React.KeyboardEvent) => {
    if (photos.length <= 1) return;
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  };

  // Build location string
  const locationParts: string[] = [];
  if (park.state) locationParts.push(park.state);
  const location = locationParts.join(", ");
  
  // Get coordinates for map link
  const mapLink = park.latitude && park.longitude
    ? `/map?lat=${park.latitude}&lon=${park.longitude}&zoom=10`
    : '/map';

  // Get website URL from Google Places API
  const websiteUrl = googlePlacesData?.websiteUri;

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />

      {/* Breadcrumbs */}
      <nav className="bg-gray-50 border-b border-gray-200 py-3 pt-32 md:pt-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="https://sageoutdooradvisory.com" className="hover:text-[#006b5f]">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/map" className="hover:text-[#006b5f]">
              Map
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{parkName}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Photos */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Photos */}
            <div className="relative">
              {photos.length > 0 ? (
                <div 
                  className="relative w-full h-96 lg:h-full min-h-[400px] rounded-lg overflow-hidden bg-gray-100 group"
                  role="region"
                  aria-label={`Photo gallery for ${parkName}`}
                  aria-live="polite"
                  id="park-photos"
                  tabIndex={photos.length > 1 ? 0 : -1}
                  onKeyDown={handlePhotoKeyDown}
                >
                  <img
                    src={`/api/google-places-photo?photoName=${encodeURIComponent(photos[currentPhotoIndex].name)}&maxWidthPx=1200&maxHeightPx=800`}
                    alt={`${parkName} - Photo ${currentPhotoIndex + 1} of ${photos.length}`}
                    className="w-full h-full object-cover"
                    loading={currentPhotoIndex === 0 ? "eager" : "lazy"}
                    fetchPriority={currentPhotoIndex === 0 ? "high" : "auto"}
                    width={1200}
                    height={800}
                    decoding="async"
                  />
                  
                  {/* Navigation Arrows */}
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
                        aria-label={`Previous photo of ${parkName}. Currently showing photo ${currentPhotoIndex + 1} of ${photos.length}`}
                        aria-controls="park-photos"
                        type="button"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
                        aria-label={`Next photo of ${parkName}. Currently showing photo ${currentPhotoIndex + 1} of ${photos.length}`}
                        aria-controls="park-photos"
                        type="button"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div 
                        className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded z-10"
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        <span className="sr-only">Photo </span>
                        <span aria-hidden="true">{currentPhotoIndex + 1} / {photos.length}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div 
                  className="w-full h-96 lg:h-full min-h-[400px] rounded-lg bg-gray-200 flex items-center justify-center"
                  role="img"
                  aria-label={`No photos available for ${parkName}`}
                >
                  <p className="text-gray-500">No photos available</p>
                </div>
              )}
            </div>

            {/* Park Header Info */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{parkName}</h1>
              
              {location && (
                <p className="text-xl text-gray-600 mb-4">{location}</p>
              )}
              
              {/* Rating from Google Places API */}
              {(googlePlacesData?.rating || googlePlacesData?.userRatingCount) && (
                <div className="flex items-center gap-2 mb-4">
                  {googlePlacesData?.rating && (
                    <div className="flex items-center gap-1" role="img" aria-label={`Rating: ${googlePlacesData.rating.toFixed(1)} out of 5 stars`}>
                      <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                      <span className="text-lg font-semibold text-gray-900">
                        {googlePlacesData.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {googlePlacesData?.userRatingCount && (
                    <span className="text-gray-600">
                      ({googlePlacesData.userRatingCount.toLocaleString()} {googlePlacesData.userRatingCount === 1 ? 'review' : 'reviews'})
                    </span>
                  )}
                </div>
              )}
              
              {/* Contact Links */}
              <div className="flex flex-wrap gap-4 mt-6" role="group" aria-label="Park action links">
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-[#00b6a6] text-white rounded-lg hover:bg-[#009688] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
                    aria-label={`Visit ${parkName}'s website (opens in new tab)`}
                  >
                    Visit Website
                  </a>
                )}
                <Link
                  href={mapLink}
                  className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  aria-label={`View ${parkName} on map`}
                >
                  View on Map
                </Link>
              </div>
              
              {googlePlacesData?.phoneNumber && (
                <p className="text-gray-700 mt-4">
                  <span className="font-semibold">Phone:</span>{' '}
                  <a 
                    href={`tel:${googlePlacesData.phoneNumber}`} 
                    className="text-[#006b5f] hover:underline focus:outline-none focus:ring-2 focus:ring-[#006b5f] focus:ring-offset-2 rounded"
                  >
                    {googlePlacesData.phoneNumber}
                  </a>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {(googlePlacesData?.description || park.description) && (
              <section aria-labelledby="description-heading">
                <h2 id="description-heading" className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <div className="text-gray-700 whitespace-pre-line" role="article" aria-label={`Description of ${parkName}`}>
                  {googlePlacesData?.description || park.description}
                </div>
              </section>
            )}
            
            {/* Park Details */}
            <section aria-labelledby="park-details-heading">
              <h2 id="park-details-heading" className="text-2xl font-bold text-gray-900 mb-4">Park Details</h2>
              <dl className="flex flex-col gap-4">
                {park.date_established && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Date Established:</dt>
                    <dd className="text-gray-700">{park.date_established}</dd>
                  </div>
                )}
                {park.area_2021 && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Area:</dt>
                    <dd className="text-gray-700">{park.area_2021}</dd>
                  </div>
                )}
                {park.acres && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Acres:</dt>
                    <dd className="text-gray-700">{park.acres.toLocaleString()}</dd>
                  </div>
                )}
                {park.recreation_visitors_2021 && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Recreation Visitors (2021):</dt>
                    <dd className="text-gray-700">{park.recreation_visitors_2021}</dd>
                  </div>
                )}
                {park.park_code && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Park Code:</dt>
                    <dd className="text-gray-700">{park.park_code}</dd>
                  </div>
                )}
                {park.latitude && park.longitude && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Coordinates:</dt>
                    <dd className="text-gray-700">{park.latitude.toFixed(4)}, {park.longitude.toFixed(4)}</dd>
                  </div>
                )}
              </dl>
            </section>
            
            {/* Reviews Section from Google Places API */}
            {(googlePlacesData?.rating || googlePlacesData?.userRatingCount) && (
              <section aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
                <div className="bg-gray-50 rounded-lg p-6" role="region" aria-label="Park reviews and ratings">
                  <div className="flex items-center gap-4 mb-4">
                    {googlePlacesData?.rating && (
                      <div className="flex items-center gap-2">
                        <svg className="w-8 h-8 text-yellow-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                        </svg>
                        <span className="text-3xl font-bold text-gray-900" aria-label={`Rating: ${googlePlacesData.rating.toFixed(1)} out of 5 stars`}>
                          {googlePlacesData.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {googlePlacesData?.userRatingCount && (
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold text-gray-900">
                          {googlePlacesData.userRatingCount.toLocaleString()} {googlePlacesData.userRatingCount === 1 ? 'Review' : 'Reviews'}
                        </span>
                        <span className="text-sm text-gray-600">Google Reviews</span>
                      </div>
                    )}
                  </div>
                  {googlePlacesData?.rating && (
                    <div className="flex items-center gap-1" role="img" aria-label={`${Math.round(googlePlacesData.rating)} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(googlePlacesData.rating!)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                        </svg>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
