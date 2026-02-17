'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SageProperty } from '@/lib/types/sage';
import { parseCoordinates } from '@/lib/types/sage';

interface RelatedPropertiesCarouselProps {
  properties: SageProperty[];
  currentPropertyName: string;
}

/**
 * Generate Google Places Photo URL from photo object
 */
function getGooglePhotoUrl(photo: {
  name: string;
  widthPx?: number;
  heightPx?: number;
}, maxWidth: number = 400, maxHeight: number = 300): string {
  if (!photo?.name) {
    return '';
  }
  
  const width = photo.widthPx ? Math.min(photo.widthPx, maxWidth) : maxWidth;
  const height = photo.heightPx ? Math.min(photo.heightPx, maxHeight) : maxHeight;
  const encodedPhotoName = encodeURIComponent(photo.name);
  
  return `/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${width}&maxHeightPx=${height}`;
}

export default function RelatedPropertiesCarousel({
  properties,
  currentPropertyName,
}: RelatedPropertiesCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!properties || properties.length === 0) {
    return null;
  }

  // Show 3 properties at a time on desktop, 1 on mobile
  const itemsPerView = 3;
  const maxIndex = Math.max(0, properties.length - itemsPerView);

  const visibleProperties = properties.slice(currentIndex, currentIndex + itemsPerView);

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <section className="mt-12 border-t border-gray-200 pt-8" aria-labelledby="related-properties-heading">
      <div className="flex items-center justify-between mb-6">
        <h2 id="related-properties-heading" className="text-2xl font-bold text-gray-900">
          Nearby Glamping Properties
        </h2>
        {properties.length > itemsPerView && (
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="p-2 rounded-full border border-gray-300 hover:border-[#00b6a6] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
              aria-label={`Previous properties. Currently showing properties ${currentIndex + 1}-${Math.min(currentIndex + itemsPerView, properties.length)} of ${properties.length}`}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center" aria-live="polite" aria-atomic="true">
              <span className="sr-only">Showing properties </span>
              {currentIndex + 1}-{Math.min(currentIndex + itemsPerView, properties.length)} of {properties.length}
            </span>
            <button
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              className="p-2 rounded-full border border-gray-300 hover:border-[#00b6a6] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
              aria-label={`Next properties. Currently showing properties ${currentIndex + 1}-${Math.min(currentIndex + itemsPerView, properties.length)} of ${properties.length}`}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleProperties.map((property) => {
          const propertyName = property.property_name || 'Unnamed Property';
          const slug = property.slug || '';
          
          // Parse photos
          let photos: any[] = [];
          if (property.google_photos) {
            if (typeof property.google_photos === 'string') {
              try {
                photos = JSON.parse(property.google_photos);
              } catch (e) {
                // Ignore parse errors
              }
            } else if (Array.isArray(property.google_photos)) {
              photos = property.google_photos;
            }
          }
          
          // Build location
          const locationParts: string[] = [];
          if (property.city) locationParts.push(property.city);
          if (property.state) locationParts.push(property.state);
          const location = locationParts.join(', ') || '';
          
          // Get coordinates for map link
          const coordinates = parseCoordinates(property.lat, property.lon);
          const mapLink = coordinates 
            ? `/map?lat=${coordinates[0]}&lon=${coordinates[1]}&zoom=15`
            : '/map';
          
          return (
            <Link
              key={property.id}
              href={`/property/${slug}`}
              className="group border border-gray-200 rounded-lg overflow-hidden hover:border-[#00b6a6] hover:shadow-lg transition-all"
            >
              {/* Property Image */}
              <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                {photos.length > 0 ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getGooglePhotoUrl(photos[0], 600, 400)}
                      alt={propertyName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width={600}
                      height={400}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <p className="text-gray-400 text-sm">No photo available</p>
                  </div>
                )}
                
                {/* Rating badge */}
                {property.google_rating && (
                  <div className="absolute top-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded flex items-center gap-1" role="img" aria-label={`Rating: ${property.google_rating.toFixed(1)} out of 5 stars`}>
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                    <span className="text-sm font-semibold">{property.google_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              {/* Property Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-[#00b6a6] transition-colors mb-1 line-clamp-2">
                  {propertyName}
                </h3>
                
                {location && (
                  <p className="text-sm text-gray-600 mb-2">{location}</p>
                )}
                
                {property.unit_type && (
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Unit Type:</span> {property.unit_type}
                  </p>
                )}
                
                {property.rate_avg_retail_daily_rate && (
                  <p className="text-sm text-gray-900 font-semibold mb-3">
                    From ${property.rate_avg_retail_daily_rate}/night
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-[#006b5f] group-hover:text-[#00b6a6] transition-colors">
                  <span>View Details</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
