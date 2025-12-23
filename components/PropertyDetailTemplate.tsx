'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SageProperty } from '@/lib/types/sage';
import { parseCoordinates } from '@/lib/types/sage';
import RelatedPropertiesCarousel from '@/components/RelatedPropertiesCarousel';
import FloatingHeader from './FloatingHeader';
import { GooglePlacesData } from '@/lib/google-places';

interface PropertyDetailTemplateProps {
  properties: SageProperty[];
  slug: string;
  propertyName: string;
  nearbyProperties?: SageProperty[];
  googlePlacesData?: GooglePlacesData | null;
  locale?: string;
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
  googlePlacesData: initialGooglePlacesData,
  locale,
}: PropertyDetailTemplateProps) {
  const firstProperty = properties[0];
  
  // State for client-side fetched Google Places data
  const [googlePlacesData, setGooglePlacesData] = useState<GooglePlacesData | null>(initialGooglePlacesData || null);
  const [isLoadingPlacesData, setIsLoadingPlacesData] = useState(!initialGooglePlacesData);
  
  // Fetch Google Places data client-side if not provided
  useEffect(() => {
    if (initialGooglePlacesData) {
      // Already have data, no need to fetch
      return;
    }
    
    const fetchGooglePlacesData = async () => {
      try {
        setIsLoadingPlacesData(true);
        const params = new URLSearchParams({
          propertyName: propertyName,
        });
        
        if (firstProperty.city) params.append('city', firstProperty.city);
        if (firstProperty.state) params.append('state', firstProperty.state);
        if (firstProperty.address) params.append('address', firstProperty.address);
        
        const response = await fetch(`/api/google-places?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          setGooglePlacesData(data);
        } else {
          // Silently fail - page will work without Google Places data
          console.warn('Failed to fetch Google Places data:', response.statusText);
        }
      } catch (error) {
        // Silently fail - page will work without Google Places data
        console.warn('Error fetching Google Places data:', error);
      } finally {
        setIsLoadingPlacesData(false);
      }
    };
    
    fetchGooglePlacesData();
  }, [propertyName, firstProperty.city, firstProperty.state, firstProperty.address, initialGooglePlacesData]);
  
  // Use photos from Google Places API (not from database)
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
  
  // Get website URL from Google Places API (not from database)
  const websiteUrl = googlePlacesData?.websiteUri || firstProperty.url;
  
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

  // Collect all amenities from database columns ONLY (from toilet to water_hookup)
  // Do NOT use Google Places API for amenities - only use all_glamping_properties columns
  const amenities = {
    toilet: properties.some(p => hasAmenity(p.toilet)),
    hotTub: properties.some(p => hasAmenity(p.hot_tub_sauna)),
    pool: properties.some(p => hasAmenity(p.pool)),
    pets: properties.some(p => hasAmenity(p.pets)),
    water: properties.some(p => hasAmenity(p.water)),
    shower: properties.some(p => hasAmenity(p.shower)),
    trash: properties.some(p => hasAmenity(p.trash)),
    cooking: properties.some(p => hasAmenity(p.cooking_equipment)),
    picnicTable: properties.some(p => hasAmenity(p.picnic_table)),
    wifi: properties.some(p => hasAmenity(p.wifi)),
    laundry: properties.some(p => hasAmenity(p.laundry)),
    campfires: properties.some(p => hasAmenity(p.campfires)),
    playground: properties.some(p => hasAmenity(p.playground)),
    rvVehicleLength: properties.some(p => hasAmenity(p.rv_vehicle_length)),
    rvParking: properties.some(p => hasAmenity(p.rv_parking)),
    rvAccommodatesSlideout: properties.some(p => hasAmenity(p.rv_accommodates_slideout)),
    rvSurfaceType: properties.some(p => hasAmenity(p.rv_surface_type)),
    rvSurfaceLevel: properties.some(p => hasAmenity(p.rv_surface_level)),
    rvVehiclesFifthWheels: properties.some(p => hasAmenity(p.rv_vehicles_fifth_wheels)),
    rvVehiclesClassA: properties.some(p => hasAmenity(p.rv_vehicles_class_a_rvs)),
    rvVehiclesClassB: properties.some(p => hasAmenity(p.rv_vehicles_class_b_rvs)),
    rvVehiclesClassC: properties.some(p => hasAmenity(p.rv_vehicles_class_c_rvs)),
    rvVehiclesToyHauler: properties.some(p => hasAmenity(p.rv_vehicles_toy_hauler)),
    electricity: properties.some(p => hasAmenity(p.electricity)),
    charcoalGrill: properties.some(p => hasAmenity(p.charcoal_grill)),
    sewerHookUp: properties.some(p => hasAmenity(p.sewer_hook_up)),
    electricalHookUp: properties.some(p => hasAmenity(p.electrical_hook_up)),
    generatorsAllowed: properties.some(p => hasAmenity(p.generators_allowed)),
    waterHookup: properties.some(p => hasAmenity(p.water_hookup)),
  };
  
  // Check if any amenities are present
  const hasAnyAmenities = Object.values(amenities).some(value => value === true);

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />

      {/* Breadcrumbs */}
      <nav className="bg-gray-50 border-b border-gray-200 py-3 pt-32 md:pt-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="https://resources.sageoutdooradvisory.com/" className="hover:text-[#006b5f]">
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
                    alt={`${propertyName} - ${firstProperty.city || ''} ${firstProperty.state || ''} glamping property photo ${currentPhotoIndex + 1} of ${photos.length}`}
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
                  <p className="text-gray-700">No photos available</p>
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
              <div className="flex flex-wrap gap-4 mt-6" role="group" aria-label="Property action links">
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-[#006b5f] text-white rounded-lg hover:bg-[#005a4f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#006b5f] focus:ring-offset-2"
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
              
              {firstProperty.phone_number && (
                <p className="text-gray-700 mt-4">
                  <span className="font-semibold">Phone:</span>{' '}
                  <a 
                    href={`tel:${firstProperty.phone_number}`} 
                    className="text-[#006b5f] hover:underline focus:outline-none focus:ring-2 focus:ring-[#006b5f] focus:ring-offset-2 rounded"
                    aria-label={`Call ${propertyName} at ${formatPhoneNumber(firstProperty.phone_number)}`}
                  >
                    {formatPhoneNumber(firstProperty.phone_number)}
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
                          {/* Rate Range - Hidden */}
                          {false && prop.avg_retail_daily_rate_2024 && (
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
            {/* Description from database column (not from Google Places API) */}
            {firstProperty.description && firstProperty.description.trim() && (
              <section aria-labelledby="description-heading">
                <h2 id="description-heading" className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                <div className="text-gray-700 whitespace-pre-line" role="article" aria-label={`Description of ${propertyName}`}>
                  {firstProperty.description}
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
            
            {/* Reviews Section from Google Places API */}
            {(googlePlacesData?.rating || googlePlacesData?.userRatingCount) && (
              <section aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
                <div className="bg-gray-50 rounded-lg p-6" role="region" aria-label="Property reviews and ratings">
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

          {/* Right Column - Amenities */}
          {false && hasAnyAmenities && (
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
                {amenities.toilet && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Restrooms</span>
                  </li>
                )}
                {amenities.water && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Water Access</span>
                  </li>
                )}
                {amenities.trash && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Trash Service</span>
                  </li>
                )}
                {amenities.picnicTable && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Picnic Tables</span>
                  </li>
                )}
                {amenities.campfires && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Campfires Allowed</span>
                  </li>
                )}
                {amenities.playground && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Playground</span>
                  </li>
                )}
                {amenities.electricity && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Electricity</span>
                  </li>
                )}
                {amenities.charcoalGrill && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Charcoal Grill</span>
                  </li>
                )}
                {amenities.sewerHookUp && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Sewer Hookup</span>
                  </li>
                )}
                {amenities.electricalHookUp && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Electrical Hookup</span>
                  </li>
                )}
                {amenities.generatorsAllowed && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Generators Allowed</span>
                  </li>
                )}
                {amenities.waterHookup && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Water Hookup</span>
                  </li>
                )}
                {amenities.rvParking && (
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">RV Parking</span>
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