'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SageProperty } from '@/lib/types/sage';
import { parseCoordinates } from '@/lib/types/sage';
import RelatedPropertiesCarousel from '@/components/RelatedPropertiesCarousel';

interface PropertyDetailTemplateProps {
  properties: SageProperty[];
  slug: string;
  propertyName: string;
  nearbyProperties?: SageProperty[];
}

/**
 * Generate Google Places Photo URL from photo object
 */
function getGooglePhotoUrl(photo: {
  name: string;
  widthPx?: number;
  heightPx?: number;
}, maxWidth: number = 1200, maxHeight: number = 800): string {
  if (!photo?.name) {
    return '';
  }
  
  const width = photo.widthPx ? Math.min(photo.widthPx, maxWidth) : maxWidth;
  const height = photo.heightPx ? Math.min(photo.heightPx, maxHeight) : maxHeight;
  const encodedPhotoName = encodeURIComponent(photo.name);
  
  return `/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${width}&maxHeightPx=${height}`;
}

/**
 * Check if an amenity field indicates the amenity is available
 */
function hasAmenity(value: string | null | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'yes' || lower === 'y' || lower === 'true' || lower === '1';
}

/**
 * Format phone number from "+1 844-993-9888" to "(844)-993-9888"
 */
function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove "+1 " prefix if present, and remove all spaces and dashes
  let cleaned = phone.replace(/^\+1\s*/, '').replace(/[\s-]/g, '');
  
  // Format as (XXX)-XXX-XXXX if we have 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)})-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // If it doesn't match expected format, return original
  return phone;
}

/**
 * Group properties by location (city, state) or unit type
 */
function groupProperties(properties: SageProperty[]) {
  const grouped: Record<string, SageProperty[]> = {};
  
  properties.forEach((prop) => {
    const locationKey = `${prop.city || 'Unknown'}, ${prop.state || 'Unknown'}`;
    if (!grouped[locationKey]) {
      grouped[locationKey] = [];
    }
    grouped[locationKey].push(prop);
  });
  
  return grouped;
}

export default function PropertyDetailTemplate({
  properties,
  slug,
  propertyName,
  nearbyProperties = [],
}: PropertyDetailTemplateProps) {
  const firstProperty = properties[0];
  
  // Parse photos from first property
  let photos: any[] = [];
  if (firstProperty.google_photos) {
    if (typeof firstProperty.google_photos === 'string') {
      try {
        photos = JSON.parse(firstProperty.google_photos);
      } catch (e) {
        // Ignore parse errors
      }
    } else if (Array.isArray(firstProperty.google_photos)) {
      photos = firstProperty.google_photos;
    }
  }
  
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
  if (firstProperty.city) locationParts.push(firstProperty.city);
  if (firstProperty.state) locationParts.push(firstProperty.state);
  if (firstProperty.country) locationParts.push(firstProperty.country);
  const location = locationParts.join(", ");
  
  // Group properties by location
  const groupedProperties = groupProperties(properties);
  
  // Build address
  const addressParts: string[] = [];
  if (firstProperty.address) addressParts.push(firstProperty.address);
  if (firstProperty.city) addressParts.push(firstProperty.city);
  if (firstProperty.state) addressParts.push(firstProperty.state);
  if (firstProperty.zip_code) addressParts.push(firstProperty.zip_code);
  const fullAddress = addressParts.join(", ");
  
  // Get website URL (prioritize google_website_uri)
  const websiteUrl = firstProperty.google_website_uri || firstProperty.url;
  
  // Get coordinates for map link
  const coordinates = parseCoordinates(firstProperty.lat, firstProperty.lon);
  const mapLink = coordinates 
    ? `/map?lat=${coordinates[0]}&lon=${coordinates[1]}&zoom=15`
    : '/map';

  // Collect all unique unit types from all properties
  const unitTypes = Array.from(
    new Set(
      properties
        .map(p => p.unit_type)
        .filter((type): type is string => type !== null && type !== undefined && type.trim() !== '')
    )
  ).sort();

  // Collect all amenities from all properties
  const amenities = {
    pool: properties.some(p => hasAmenity(p.pool)),
    hotTub: properties.some(p => hasAmenity(p.hot_tub_sauna)),
    wifi: properties.some(p => hasAmenity(p.wifi)),
    pets: properties.some(p => hasAmenity(p.pets)),
    toilet: properties.some(p => hasAmenity(p.toilet)),
    shower: properties.some(p => hasAmenity(p.shower)),
    water: properties.some(p => hasAmenity(p.water)),
    trash: properties.some(p => hasAmenity(p.trash)),
    cooking: properties.some(p => hasAmenity(p.cooking_equipment)),
    picnicTable: properties.some(p => hasAmenity(p.picnic_table)),
    laundry: properties.some(p => hasAmenity(p.laundry)),
    campfires: properties.some(p => hasAmenity(p.campfires)),
    playground: properties.some(p => hasAmenity(p.playground)),
    restaurant: properties.some(p => hasAmenity(p.sage_p_amenity_restaurant)),
    waterfront: properties.some(p => hasAmenity(p.sage_p_amenity_waterfront)),
  };
  
  // Check if any amenities are present
  const hasAnyAmenities = Object.values(amenities).some(value => value === true);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            <Link href="https://sageoutdooradvisory.com" className="flex items-center">
              <Image
                src="/sage-logo-black-header.png"
                alt="Sage Outdoor Advisory"
                width={200}
                height={100}
                className="h-16 w-auto"
                priority
              />
            </Link>
            <Link
              href="https://sageoutdooradvisory.com/contact-us"
              className="px-6 py-2 bg-[#00b6a6] text-white rounded-lg hover:bg-[#009688] transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="bg-gray-50 border-b border-gray-200 py-3">
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
            <span className="text-gray-900 font-medium">{propertyName}</span>
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
                  aria-label={`Photo gallery for ${propertyName}`}
                  aria-live="polite"
                  id="property-photos"
                  tabIndex={photos.length > 1 ? 0 : -1}
                  onKeyDown={handlePhotoKeyDown}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getGooglePhotoUrl(photos[currentPhotoIndex], 1200, 800)}
                    alt={`${propertyName} - Photo ${currentPhotoIndex + 1} of ${photos.length}`}
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
                        aria-label={`Previous photo of ${propertyName}. Currently showing photo ${currentPhotoIndex + 1} of ${photos.length}`}
                        aria-controls="property-photos"
                        type="button"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
                        aria-label={`Next photo of ${propertyName}. Currently showing photo ${currentPhotoIndex + 1} of ${photos.length}`}
                        aria-controls="property-photos"
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
                  aria-label={`No photos available for ${propertyName}`}
                >
                  <p className="text-gray-500">No photos available</p>
                </div>
              )}
            </div>

            {/* Property Header Info */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{propertyName}</h1>
              
              {location && (
                <p className="text-xl text-gray-600 mb-4">{location}</p>
              )}
              
              {fullAddress && (
                <p className="text-gray-600 mb-4">{fullAddress}</p>
              )}
              
              {/* Rating */}
              {(firstProperty.google_rating || firstProperty.google_user_rating_total) && (
                <div className="flex items-center gap-2 mb-4">
                  {firstProperty.google_rating && (
                    <div className="flex items-center gap-1" role="img" aria-label={`Rating: ${firstProperty.google_rating.toFixed(1)} out of 5 stars`}>
                      <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                      <span className="text-lg font-semibold text-gray-900">
                        {firstProperty.google_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {firstProperty.google_user_rating_total && (
                    <span className="text-gray-600">
                      ({firstProperty.google_user_rating_total.toLocaleString()} {firstProperty.google_user_rating_total === 1 ? 'review' : 'reviews'})
                    </span>
                  )}
                </div>
              )}
              
              {/* Contact Links */}
              <div className="flex flex-wrap gap-4 mt-6" role="group" aria-label="Property action links">
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-[#00b6a6] text-white rounded-lg hover:bg-[#009688] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
                    aria-label={`Visit ${propertyName}'s website (opens in new tab)`}
                  >
                    Visit Website
                  </a>
                )}
                <Link
                  href={mapLink}
                  className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  aria-label={`View ${propertyName} on map`}
                >
                  View on Map
                </Link>
              </div>
              
              {firstProperty.google_phone_number && (
                <p className="text-gray-700 mt-4">
                  <span className="font-semibold">Phone:</span>{' '}
                  <a 
                    href={`tel:${firstProperty.google_phone_number}`} 
                    className="text-[#006b5f] hover:underline focus:outline-none focus:ring-2 focus:ring-[#006b5f] focus:ring-offset-2 rounded"
                    aria-label={`Call ${propertyName} at ${formatPhoneNumber(firstProperty.google_phone_number)}`}
                  >
                    {formatPhoneNumber(firstProperty.google_phone_number)}
                  </a>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Properties/Locations List */}
        {Object.keys(groupedProperties).length > 1 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Locations & Units</h2>
            <div className="space-y-6">
              {Object.entries(groupedProperties).map(([locationKey, props]) => (
                <div key={locationKey} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{locationKey}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {props.map((prop) => {
                      const propCoords = parseCoordinates(prop.lat, prop.lon);
                      return (
                        <div key={prop.id} className="border border-gray-100 rounded p-4">
                          {(prop.site_name || prop.unit_type) && (
                            <h4 className="font-semibold text-gray-900 mb-2">
                              {prop.site_name || prop.unit_type || 'Unit'}
                            </h4>
                          )}
                          {prop.unit_type && prop.site_name && prop.unit_type !== prop.site_name && (
                            <p className="text-sm text-gray-600 mb-2">Unit Type: {prop.unit_type}</p>
                          )}
                          {prop.avg_retail_daily_rate_2024 && (
                            <p className="text-sm text-gray-700 mb-2">
                              <span className="font-semibold">Avg Rate:</span> ${prop.avg_retail_daily_rate_2024}
                            </p>
                          )}
                          {propCoords && (
                            <Link
                              href={`/map?lat=${propCoords[0]}&lon=${propCoords[1]}&zoom=15`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View on Map →
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Details and Amenities Grid */}
        <div className={`grid grid-cols-1 gap-8 mb-8 ${hasAnyAmenities ? 'lg:grid-cols-3' : ''}`}>
          {/* Left Column - Details */}
          <div className={hasAnyAmenities ? 'lg:col-span-2 space-y-6' : 'space-y-4'}>
            {/* Description - Prioritize Google description, fallback to regular description */}
            {(firstProperty.google_description || firstProperty.description) && (
              <section aria-labelledby="description-heading">
                <h2 id="description-heading" className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <div className="text-gray-700 whitespace-pre-line" role="article" aria-label={`Description of ${propertyName}`}>
                  {firstProperty.google_description || firstProperty.description}
                </div>
              </section>
            )}
            
            {/* Property Details */}
            <section aria-labelledby="property-details-heading">
              <h2 id="property-details-heading" className="text-2xl font-bold text-gray-900 mb-4">Property Details</h2>
              <dl className={`flex flex-col ${hasAnyAmenities ? 'gap-4' : 'gap-2'}`}>
                {unitTypes.length > 0 && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Unit Type(s):</dt>
                    <dd className="text-gray-700">{unitTypes.join(', ')}</dd>
                  </div>
                )}
                {firstProperty.operating_season_months && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Operating Season:</dt>
                    <dd className="text-gray-700">{firstProperty.operating_season_months}</dd>
                  </div>
                )}
                {firstProperty.year_site_opened && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Year Opened:</dt>
                    <dd className="text-gray-700">{firstProperty.year_site_opened}</dd>
                  </div>
                )}
                {firstProperty.property_total_sites && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Total Sites:</dt>
                    <dd className="text-gray-700">{firstProperty.property_total_sites}</dd>
                  </div>
                )}
                {firstProperty.minimum_nights && (
                  <div className="flex items-baseline gap-2">
                    <dt className="font-semibold text-gray-900">Minimum Nights:</dt>
                    <dd className="text-gray-700">{firstProperty.minimum_nights}</dd>
                  </div>
                )}
              </dl>
            </section>
            
            {/* Reviews Section */}
            {(firstProperty.google_rating || firstProperty.google_user_rating_total) && (
              <section aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
                <div className="bg-gray-50 rounded-lg p-6" role="region" aria-label="Property reviews and ratings">
                  <div className="flex items-center gap-4 mb-4">
                    {firstProperty.google_rating && (
                      <div className="flex items-center gap-2">
                        <svg className="w-8 h-8 text-yellow-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                        </svg>
                        <span className="text-3xl font-bold text-gray-900" aria-label={`Rating: ${firstProperty.google_rating.toFixed(1)} out of 5 stars`}>
                          {firstProperty.google_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {firstProperty.google_user_rating_total && (
                      <div className="flex flex-col">
                        <span className="text-lg font-semibold text-gray-900">
                          {firstProperty.google_user_rating_total.toLocaleString()} {firstProperty.google_user_rating_total === 1 ? 'Review' : 'Reviews'}
                        </span>
                        <span className="text-sm text-gray-600">Google Reviews</span>
                      </div>
                    )}
                  </div>
                  {firstProperty.google_rating && (
                    <div className="flex items-center gap-1" role="img" aria-label={`${Math.round(firstProperty.google_rating)} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(firstProperty.google_rating!)
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

          {/* Right Column - Amenities */}
          {hasAnyAmenities && (
            <div className="lg:col-span-1">
              <section aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
                <ul className="grid grid-cols-1 gap-3" role="list" aria-label="Available amenities">
                {amenities.pool && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Pool</span>
                  </li>
                )}
                {amenities.hotTub && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Hot Tub / Sauna</span>
                  </li>
                )}
                {amenities.wifi && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Wi-Fi</span>
                  </li>
                )}
                {amenities.pets && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Pets Allowed</span>
                  </li>
                )}
                {amenities.restaurant && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Restaurant</span>
                  </li>
                )}
                {amenities.waterfront && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Waterfront</span>
                  </li>
                )}
                {amenities.shower && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Showers</span>
                  </li>
                )}
                {amenities.laundry && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Laundry</span>
                  </li>
                )}
                {amenities.cooking && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Cooking Equipment</span>
                  </li>
                )}
                </ul>
              </section>
            </div>
          )}
        </div>

        {/* Related Properties Carousel */}
        {nearbyProperties.length > 0 && (
          <RelatedPropertiesCarousel 
            properties={nearbyProperties}
            currentPropertyName={propertyName}
          />
        )}
      </main>
    </div>
  );
}