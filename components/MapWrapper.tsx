'use client';

import { SageProperty } from '@/lib/types/sage';

type PropertyWithCoords = SageProperty & { coordinates: [number, number] };

interface MapWrapperProps {
  properties: PropertyWithCoords[];
  defaultCenter: [number, number];
  defaultZoom: number;
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
}

export default function MapWrapper({
  properties,
  defaultCenter,
  defaultZoom,
  MapContainer,
  TileLayer,
  Marker,
  Popup,
}: MapWrapperProps) {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '600px', width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {properties.map((property) => (
        <Marker key={property.id} position={property.coordinates}>
          <Popup>
            <div className="max-w-xs">
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                {property.property_name || property.site_name || 'Unnamed Property'}
              </h3>
              {property.city && property.state && (
                <p className="text-sm text-gray-600 mb-2">
                  {property.city}, {property.state}
                </p>
              )}
              {property.property_type && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Type:</span> {property.property_type}
                </p>
              )}
              {property.unit_type && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Unit Type:</span> {property.unit_type}
                </p>
              )}
              {property.avg_retail_daily_rate_2024 && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Avg Rate (2024):</span> $
                  {property.avg_retail_daily_rate_2024}
                </p>
              )}
              {(property.google_rating || property.google_user_rating_total) && (
                <div className="flex items-center gap-2 mb-2">
                  {property.google_rating && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                      <span className="text-sm font-semibold text-gray-900">
                        {property.google_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {property.google_user_rating_total && (
                    <span className="text-sm text-gray-600">
                      ({property.google_user_rating_total.toLocaleString()} {(property.google_user_rating_total === 1) ? 'review' : 'reviews'})
                    </span>
                  )}
                </div>
              )}
              {property.url && (
                <a
                  href={property.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Visit Website →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

